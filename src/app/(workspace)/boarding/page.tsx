import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignKennelAction, createReservationAction, setReservationStatusAction } from "../actions";

const RESERVATION_STATUSES = ["requested", "confirmed", "checked_in", "checked_out", "cancelled"] as const;

export default async function BoardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const businessId = session.user.businessId;
  const { error } = await searchParams;

  const [business, reservations, kennels, clients, pets] = await Promise.all([
    db.getBusiness(businessId),
    db.listReservations(businessId),
    db.listKennels(businessId),
    db.listClients(businessId),
    db.listPets(businessId),
  ]);

  const occupancy = reservations.filter((r) => r.status === "checked_in").length;
  const canCreate = clients.length > 0 && pets.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/70 bg-[#f4fbfa] p-4">
          <p className="font-heading text-2xl font-semibold text-zinc-900">
            {occupancy}/{business?.boardingCapacity ?? 0}
          </p>
          <p className="text-xs font-medium text-zinc-500">Current occupancy</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-[#fff1e8] p-4">
          <p className="font-heading text-2xl font-semibold text-zinc-900">
            {reservations.filter((r) => r.status === "requested").length}
          </p>
          <p className="text-xs font-medium text-zinc-500">Awaiting confirmation</p>
        </div>
      </div>

      <details className="rounded-2xl border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">+ New reservation</summary>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {!canCreate ? (
          <p className="mt-3 text-sm text-zinc-500">Add at least one client and pet first.</p>
        ) : (
          <form action={createReservationAction} className="mt-3 space-y-3">
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
            <select name="kind" defaultValue="boarding" className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-700">
              <option value="boarding">Boarding</option>
              <option value="daycare">Daycare</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input name="startDate" type="date" required />
              <Input name="endDate" type="date" required />
            </div>
            <Input name="feedingNotes" placeholder="Feeding notes (optional)" />
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Create reservation
            </Button>
          </form>
        )}
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Reservations ({reservations.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reservations.length === 0 ? (
            <p className="text-sm text-zinc-500">No boarding or daycare reservations yet.</p>
          ) : (
            reservations.map((r) => (
              <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
                <Link href={`/boarding/${r.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading text-base font-semibold text-zinc-900">
                        {r.pet?.name ?? "Pet"} · {r.client?.name ?? "Client"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()} · {r.kind}
                      </p>
                      <p className="text-xs text-zinc-500">Kennel: {r.kennel?.name ?? "Unassigned"}</p>
                    </div>
                    <Badge variant="secondary">{r.status.replace("_", " ")}</Badge>
                  </div>
                </Link>

                <form action={assignKennelAction} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="reservationId" value={r.id} />
                  <select
                    name="kennelId"
                    defaultValue={r.kennelId ?? ""}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700"
                  >
                    <option value="" disabled>
                      Assign kennel…
                    </option>
                    {kennels.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} (cap {k.capacity})
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline" className="rounded-lg">
                    Assign
                  </Button>
                </form>

                <form action={setReservationStatusAction} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select
                    name="status"
                    defaultValue={r.status}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700"
                  >
                    {RESERVATION_STATUSES.map((s) => (
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
