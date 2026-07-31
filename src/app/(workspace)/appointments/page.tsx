import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAppointmentAction, setAppointmentStatusAction } from "../actions";

const STATUS_OPTIONS = [
  "requested",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
  "no_show",
] as const;

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;
  const [appointments, clients, pets, services] = await Promise.all([
    db.listAppointments(session.user.businessId),
    db.listClients(session.user.businessId),
    db.listPets(session.user.businessId),
    db.listServices(session.user.businessId),
  ]);

  const canCreate = clients.length > 0 && pets.length > 0;

  return (
    <div className="space-y-4">
      <details className="rounded-2xl border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">+ New appointment</summary>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {!canCreate ? (
          <p className="mt-3 text-sm text-zinc-500">Add at least one client and pet first.</p>
        ) : (
          <form action={createAppointmentAction} className="mt-3 space-y-3">
            <select name="clientId" required defaultValue="" className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-700">
              <option value="" disabled>Client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="petId" required defaultValue="" className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-700">
              <option value="" disabled>Pet…</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.client?.name ?? "—"})</option>
              ))}
            </select>
            <select name="serviceId" defaultValue="" className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-700">
              <option value="">Service (optional)…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <Input name="date" type="date" required />
              <Input name="startTime" type="time" required />
              <Input name="endTime" type="time" required />
            </div>
            <Input name="priceDollars" type="number" step="0.01" min="0" placeholder="Price (USD)" />
            <Input name="notes" placeholder="Notes (optional)" />
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Book appointment
            </Button>
          </form>
        )}
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Appointments ({appointments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 ? (
            <p className="text-sm text-zinc-500">No appointments yet.</p>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
                <Link href={`/appointments/${a.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading text-base font-semibold text-zinc-900">
                        {a.pet?.name ?? "Pet"} · {a.client?.name ?? "Client"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {new Date(a.date).toLocaleDateString()} · {a.startTime}–{a.endTime}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {a.service?.name ?? "Service"} · {money(a.priceCents)}
                        {a.staff?.name ? ` · ${a.staff.name}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{a.status.replace("_", " ")}</Badge>
                  </div>
                </Link>
                <form action={setAppointmentStatusAction} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <select
                    name="status"
                    defaultValue={a.status}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline" className="rounded-lg">
                    Update
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
