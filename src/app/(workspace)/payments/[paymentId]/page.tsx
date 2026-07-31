import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markInvoicePaidAction } from "../../actions";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const session = await requireSession();
  const { paymentId } = await params;
  const invoice = await db.getInvoice(session.user.businessId, paymentId);
  if (!invoice) notFound();

  return (
    <div className="space-y-4">
      <Link href="/payments" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="size-4" /> All invoices
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{invoice.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <p className="font-heading text-3xl font-semibold text-zinc-900">{money(invoice.amountCents)}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{invoice.status}</Badge>
            <Badge variant="outline">{invoice.method}</Badge>
          </div>
          <p>Client: {invoice.client?.name ?? "—"}</p>
          <p>Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
          {invoice.status !== "paid" && invoice.status !== "void" ? (
            <form action={markInvoicePaidAction} className="pt-2">
              <input type="hidden" name="id" value={invoice.id} />
              <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
                Mark paid
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
