"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { usePawFlow } from "@/components/pawflow-provider";
import { CustomerCard, MessageThread, PetProfileCard } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const { workspace, updateCustomer } = usePawFlow();

  const customer = workspace.customers.find((item) => item.id === params.customerId);
  const pets = workspace.pets.filter((pet) => pet.customerId === customer?.id);
  const appointments = workspace.appointments.filter((appointment) => appointment.customerId === customer?.id);
  const messages = workspace.messages.filter((message) => message.customerId === customer?.id);
  const payments = workspace.payments.filter((payment) => payment.customerId === customer?.id);

  if (!customer) {
    return (
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-6">
          <p className="text-sm text-zinc-600">Customer record not found in the demo workspace.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Customer detail</p>
          <h2 className="font-heading text-3xl font-semibold text-zinc-900">{customer.name}</h2>
        </div>
        <Link href="/customers">
          <Button variant="outline" className="rounded-full">Back to customers</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] bg-white/90 p-4">
          <p className="text-sm text-zinc-500">Pets</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{pets.length}</p>
        </div>
        <div className="rounded-[24px] bg-white/90 p-4">
          <p className="text-sm text-zinc-500">Appointments</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{appointments.length}</p>
        </div>
        <div className="rounded-[24px] bg-white/90 p-4">
          <p className="text-sm text-zinc-500">Balance</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">${(customer.balanceCents / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Editable profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                updateCustomer(customer.id, {
                  name: String(formData.get("name") || ""),
                  phone: String(formData.get("phone") || ""),
                  email: String(formData.get("email") || ""),
                  preferredChannel: String(formData.get("preferredChannel") || "sms") as typeof customer.preferredChannel,
                  tags: String(formData.get("tags") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  notes: String(formData.get("notes") || "")
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  balanceCents: Math.round(Number(formData.get("balance") || 0) * 100),
                  lastVisitAt: String(formData.get("lastVisitAt") || ""),
                });
              }}
            >
              <Input name="name" defaultValue={customer.name} placeholder="Customer name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="phone" defaultValue={customer.phone} placeholder="Phone" />
                <Input name="email" defaultValue={customer.email} placeholder="Email" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  name="preferredChannel"
                  defaultValue={customer.preferredChannel}
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="sms">sms</option>
                  <option value="email">email</option>
                  <option value="portal">portal</option>
                  <option value="ai-call">ai-call</option>
                </select>
                <Input
                  name="balance"
                  type="number"
                  step="0.01"
                  defaultValue={(customer.balanceCents / 100).toFixed(2)}
                  placeholder="Balance"
                />
              </div>
              <Input name="lastVisitAt" defaultValue={customer.lastVisitAt || ""} placeholder="Last visit date" />
              <Input name="tags" defaultValue={customer.tags.join(", ")} placeholder="Tags, comma separated" />
              <Textarea name="notes" defaultValue={customer.notes.join("\n")} placeholder="Internal notes, one per line" />
              <Button className="rounded-full">Save customer details</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <CustomerCard customer={customer} petCount={pets.length} />
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Lead created and added to CRM</div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                {appointments.length ? `${appointments.length} booking milestone(s) tracked` : "No bookings yet"}
              </div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                {messages.length ? `${messages.length} message thread event(s)` : "No messaging events yet"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Related pets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pets.map((pet) => (
            <Link key={pet.id} href={`/pets/${pet.id}`} className="block">
              <PetProfileCard pet={pet} owner={customer} />
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Appointments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {appointments.map((appointment) => (
              <Link key={appointment.id} href={`/appointments/${appointment.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                {appointment.date} at {appointment.startTime} · {workspace.pets.find((pet) => pet.id === appointment.petId)?.name}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Payments</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {payments.map((payment) => (
              <Link key={payment.id} href={`/payments/${payment.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                {payment.label} · ${payment.amount} · {payment.status}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Message history</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {messages.map((message) => (
            <Link key={message.id} href={`/messages/${message.id}`} className="block">
              <MessageThread message={message} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
