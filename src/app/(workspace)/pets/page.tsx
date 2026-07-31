import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PetsPage() {
  const session = await requireSession();
  const pets = await db.listPets(session.user.businessId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pets ({pets.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pets.length === 0 ? (
            <p className="text-sm text-zinc-500">No pets yet.</p>
          ) : (
            pets.map((pet) => {
              const activeVaccines = pet.vaccineRecords.filter((v) => v.status === "current").length;
              const attentionVaccines = pet.vaccineRecords.filter((v) => v.status !== "current").length;
              return (
                <div key={pet.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading text-lg font-semibold text-zinc-900">{pet.name}</p>
                      <p className="text-sm text-zinc-500">
                        {pet.breed || "Unknown breed"} · Owner: {pet.client?.name ?? "—"}
                      </p>
                    </div>
                    {attentionVaccines > 0 ? (
                      <Badge variant="destructive">{attentionVaccines} vaccine alert{attentionVaccines > 1 ? "s" : ""}</Badge>
                    ) : (
                      <Badge variant="secondary">{activeVaccines} vaccine{activeVaccines === 1 ? "" : "s"}</Badge>
                    )}
                  </div>
                  {pet.allergies.length > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">Allergies: {pet.allergies.join(", ")}</p>
                  ) : null}
                  {pet.cutPreferences ? (
                    <p className="mt-1 text-xs text-zinc-500">Cut: {pet.cutPreferences}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
