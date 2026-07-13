"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { usePawFlow } from "@/components/pawflow-provider";
import { PetProfileCard, VaccineBadge } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PetDetailPage() {
  const params = useParams<{ petId: string }>();
  const { workspace, updatePet, addGroomingNote } = usePawFlow();

  const pet = workspace.pets.find((item) => item.id === params.petId);
  const owner = workspace.customers.find((customer) => customer.id === pet?.customerId);
  const appointments = workspace.appointments.filter((appointment) => appointment.petId === pet?.id);
  const stays = workspace.boardingStays.filter((stay) => stay.petId === pet?.id);

  if (!pet) {
    return (
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-6">
          <p className="text-sm text-zinc-600">Pet record not found in the demo workspace.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Pet detail</p>
          <h2 className="font-heading text-3xl font-semibold text-zinc-900">{pet.name}</h2>
        </div>
        <Link href="/pets">
          <Button variant="outline" className="rounded-full">Back to pets</Button>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <PetProfileCard pet={pet} owner={owner} />
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">{appointments.length} appointment milestone(s)</div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">{stays.length} boarding stay record(s)</div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                {pet.lastVisitAt ? `Last visit tracked on ${pet.lastVisitAt}` : "No last visit date saved yet"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Editable profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                updatePet(pet.id, {
                  name: String(formData.get("name") || ""),
                  breed: String(formData.get("breed") || ""),
                  age: String(formData.get("age") || ""),
                  weight: String(formData.get("weight") || ""),
                  cutPreferences: String(formData.get("cutPreferences") || ""),
                  sameAsLastTime: String(formData.get("sameAsLastTime") || ""),
                  boardingNotes: String(formData.get("boardingNotes") || ""),
                  allergies: String(formData.get("allergies") || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  lastVisitAt: String(formData.get("lastVisitAt") || ""),
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" defaultValue={pet.name} placeholder="Pet name" />
                <Input name="breed" defaultValue={pet.breed} placeholder="Breed" />
                <Input name="age" defaultValue={pet.age} placeholder="Age" />
                <Input name="weight" defaultValue={pet.weight} placeholder="Weight" />
              </div>
              <Input name="lastVisitAt" defaultValue={pet.lastVisitAt || ""} placeholder="Last visit date" />
              <Input name="cutPreferences" defaultValue={pet.cutPreferences} placeholder="Cut preferences" />
              <Input name="sameAsLastTime" defaultValue={pet.sameAsLastTime} placeholder="Same as last time notes" />
              <Input name="allergies" defaultValue={pet.allergies.join(", ")} placeholder="Allergies, comma separated" />
              <Textarea name="boardingNotes" defaultValue={pet.boardingNotes} placeholder="Boarding notes" />
              <Button className="rounded-full">Save pet profile</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Vaccine records</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {pet.vaccineRecords.map((record) => (
              <VaccineBadge key={record.id} record={record} />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Add grooming note</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                addGroomingNote(
                  {
                    petId: pet.id,
                    note: String(formData.get("note") || ""),
                    cutPreference: String(formData.get("cutPreference") || ""),
                    sameAsLastTime: Boolean(formData.get("sameAsLastTime")),
                    behaviorAlert: String(formData.get("behaviorAlert") || ""),
                    allergy: String(formData.get("allergy") || ""),
                  },
                  "Detail View Groomer",
                );
                event.currentTarget.reset();
              }}
            >
              <Textarea name="note" placeholder="Visit handling details" />
              <Input name="cutPreference" placeholder="Cut preference" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="behaviorAlert" placeholder="Behavior alert" />
                <Input name="allergy" placeholder="Allergy" />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="sameAsLastTime" className="rounded" />
                Reuse same style as last visit
              </label>
              <Button className="rounded-full">Save note</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Related records</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {owner ? (
            <Link href={`/customers/${owner.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
              Owner · {owner.name}
            </Link>
          ) : null}
          {appointments.map((appointment) => (
            <Link key={appointment.id} href={`/appointments/${appointment.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
              Appointment · {appointment.date} at {appointment.startTime}
            </Link>
          ))}
          {stays.map((stay) => (
            <Link key={stay.id} href={`/boarding/${stay.id}`} className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
              Boarding stay · {stay.startDate} to {stay.endDate}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
