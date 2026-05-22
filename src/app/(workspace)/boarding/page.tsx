"use client";

import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { BoardingStayCard, MiniMetric } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BoardingPage() {
  const { workspace, assignBoardingRoom, checkoutBoardingStay, updateBoardingStay, addMessage, addAiLog, runAiTask } = usePawFlow();
  const [selectedStayId, setSelectedStayId] = useState(workspace.boardingStays[0]?.id || "");
  const selectedStay = workspace.boardingStays.find((stay) => stay.id === selectedStayId) || workspace.boardingStays[0];
  const occupancy = workspace.boardingStays.filter((stay) => stay.status === "checked-in").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniMetric label="Current occupancy" value={`${occupancy}/${workspace.organization.boardingCapacity}`} colorClassName="bg-sky-50" />
        <MiniMetric label="Needs vaccine follow-up" value={String(workspace.boardingStays.filter((stay) => stay.vaccineStatus === "attention").length)} colorClassName="bg-amber-50" />
        <MiniMetric label="Photo updates queued" value={String(workspace.boardingStays.filter((stay) => stay.photoUpdates.length === 0).length)} colorClassName="bg-rose-50" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4">
          {workspace.boardingStays.map((stay) => (
            <button key={stay.id} className="text-left" onClick={() => setSelectedStayId(stay.id)}>
              <BoardingStayCard
                stay={stay}
                pet={workspace.pets.find((pet) => pet.id === stay.petId)}
                customer={workspace.customers.find((customer) => customer.id === stay.customerId)}
                onAssignRoom={(room) => assignBoardingRoom(stay.id, room)}
                onCheckOut={() => void checkoutBoardingStay(stay.id)}
              />
            </button>
          ))}
        </div>

        {selectedStay ? (
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Boarding manager</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  updateBoardingStay({
                    ...selectedStay,
                    room: String(formData.get("room")),
                    feedingNotes: String(formData.get("feedingNotes")),
                    medicationNotes: String(formData.get("medicationNotes")),
                    photoUpdates: [String(formData.get("photoUpdate")), ...selectedStay.photoUpdates].filter(Boolean),
                  });
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input name="room" defaultValue={selectedStay.room} placeholder="Kennel / room" />
                  <Input name="status" defaultValue={selectedStay.status} disabled />
                </div>
                <Textarea name="feedingNotes" defaultValue={selectedStay.feedingNotes} placeholder="Feeding notes" />
                <Textarea name="medicationNotes" defaultValue={selectedStay.medicationNotes} placeholder="Medication notes" />
                <Textarea name="photoUpdate" placeholder="Add photo update placeholder" />
                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-full">Save stay notes</Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={async () => {
                      const customer = workspace.customers.find((item) => item.id === selectedStay.customerId);
                      const pet = workspace.pets.find((item) => item.id === selectedStay.petId);
                      if (!customer || !pet) return;
                      const output = await runAiTask("generateReviewRequest", {
                        customerName: customer.name,
                        petName: pet.name,
                        visitType: "boarding stay",
                      });
                      addAiLog("generateReviewRequest", `${customer.name} / boarding`, output);
                      addMessage({
                        organizationId: workspace.organization.id,
                        customerId: customer.id,
                        petId: pet.id,
                        channel: "sms",
                        direction: "outbound",
                        subject: "Boarding review request",
                        body: output,
                        sender: "PawFlow Automations",
                      });
                    }}
                  >
                    Trigger review request
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
