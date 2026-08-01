import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";

import { requireSession } from "@/lib/session";
import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/signatures/status-badge";

export const dynamic = "force-dynamic";

export default async function SignaturesPage() {
  const session = await requireSession();
  const revsign = getRevSign(await getOrigin());
  const requests = await revsign.listRequests({ tenantId: session.user.businessId });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold text-zinc-900">Signatures</h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            Send intake, boarding-consent, and vaccine-authorization forms out for e-signature.
          </p>
        </div>
        <Link href="/signatures/new" className="shrink-0">
          <Button size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
            <Plus className="size-4" /> New
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-10 text-center">
              <FileSignature className="size-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">No signature requests yet.</p>
              <Link href="/signatures/new" className="text-sm font-medium text-[#3a938c]">
                Send your first document
              </Link>
            </div>
          ) : (
            requests.map((r) => {
              const signed = r.signers.filter((x) => x.status === "SIGNED").length;
              return (
                <Link
                  key={r.id}
                  href={`/signatures/${r.id}`}
                  className="block rounded-2xl border border-zinc-100 bg-white p-4 transition hover:border-zinc-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-heading text-base font-semibold text-zinc-900">{r.title}</p>
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {signed}/{r.signers.length} signed · {r.signers.map((x) => x.name).join(", ")}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
