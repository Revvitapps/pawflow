import Link from "next/link";
import { CalendarDays, PawPrint, Users, BedDouble } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { getBusinessById } from "@/server/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default async function DashboardPage() {
  const session = await requireSession();
  const businessId = session.user.businessId;

  const [business, clients, pets, appointments, reservations, invoices] = await Promise.all([
    getBusinessById(businessId),
    db.listClients(businessId),
    db.listPets(businessId),
    db.listAppointments(businessId),
    db.listReservations(businessId),
    db.listInvoices(businessId),
  ]);

  const now = new Date();
  const todaysAppointments = appointments.filter((a) => isSameDay(new Date(a.date), now));
  const occupancy = reservations.filter((r) => r.status === "checked_in").length;
  const outstandingCents = invoices
    .filter((i) => i.status === "unpaid" || i.status === "partial")
    .reduce((sum, i) => sum + i.amountCents, 0);

  const metrics = [
    { label: "Appointments today", value: String(todaysAppointments.length), icon: CalendarDays, tone: "bg-[#dff3f0]" },
    { label: "Clients", value: String(clients.length), icon: Users, tone: "bg-[#eef2ff]" },
    { label: "Pets", value: String(pets.length), icon: PawPrint, tone: "bg-[#fff1e8]" },
    { label: "Boarding in-house", value: `${occupancy}/${business?.boardingCapacity ?? 0}`, icon: BedDouble, tone: "bg-[#f4fbfa]" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-2xl border border-white/70 p-4 ${m.tone}`}>
            <m.icon className="size-5 text-zinc-600" />
            <p className="mt-3 font-heading text-2xl font-semibold text-zinc-900">{m.value}</p>
            <p className="text-xs font-medium text-zinc-500">{m.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Today&apos;s schedule</CardTitle>
          <Link href="/appointments" className="text-xs font-semibold uppercase tracking-widest text-[#2f8f86]">
            All appointments
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {todaysAppointments.length === 0 ? (
            <p className="text-sm text-zinc-500">No appointments scheduled for today.</p>
          ) : (
            todaysAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {a.pet?.name ?? "Pet"} · {a.client?.name ?? "Client"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {a.startTime}–{a.endTime} · {a.service?.name ?? "Service"}
                  </p>
                </div>
                <Badge variant="secondary">{a.status.replace("_", " ")}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-heading text-3xl font-semibold text-zinc-900">{money(outstandingCents)}</p>
          <p className="text-sm text-zinc-500">
            Across {invoices.filter((i) => i.status === "unpaid" || i.status === "partial").length} unpaid invoices
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
