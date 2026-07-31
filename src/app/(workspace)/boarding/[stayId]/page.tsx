import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { assignKennelAction, setReservationStatusAction } from "../../actions";

const RESERVATION_STATUSES = ["requested", "confirmed", "checked_in", "checked_out", "cancelled"] as const;

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ stayId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { stayId } = await params;
  const { error } = await searchParams;

  const [reservation, kennels] = await Promise.all([
    db.getReservation(session.user.businessId, stayId),
    db.listKennels(session.user.businessId),
  ]);
  if (!reservation) notFound();

  return (
    <div className="space-y-4">
      <Link href="/boarding" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="size-4" /> All reservations
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {reservation.pet?.name ?? "Pet"} · {reservation.client?.name ?? "Client"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <p>
            {new Date(reservation.startDate).toLocaleDateString()} → {new Date(reservation.endDate).toLocaleDateString()} · {reservation.kind}
          </p>
          <p>Kennel: {reservation.kennel?.name ?? "Unassigned"}</p>
          {reservation.feedingNotes ? <p>Feeding: {reservation.feedingNotes}</p> : null}
          {reservation.medicationNotes ? <p>Medication: {reservation.medicationNotes}</p> : null}
          <div className="pt-1">
            <Badge variant="secondary">{reservation.status.replace("_", " ")}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <form action={assignKennelAction} className="flex items-center gap-2">
            <input type="hidden" name="reservationId" value={reservation.id} />
            <select
              name="kennelId"
              defaultValue={reservation.kennelId ?? ""}
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

          <form action={setReservationStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={reservation.id} />
            <select
              name="status"
              defaultValue={reservation.status}
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
        </CardContent>
      </Card>
    </div>
  );
}
