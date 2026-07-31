import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Send } from "lucide-react";

import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { db } from "@/server/db";
import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/signatures/status-badge";
import { resendSignerAction, voidSignatureRequestAction } from "../actions";

export const dynamic = "force-dynamic";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default async function SignatureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const businessId = session.user.businessId;
  const { id } = await params;
  const { error } = await searchParams;

  const revsign = getRevSign(await getOrigin());
  // Tenant-scoped read: the engine's store filters by tenantId (businessId).
  const request = await revsign.getRequest({ tenantId: businessId }, id);
  if (!request) notFound();

  // Safe: getRequest already confirmed this request belongs to the tenant, so
  // its events belong to it too. The linked client is re-fetched tenant-scoped.
  const [events, linkedClient] = await Promise.all([
    prisma.signatureEvent.findMany({
      where: { requestId: id },
      orderBy: { createdAt: "asc" },
      include: { signer: { select: { name: true } } },
    }),
    request.linkedRef ? db.getClient(businessId, request.linkedRef) : Promise.resolve(null),
  ]);

  const canVoid = request.status !== "COMPLETED" && request.status !== "VOIDED";

  return (
    <div className="space-y-4">
      <Link href="/signatures" className="flex items-center gap-1 text-sm text-zinc-500">
        <ChevronLeft size={16} /> Signatures
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold text-zinc-900">{request.title}</h2>
          {linkedClient ? (
            <Link href={`/customers/${linkedClient.id}`} className="text-sm text-[#3a938c]">
              {linkedClient.name}
            </Link>
          ) : null}
        </div>
        <StatusBadge status={request.status} />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/signatures/${request.id}/document`}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300"
        >
          <Download size={15} /> Source PDF
        </a>
        {request.status === "COMPLETED" ? (
          <a
            href={`/api/signatures/${request.id}/document?type=signed`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#79c6bf] px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-[#68b7af]"
          >
            <Download size={15} /> Signed PDF
          </a>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {request.signers.map((signer) => {
            const canRemind =
              signer.status !== "SIGNED" &&
              !signer.signTokenRevoked &&
              request.status !== "COMPLETED" &&
              request.status !== "VOIDED" &&
              request.status !== "DECLINED";
            return (
              <div
                key={signer.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{signer.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {signer.email}
                    {signer.signedAt ? ` · signed ${fmt(signer.signedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={signer.status} signer />
                  {canRemind ? (
                    <form action={resendSignerAction.bind(null, request.id, signer.id)}>
                      <button
                        type="submit"
                        title="Resend link"
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-300"
                      >
                        <Send size={12} /> Resend
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {events.length === 0 ? (
            <p className="text-sm text-zinc-500">No events yet.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                <span className="text-zinc-700">
                  {e.type}
                  {e.signer ? ` · ${e.signer.name}` : ""}
                </span>
                <span>{fmt(e.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canVoid ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800">Void this request</summary>
          <form
            action={voidSignatureRequestAction.bind(null, request.id)}
            className="mt-3 space-y-2 rounded-2xl border border-zinc-100 p-3"
          >
            <input
              name="reason"
              placeholder="Reason (optional)"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              Void request &amp; revoke all links
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
