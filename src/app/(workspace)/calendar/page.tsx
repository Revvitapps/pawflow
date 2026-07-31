import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  href: string;
  date: Date;
  time: string;
  title: string;
  subtitle: string;
  status: string;
};

function dayKey(d: Date) {
  return d.toDateString();
}

export default async function CalendarPage() {
  const session = await requireSession();
  const businessId = session.user.businessId;

  const [appointments, reservations] = await Promise.all([
    db.listAppointments(businessId),
    db.listReservations(businessId),
  ]);

  const entries: Entry[] = [
    ...appointments.map((a) => ({
      id: `a-${a.id}`,
      href: `/appointments/${a.id}`,
      date: new Date(a.date),
      time: a.startTime,
      title: `${a.pet?.name ?? "Pet"} · ${a.service?.name ?? "Grooming"}`,
      subtitle: a.client?.name ?? "Client",
      status: a.status.replace("_", " "),
    })),
    ...reservations.map((r) => ({
      id: `r-${r.id}`,
      href: `/boarding/${r.id}`,
      date: new Date(r.startDate),
      time: "—",
      title: `${r.pet?.name ?? "Pet"} · ${r.kind}`,
      subtitle: r.client?.name ?? "Client",
      status: r.status.replace("_", " "),
    })),
  ].sort((x, y) => x.date.getTime() - y.date.getTime() || x.time.localeCompare(y.time));

  // Group by day.
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = dayKey(e.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return (
    <div className="space-y-4">
      {groups.size === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            No appointments or reservations scheduled yet.
          </CardContent>
        </Card>
      ) : (
        [...groups.entries()].map(([key, dayEntries]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{new Date(key).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayEntries.map((e) => (
                <Link
                  key={e.id}
                  href={e.href}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {e.time !== "—" ? `${e.time} · ` : ""}{e.title}
                    </p>
                    <p className="text-xs text-zinc-500">{e.subtitle}</p>
                  </div>
                  <Badge variant="secondary">{e.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
