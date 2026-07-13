"use client";

import Link from "next/link";
import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { PetProfileCard } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PetsPage() {
  const { workspace, addGroomingNote } = usePawFlow();
  const [selectedPetId, setSelectedPetId] = useState(workspace.pets[0]?.id || "");
  const selectedPet = workspace.pets.find((pet) => pet.id === selectedPetId) || workspace.pets[0];
  const owner = workspace.customers.find((customer) => customer.id === selectedPet?.customerId);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-4">
        {workspace.pets.map((pet) => (
          <div key={pet.id} className="space-y-2">
            <button className="block w-full text-left" onClick={() => setSelectedPetId(pet.id)}>
              <PetProfileCard pet={pet} owner={workspace.customers.find((customer) => customer.id === pet.customerId)} />
            </button>
            <Link href={`/pets/${pet.id}`}>
              <Button variant="outline" className="w-full rounded-full">Open pet detail</Button>
            </Link>
          </div>
        ))}
      </div>
      {selectedPet ? (
        <div className="space-y-4">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-heading text-2xl">Grooming Notes for {selectedPet.name}</CardTitle>
                <Link href={`/pets/${selectedPet.id}`}>
                  <Button variant="outline" className="rounded-full">Full detail</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  addGroomingNote(
                    {
                      petId: selectedPet.id,
                      note: String(formData.get("note") || ""),
                      cutPreference: String(formData.get("cutPreference") || ""),
                      sameAsLastTime: Boolean(formData.get("sameAsLastTime")),
                      behaviorAlert: String(formData.get("behaviorAlert") || ""),
                      allergy: String(formData.get("allergy") || ""),
                    },
                    "Demo Groomer",
                  );
                  event.currentTarget.reset();
                }}
              >
                <Textarea name="note" placeholder="How should this visit go? Coat goals, fluff level, handling notes..." required />
                <Input name="cutPreference" placeholder="Cut preference" defaultValue={selectedPet.cutPreferences} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input name="behaviorAlert" placeholder="Behavior alert" />
                  <Input name="allergy" placeholder="Allergy or sensitivity" />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" name="sameAsLastTime" className="rounded" />
                  Mark as Same Fluff as Last Time
                </label>
                <Button className="rounded-full">Save grooming note</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Notes on file</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedPet.groomingNotes.map((note) => (
                <div key={note.id} className="rounded-[24px] bg-zinc-50 p-4">
                  <p className="font-medium text-zinc-900">{note.cutPreference}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{note.note}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-400">{note.stylist} · {note.createdAt.slice(0, 10)}</p>
                </div>
              ))}
              <div className="rounded-[24px] bg-[#fff6ef] p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">Behavior alerts</p>
                <p className="mt-2">{selectedPet.behaviorAlerts.map((alert) => alert.label).join(", ") || "None saved."}</p>
              </div>
              <div className="rounded-[24px] bg-[#eef7f5] p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">Owner</p>
                <p className="mt-2">{owner?.name} · {owner?.phone}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
