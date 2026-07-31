import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePetAction } from "../../actions";

export default async function PetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ petId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { petId } = await params;
  const { error } = await searchParams;
  const pet = await db.getPet(session.user.businessId, petId);
  if (!pet) notFound();

  return (
    <div className="space-y-4">
      <Link href="/pets" className="inline-flex items-center gap-1 text-sm text-zinc-500">
        <ArrowLeft className="size-4" /> All pets
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {pet.name}
            {pet.client ? (
              <Link href={`/customers/${pet.client.id}`} className="ml-2 text-sm font-normal text-[#2f8f86]">
                {pet.client.name}
              </Link>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <form action={updatePetAction} className="space-y-3">
            <input type="hidden" name="id" value={pet.id} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Name</label>
              <Input name="name" defaultValue={pet.name} required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Breed</label>
                <Input name="breed" defaultValue={pet.breed} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Age</label>
                <Input name="age" defaultValue={pet.age} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Weight</label>
                <Input name="weight" defaultValue={pet.weight} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Allergies (comma separated)</label>
              <Input name="allergies" defaultValue={pet.allergies.join(", ")} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Cut preferences</label>
              <Input name="cutPreferences" defaultValue={pet.cutPreferences} />
            </div>
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vaccines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pet.vaccineRecords.length === 0 ? (
            <p className="text-sm text-zinc-500">No vaccine records.</p>
          ) : (
            pet.vaccineRecords.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2">
                <span className="text-sm text-zinc-700">{v.name}</span>
                <span className="flex items-center gap-2 text-xs text-zinc-500">
                  exp {new Date(v.expiresAt).toLocaleDateString()}
                  <Badge variant={v.status === "current" ? "secondary" : "destructive"}>{v.status.replace("_", " ")}</Badge>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pet.appointments.length === 0 ? (
            <p className="text-sm text-zinc-500">No appointments yet.</p>
          ) : (
            pet.appointments.slice(0, 8).map((a) => (
              <Link
                key={a.id}
                href={`/appointments/${a.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-3 py-2"
              >
                <span className="text-sm text-zinc-700">
                  {new Date(a.date).toLocaleDateString()} · {a.service?.name ?? "Service"}
                </span>
                <Badge variant="secondary">{a.status.replace("_", " ")}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
