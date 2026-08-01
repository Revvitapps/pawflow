import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireRole } from "@/lib/session";
import { db } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SignersEditor } from "@/components/signatures/signers-editor";
import { createSignatureRequestAction } from "../actions";

export const dynamic = "force-dynamic";

const select =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900";

export default async function NewSignaturePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireRole(["owner", "front_desk", "staff"]);
  const { error } = await searchParams;
  const clients = await db.listClients(session.user.businessId);

  return (
    <div className="space-y-4">
      <Link href="/signatures" className="flex items-center gap-1 text-sm text-zinc-500">
        <ChevronLeft size={16} /> Signatures
      </Link>

      <div>
        <h2 className="font-heading text-xl font-semibold text-zinc-900">New signature request</h2>
        <p className="mt-0.5 text-sm text-zinc-600">
          Upload the form (intake, boarding consent, vaccine authorization), add signers, and everyone
          gets a private signing link.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <form action={createSignatureRequestAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600">Document title</span>
              <Input name="title" required placeholder="Boarding consent — Bella (7/2–7/5)" />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600">Message to signers (optional)</span>
              <Textarea
                name="message"
                rows={2}
                placeholder="A short note shown in the email and on the signing page."
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600">Link to client (optional)</span>
              <select name="linkedRef" defaultValue="none" className={select}>
                <option value="none">Not linked to a client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.pets.length ? ` — ${c.pets.map((p) => p.name).join(", ")}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600">Document to sign (PDF)</span>
              <input
                type="file"
                name="file"
                accept="application/pdf"
                required
                className="text-sm text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
            </label>

            <div className="rounded-2xl border border-zinc-100 p-3">
              <SignersEditor />
            </div>

            <Button type="submit" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Send for signature
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
