import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBusinessAction } from "../../actions";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireSession();
  const { error, saved } = await searchParams;
  const [business, services] = await Promise.all([
    db.getBusiness(session.user.businessId),
    db.listServices(session.user.businessId),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
        </CardHeader>
        <CardContent>
          {saved ? (
            <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
          ) : null}
          {error ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <form action={updateBusinessAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Business name</label>
              <Input name="name" defaultValue={business?.name ?? ""} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Timezone</label>
                <Input name="timezone" defaultValue={business?.timezone ?? ""} placeholder="America/New_York" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Boarding capacity</label>
                <Input name="boardingCapacity" type="number" min="0" defaultValue={business?.boardingCapacity ?? 0} />
              </div>
            </div>
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services ({services.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.length === 0 ? (
            <p className="text-sm text-zinc-500">No services yet.</p>
          ) : (
            services.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2">
                <span className="text-sm text-zinc-700">{s.name}</span>
                <span className="text-xs text-zinc-500">
                  {s.durationMinutes ? `${s.durationMinutes}m · ` : ""}${(s.priceCents / 100).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
