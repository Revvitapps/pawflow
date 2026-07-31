import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setAppointmentStatusAction } from "../actions";

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

export default async function AppointmentsPage() {
  const session = await requireSession();
  const appointments = await db.listAppointments(session.user.businessId);

  return (
    <div className="space-y-4">
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
