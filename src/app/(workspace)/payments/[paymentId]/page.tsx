"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { usePawFlow } from "@/components/pawflow-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const paymentSteps = ["unpaid", "partial", "paid", "refunded"];

export default function PaymentDetailPage() {
  const params = useParams<{ paymentId: string }>();
  const { workspace, updatePayment, updatePaymentStatus, addMessage } = usePawFlow();

  const payment = workspace.payments.find((item) => item.id === params.paymentId);
  const customer = workspace.customers.find((item) => item.id === payment?.customerId);

  if (!payment) {
    return (
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-6">
          <p className="text-sm text-zinc-600">Payment record not found in the demo workspace.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Payment detail</p>
          <h2 className="font-heading text-3xl font-semibold text-zinc-900">{payment.label}</h2>
        </div>
        <Link href="/payments">
          <Button variant="outline" className="rounded-full">Back to payments</Button>
        </Link>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Payment milestones</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {paymentSteps.map((step) => (
            <button
              key={step}
              type="button"
              className={`rounded-[24px] px-4 py-4 text-left text-sm ${step === payment.status ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-700"}`}
              onClick={() => updatePaymentStatus(payment.id, step as typeof payment.status)}
            >
              {step}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Editable payment details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                updatePayment(payment.id, {
                  label: String(formData.get("label") || ""),
                  amount: Number(formData.get("amount") || 0),
                  depositAmount: Number(formData.get("depositAmount") || 0),
                  dueDate: String(formData.get("dueDate") || ""),
                  method: String(formData.get("method") || payment.method) as typeof payment.method,
                  status: String(formData.get("status") || payment.status) as typeof payment.status,
                });
              }}
            >
              <Input name="label" defaultValue={payment.label} placeholder="Payment label" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="amount" type="number" defaultValue={payment.amount} />
                <Input name="depositAmount" type="number" defaultValue={payment.depositAmount} />
                <Input name="dueDate" type="date" defaultValue={payment.dueDate} />
                <select name="method" defaultValue={payment.method} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  <option value="card">card</option>
                  <option value="cash">cash</option>
                  <option value="square">square</option>
                  <option value="stripe">stripe</option>
                </select>
                <select name="status" defaultValue={payment.status} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  {paymentSteps.map((step) => (
                    <option key={step} value={step}>{step}</option>
                  ))}
                </select>
              </div>
              <Button className="rounded-full">Save payment</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Related records</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {customer ? <Link href={`/customers/${customer.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Customer · {customer.name}</Link> : null}
              {payment.appointmentId ? <Link href={`/appointments/${payment.appointmentId}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Linked appointment</Link> : null}
              {payment.boardingStayId ? <Link href={`/boarding/${payment.boardingStayId}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Linked boarding stay</Link> : null}
            </CardContent>
          </Card>

          <Button
            className="rounded-full"
            onClick={() => {
              if (!customer) return;
              addMessage({
                organizationId: workspace.organization.id,
                customerId: customer.id,
                channel: "sms",
                direction: "outbound",
                subject: "Payment reminder",
                body: `Reminder: ${payment.label} for $${payment.amount} is currently marked ${payment.status}.`,
                sender: "PawFlow Payments",
              });
            }}
          >
            Send payment reminder
          </Button>
        </div>
      </div>
    </div>
  );
}
