"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  beginMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  regenerateBackupCodesAction,
  disableMfaAction,
  type ConfirmState,
  type DisableState,
} from "@/app/(workspace)/settings/security/actions";

type EnrollData = { qrDataUrl: string; secret: string };

/** Shows the one-time backup codes with a copy button and a strong warning. */
function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div>
        <p className="text-sm font-medium text-zinc-900">Save your backup codes</p>
        <p className="text-xs text-zinc-500">
          Each code works once. Store them somewhere safe — this is the only time they&apos;re shown.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="rounded-lg bg-white px-2 py-1 text-center tracking-widest text-zinc-800">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(codes.join("\n"));
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy codes"}
        </Button>
        <Button type="button" size="sm" onClick={onDone}>
          I&apos;ve saved them
        </Button>
      </div>
    </div>
  );
}

/** Enrollment flow: Enable → scan QR → confirm code → save backup codes. */
function EnrollFlow({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<EnrollData | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();
  const [confirmState, confirmAction, confirming] = useActionState<ConfirmState, FormData>(
    confirmMfaEnrollmentAction,
    undefined,
  );

  const backupCodes = confirmState?.backupCodes;

  function begin() {
    setStartError(null);
    startTransition(async () => {
      const res = await beginMfaEnrollmentAction();
      if (res.ok) setData({ qrDataUrl: res.qrDataUrl, secret: res.secret });
      else setStartError(res.error);
    });
  }

  if (backupCodes) {
    return (
      <BackupCodes
        codes={backupCodes}
        onDone={() => {
          if (forced) router.replace("/dashboard");
          else router.refresh();
        }}
      />
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={begin}
          disabled={starting}
          className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]"
        >
          {starting ? "Preparing…" : "Enable two-factor authentication"}
        </Button>
        {startError ? <p className="text-sm text-rose-600">{startError}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-500">
        <li>Open your authenticator app (Google Authenticator, 1Password, Authy…).</li>
        <li>Scan this QR code, or enter the key manually.</li>
        <li>Enter the 6-digit code it shows to finish.</li>
      </ol>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 p-4">
        <Image
          src={data.qrDataUrl}
          alt="Authenticator QR code"
          width={220}
          height={220}
          unoptimized
          className="rounded bg-white p-2"
        />
        <div className="text-center">
          <p className="text-xs text-zinc-500">Manual entry key</p>
          <code className="break-all font-mono text-xs text-zinc-800">{data.secret}</code>
        </div>
      </div>

      <form action={confirmAction} className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700">Verification code</label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
        {confirmState?.error ? <p className="text-sm text-rose-600">{confirmState.error}</p> : null}
        <Button
          type="submit"
          disabled={confirming}
          className="mt-1 rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]"
        >
          {confirming ? "Verifying…" : "Verify and turn on"}
        </Button>
      </form>
    </div>
  );
}

/** Management for an already-enrolled user: regenerate codes / disable. */
function ManageEnrolled({ remaining }: { remaining: number }) {
  const router = useRouter();
  const [regenState, regenAction, regenerating] = useActionState<ConfirmState, FormData>(
    regenerateBackupCodesAction,
    undefined,
  );
  const [disableState, disableAction, disabling] = useActionState<DisableState, FormData>(
    disableMfaAction,
    undefined,
  );

  useEffect(() => {
    if (disableState?.success) router.refresh();
  }, [disableState, router]);

  if (regenState?.backupCodes) {
    return <BackupCodes codes={regenState.backupCodes} onDone={() => router.refresh()} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <span className="font-medium">Two-factor authentication is on.</span>
        <span className="text-emerald-600/80">{remaining} backup codes left</span>
      </div>

      <form action={regenAction} className="flex flex-col gap-2 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-900">Regenerate backup codes</p>
        <p className="text-xs text-zinc-500">
          Replaces all existing codes. Enter a current authenticator code to confirm.
        </p>
        <div className="flex gap-2">
          <Input name="code" inputMode="numeric" placeholder="Current code" required />
          <Button type="submit" variant="outline" disabled={regenerating}>
            {regenerating ? "Working…" : "Regenerate"}
          </Button>
        </div>
        {regenState?.error ? <p className="text-sm text-rose-600">{regenState.error}</p> : null}
      </form>

      <form action={disableAction} className="flex flex-col gap-2 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-900">Turn off two-factor</p>
        <p className="text-xs text-zinc-500">
          Enter a current code to confirm. Owners will be asked to re-enroll.
        </p>
        <div className="flex gap-2">
          <Input name="code" inputMode="numeric" placeholder="Current code" required />
          <Button type="submit" variant="destructive" disabled={disabling}>
            {disabling ? "Working…" : "Turn off"}
          </Button>
        </div>
        {disableState?.error ? <p className="text-sm text-rose-600">{disableState.error}</p> : null}
      </form>
    </div>
  );
}

export function MfaManager({
  enabled,
  remaining,
  forced = false,
}: {
  enabled: boolean;
  remaining: number;
  forced?: boolean;
}) {
  return enabled ? <ManageEnrolled remaining={remaining} /> : <EnrollFlow forced={forced} />;
}
