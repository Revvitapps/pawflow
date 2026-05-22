"use client";

import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const LAPSED_VISIT_CUTOFF = new Date(Date.now() - 1000 * 60 * 60 * 24 * 42);

export default function ReviewsPage() {
  const { workspace, addAiLog, addMessage, runAiTask } = usePawFlow();
  const [reviewReply, setReviewReply] = useState("");
  const lapsedPets = workspace.pets.filter(
    (pet) => pet.lastVisitAt && new Date(pet.lastVisitAt) < LAPSED_VISIT_CUTOFF,
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Completed visit review requests</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {workspace.appointments
            .filter((appointment) => appointment.status === "completed")
            .map((appointment) => {
              const customer = workspace.customers.find((item) => item.id === appointment.customerId);
              const pet = workspace.pets.find((item) => item.id === appointment.petId);
              return (
                <div key={appointment.id} className="flex flex-col gap-3 rounded-[24px] bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-zinc-900">{pet?.name} · {customer?.name}</p>
                    <p className="text-sm text-zinc-500">Completed visit ready for review outreach</p>
                  </div>
                  <Button
                    className="rounded-full"
                    onClick={async () => {
                      if (!customer || !pet) return;
                      const output = await runAiTask("generateReviewRequest", {
                        customerName: customer.name,
                        petName: pet.name,
                        visitType: "grooming appointment",
                      });
                      addAiLog("generateReviewRequest", `${customer.name} review request`, output);
                      addMessage({
                        organizationId: workspace.organization.id,
                        customerId: customer.id,
                        petId: pet.id,
                        channel: "sms",
                        direction: "outbound",
                        subject: "Review request",
                        body: output,
                        sender: "PawFlow Automations",
                      });
                    }}
                  >
                    Send review ask
                  </Button>
                </div>
              );
            })}
          {!workspace.appointments.some((appointment) => appointment.status === "completed") ? (
            <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-600">Move an appointment to completed to trigger this flow.</div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">AI-generated review reply drafts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              defaultValue="Bella always comes home so soft and happy. The team sends great updates and remembers exactly how we like her trim."
              id="review-input"
            />
            <Button
              className="rounded-full"
              onClick={async () => {
                const review = (document.getElementById("review-input") as HTMLTextAreaElement)?.value || "";
                const output = await runAiTask("generateReviewReply", {
                  customerName: "Happy customer",
                  review,
                });
                addAiLog("generateReviewReply", review, output);
                setReviewReply(output);
              }}
            >
              Generate review reply
            </Button>
            <div className="rounded-[24px] bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">{reviewReply || "Draft will appear here."}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Come Back Soon campaigns</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {lapsedPets.map((pet) => {
              const customer = workspace.customers.find((item) => item.id === pet.customerId);
              return (
                <div key={pet.id} className="rounded-[24px] bg-zinc-50 p-4">
                  <p className="font-medium text-zinc-900">We miss {pet.name}</p>
                  <p className="text-sm text-zinc-500">{customer?.name} · last visit {pet.lastVisitAt}</p>
                  <Button
                    className="mt-3 rounded-full"
                    onClick={async () => {
                      if (!customer) return;
                      const output = await runAiTask("generateReactivationMessage", {
                        customerName: customer.name,
                        petName: pet.name,
                        lastVisitAt: pet.lastVisitAt,
                      });
                      addAiLog("generateReactivationMessage", `${pet.name} reactivation`, output);
                      addMessage({
                        organizationId: workspace.organization.id,
                        customerId: customer.id,
                        petId: pet.id,
                        channel: "sms",
                        direction: "outbound",
                        subject: "Come Back Soon",
                        body: output,
                        sender: "PawFlow Automations",
                      });
                    }}
                  >
                    Generate + mock-send
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
