import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markInvoicePaidAction } from "../actions";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PaymentsPage() {
  const session = await requireSession();
  const invoices = await db.listInvoices(session.user.businessId);

  const outstanding = invoices
    .filter((i) => i.status === "unpaid" || i.status === "partial")
    .reduce((sum, i) => sum + i.amountCents, 0);
  const collected = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amountCents, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/70 bg-[#fff1e8] p-4">
          <p className="font-heading text-2xl font-semibold text-zinc-900">{money(outstanding)}</p>
          <p className="text-xs font-medium text-zinc-500">Outstanding</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-[#f4fbfa] p-4">
          <p className="font-heading text-2xl font-semibold text-zinc-900">{money(collected)}</p>
          <p className="text-xs font-medium text-zinc-500">Collected</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-zinc-100 bg-white px-3 py-2">
                <Link href={`/payments/${inv.id}`} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{inv.label}</p>
                    <p className="text-xs text-zinc-500">{inv.client?.name ?? "—"} · due {new Date(inv.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span className="flex items-center gap-2 text-sm text-zinc-800">
                    {money(inv.amountCents)}
                    <Badge variant="secondary">{inv.status}</Badge>
                  </span>
                </Link>
                {inv.status !== "paid" && inv.status !== "void" ? (
                  <form action={markInvoicePaidAction} className="mt-2">
                    <input type="hidden" name="id" value={inv.id} />
                    <Button type="submit" size="sm" variant="outline" className="rounded-lg">
                      Mark paid
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
