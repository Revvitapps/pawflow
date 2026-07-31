import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPetAction } from "../actions";

export default async function PetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;
  const [pets, clients] = await Promise.all([
    db.listPets(session.user.businessId),
    db.listClients(session.user.businessId),
  ]);

  return (
    <div className="space-y-4">
      <details className="rounded-2xl border border-zinc-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-800">+ New pet</summary>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {clients.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Add a client first — pets belong to an owner.</p>
        ) : (
          <form action={createPetAction} className="mt-3 space-y-3">
            <select
              name="clientId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-700"
            >
              <option value="" disabled>
                Owner…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input name="name" placeholder="Pet name" required />
            <div className="grid grid-cols-3 gap-3">
              <Input name="breed" placeholder="Breed" />
              <Input name="age" placeholder="Age" />
              <Input name="weight" placeholder="Weight" />
            </div>
            <Input name="allergies" placeholder="Allergies (comma separated)" />
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Add pet
            </Button>
          </form>
        )}
      </details>

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
                <Link
                  key={pet.id}
                  href={`/pets/${pet.id}`}
                  className="block rounded-2xl border border-zinc-100 bg-white p-4 transition hover:border-zinc-200"
                >
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
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
