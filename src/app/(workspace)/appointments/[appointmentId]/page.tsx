import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setAppointmentStatusAction } from "../../actions";

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

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const session = await requireSession();
  const { appointmentId } = await params;
  const appt = await db.getAppointment(session.user.businessId, appointmentId);
  if (!appt) notFound();

  return (
    <div className="space-y-4">
      <Link href="/appointments" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="size-4" /> All appointments
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {appt.pet?.name ?? "Pet"} · {appt.client?.name ?? "Client"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <p>Date: {new Date(appt.date).toLocaleDateString()} · {appt.startTime}–{appt.endTime}</p>
          <p>Service: {appt.service?.name ?? "—"} · {money(appt.priceCents)}</p>
          <p>Staff: {appt.staff?.name ?? "Unassigned"}</p>
          {appt.notes ? <p>Notes: {appt.notes}</p> : null}
          <div className="pt-1">
            <Badge variant="secondary">{appt.status.replace("_", " ")}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setAppointmentStatusAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={appt.id} />
            <select
              name="status"
              defaultValue={appt.status}
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
        </CardContent>
      </Card>
    </div>
  );
}
