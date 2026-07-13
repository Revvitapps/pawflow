"use client";

import Link from "next/link";

import { usePawFlow } from "@/components/pawflow-provider";
import { Button } from "@/components/ui/button";
import { MiniMetric } from "@/components/pawflow-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentsPage() {
  const { workspace, updatePaymentStatus, addMessage } = usePawFlow();
  const unpaid = workspace.payments.filter((payment) => payment.status === "unpaid").reduce((sum, payment) => sum + payment.amount, 0);
  const deposits = workspace.payments.reduce((sum, payment) => sum + payment.depositAmount, 0);
  const noShowFees = workspace.appointments.filter((appointment) => appointment.status === "no-show").length * 25;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MiniMetric label="Unpaid balances" value={`$${unpaid.toFixed(0)}`} colorClassName="bg-amber-50" />
        <MiniMetric label="Deposits tracked" value={`$${deposits.toFixed(0)}`} colorClassName="bg-sky-50" />
        <MiniMetric label="No-show fee tracking" value={`$${noShowFees.toFixed(0)}`} colorClassName="bg-rose-50" />
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Invoices, deposits, and mocked payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.payments.map((payment) => {
            const customer = workspace.customers.find((item) => item.id === payment.customerId);
            return (
              <div key={payment.id} className="grid gap-3 rounded-[24px] bg-zinc-50 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <div>
                  <p className="font-medium text-zinc-900">{payment.label}</p>
                  <p className="text-sm text-zinc-500">{customer?.name} · due {payment.dueDate}</p>
                </div>
                <p className="text-sm text-zinc-700">Total ${payment.amount}</p>
                <p className="text-sm text-zinc-700">Deposit ${payment.depositAmount}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full bg-white px-3 py-2 text-sm font-medium text-zinc-700">{payment.status}</div>
                  {payment.status !== "paid" ? (
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => updatePaymentStatus(payment.id, "paid")}
                    >
                      Mark paid
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      if (!customer) return;
                      addMessage({
                        organizationId: workspace.organization.id,
                        customerId: customer.id,
                        channel: "sms",
                        direction: "outbound",
                        subject: "Payment reminder",
                        body: `Friendly reminder: ${payment.label} for $${payment.amount} is ${payment.status}.`,
                        sender: "PawFlow Payments",
                      });
                    }}
                  >
                    Send reminder
                  </Button>
                  <Link href={`/payments/${payment.id}`}>
                    <Button size="sm" variant="outline" className="rounded-full">Detail</Button>
                  </Link>
                </div>
              </div>
            );
          })}
          <div className="rounded-[28px] border border-dashed border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
            Stripe / Square production integrations are intentionally mocked in this MVP, but the UI is structured for future payment provider wiring.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
