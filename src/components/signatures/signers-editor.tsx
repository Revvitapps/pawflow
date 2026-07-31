"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";

type Signer = { name: string; email: string };

/**
 * Repeated signerName/signerEmail inputs the server action collects. Each signer
 * gets their own private signing link; the request completes once all have
 * signed. For a boarding-consent or vaccine-authorization form this is usually
 * the single pet parent, but multi-signer (e.g. two owners) is supported.
 */
export function SignersEditor() {
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "" }]);

  function update(index: number, field: keyof Signer, value: string) {
    setSigners((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-zinc-700">Signers</p>
        <p className="text-xs text-zinc-500">
          Each person gets their own private signing link. Completes once everyone signs.
        </p>
      </div>
      {signers.map((signer, index) => (
        <div key={index} className="flex items-start gap-2 rounded-2xl border border-zinc-100 bg-white p-3">
          <div className="flex-1 space-y-2">
            <Input
              name="signerName"
              placeholder="Full name"
              value={signer.name}
              onChange={(e) => update(index, "name", e.target.value)}
              required
            />
            <Input
              name="signerEmail"
              type="email"
              placeholder="Email address"
              value={signer.email}
              onChange={(e) => update(index, "email", e.target.value)}
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setSigners((prev) => prev.filter((_, i) => i !== index))}
            disabled={signers.length === 1}
            aria-label="Remove signer"
            className="mt-1 text-zinc-400 disabled:opacity-30"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSigners((prev) => [...prev, { name: "", email: "" }])}
        className="flex items-center gap-2 self-start rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-300"
      >
        <Plus size={14} /> Add signer
      </button>
    </div>
  );
}
