"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { LogoBadge } from "@/components/logo-badge";
import { usePawFlow } from "@/components/pawflow-provider";
import { PortalBookingForm } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PortalPage() {
  const params = useParams<{ businessSlug: string }>();
  const { workspace, createIntakeRequest, createBoardingRequest, addAiLog, addMessage, runAiTask } = usePawFlow();
  const [loading, setLoading] = useState<"grooming" | "boarding" | null>(null);
  const brand = workspace.organization.brand;

  return (
    <main
      className="min-h-screen px-4 py-8"
      style={{ background: `linear-gradient(180deg, ${brand.secondaryColor} 0%, white 50%, #fffaf7 100%)` }}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[36px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(61,58,57,0.08)]">
          <div className="flex flex-wrap items-center gap-3">
            {brand.logoUrl ? (
              <LogoBadge
                src={brand.logoUrl}
                alt={`${brand.businessName} logo`}
                size={68}
                rounded="rounded-[22px]"
                className="shadow-md"
              />
            ) : null}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">{params.businessSlug}</p>
              <h1 className="mt-2 font-heading text-5xl font-semibold text-zinc-900">{brand.businessName}</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-zinc-600">{brand.portalHeadline}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
            {workspace.organization.contactPhone ? (
              <div className="rounded-full bg-white px-4 py-2 shadow-sm">{workspace.organization.contactPhone}</div>
            ) : null}
            {workspace.organization.contactEmail ? (
              <div className="rounded-full bg-white px-4 py-2 shadow-sm">{workspace.organization.contactEmail}</div>
            ) : null}
            {workspace.organization.websiteUrl ? (
              <div className="rounded-full bg-white px-4 py-2 shadow-sm">{workspace.organization.websiteUrl}</div>
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Book an appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <PortalBookingForm
                type="grooming"
                loading={loading === "grooming"}
                onSubmit={async (payload) => {
                  setLoading("grooming");
                  const summary = await runAiTask("summarizeIntakeRequest", payload);
                  addAiLog("summarizeIntakeRequest", payload.petName, summary);
                  createIntakeRequest(payload, summary);
                  setLoading(null);
                }}
              />
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Request a boarding stay</CardTitle>
            </CardHeader>
            <CardContent>
              <PortalBookingForm
                type="boarding"
                loading={loading === "boarding"}
                onSubmit={async (payload) => {
                  setLoading("boarding");
                  const summary = await runAiTask("summarizeIntakeRequest", payload);
                  addAiLog("summarizeIntakeRequest", payload.petName, summary);
                  createBoardingRequest(payload, summary);
                  setLoading(null);
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Your pets and upcoming visits</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {workspace.pets.slice(0, 4).map((pet) => (
                <div key={pet.id} className="rounded-[24px] bg-zinc-50 p-4">
                  <p className="font-medium text-zinc-900">{pet.name} · {pet.breed}</p>
                  <p className="text-sm text-zinc-500">{pet.sameAsLastTime || pet.cutPreferences}</p>
                </div>
              ))}
              {workspace.appointments.slice(0, 3).map((appointment) => {
                const pet = workspace.pets.find((item) => item.id === appointment.petId);
                return (
                  <div key={appointment.id} className="rounded-[24px] bg-[#eef7f5] p-4 text-sm text-zinc-700">
                    Upcoming: {pet?.name} on {appointment.date} at {appointment.startTime}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Visit details and contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.organization.address ? (
                <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">Address</p>
                  <p className="mt-1">{workspace.organization.address}</p>
                </div>
              ) : null}
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">Hours</p>
                <div className="mt-2 space-y-1">
                  {workspace.organization.hours.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <Input placeholder="Upload vaccine record placeholder" />
              <Textarea placeholder="Message the business" id="portal-message" />
              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-full"
                  onClick={() =>
                    addMessage({
                      organizationId: workspace.organization.id,
                      channel: "portal",
                      direction: "inbound",
                      subject: "Portal message",
                      body: (document.getElementById("portal-message") as HTMLTextAreaElement)?.value || "Portal message submitted.",
                      sender: "Pet Parent",
                    })
                  }
                >
                  Send portal message
                </Button>
                <Button variant="outline" className="rounded-full">Pay deposit placeholder</Button>
              </div>
              <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-600">
                Status updates arrive here for check-in, in-progress care, ready-for-pickup, and boarding photo notes.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
