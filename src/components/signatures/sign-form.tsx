"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Eraser } from "lucide-react";

const CANVAS_W = 500;
const CANVAS_H = 180;

/**
 * Self-contained signing widget: Type or Draw a signature, agree to the ESIGN
 * consent, and submit. Renders the chosen signature to a PNG data URL and posts
 * it to the bound server action along with the signature type and consent flag.
 * The engine re-validates the PNG (magic bytes + size) before it is stored.
 */
export function SignForm({
  action,
  signerName,
  issuerName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  signerName: string;
  issuerName: string;
}) {
  const [mode, setMode] = useState<"typed" | "drawn">("typed");
  const [typedValue, setTypedValue] = useState(signerName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [consent, setConsent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const typedCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = typedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const text = typedValue.trim();
    if (!text) return;
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontSize = 72;
    ctx.font = `italic ${fontSize}px "Segoe Script","Brush Script MT",cursive`;
    while (ctx.measureText(text).width > CANVAS_W - 40 && fontSize > 20) {
      fontSize -= 4;
      ctx.font = `italic ${fontSize}px "Segoe Script","Brush Script MT",cursive`;
    }
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
  }, [typedValue]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    drawCanvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  }

  function endDraw() {
    drawing.current = false;
  }

  function clearDrawing() {
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    setHasDrawn(false);
  }

  const hasSignature = mode === "typed" ? typedValue.trim().length > 0 : hasDrawn;
  const canSubmit = hasSignature && consent && !pending;

  function submit() {
    setError(null);
    const canvas = mode === "typed" ? typedCanvasRef.current : drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const formData = new FormData();
    formData.set("signature", dataUrl);
    formData.set("signatureType", mode);
    formData.set("consent", consent ? "on" : "");
    startTransition(() => action(formData));
  }

  const tabBtn = (active: boolean) =>
    `flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
    }`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) {
          setError("Add your signature and agree to sign electronically first.");
          return;
        }
        submit();
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex gap-1 rounded-full bg-zinc-100 p-1">
        <button type="button" className={tabBtn(mode === "typed")} onClick={() => setMode("typed")}>
          Type
        </button>
        <button type="button" className={tabBtn(mode === "drawn")} onClick={() => setMode("drawn")}>
          Draw
        </button>
      </div>

      <div className={mode === "typed" ? "flex flex-col gap-2" : "hidden"}>
        <label className="text-xs font-medium text-zinc-600">Type your full name</label>
        <input
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400"
        />
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <canvas ref={typedCanvasRef} width={CANVAS_W} height={CANVAS_H} className="h-auto w-full" />
        </div>
      </div>

      <div className={mode === "drawn" ? "flex flex-col gap-2" : "hidden"}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-600">Draw your signature</label>
          <button
            type="button"
            onClick={clearDrawing}
            className="flex items-center gap-1 text-xs font-medium text-zinc-500"
          >
            <Eraser size={14} /> Clear
          </button>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <canvas
            ref={drawCanvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="h-auto w-full touch-none"
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span className="text-zinc-600">
          I agree to sign this document electronically and that my electronic signature is the legal
          equivalent of my handwritten signature on this document with {issuerName}.
        </span>
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-full bg-[#79c6bf] px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-[#68b7af] disabled:opacity-40"
      >
        {pending ? "Submitting…" : "Adopt & sign"}
      </button>
    </form>
  );
}
