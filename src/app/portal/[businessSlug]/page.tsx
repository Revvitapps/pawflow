"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";

import { LogoBadge } from "@/components/logo-badge";
import { usePawFlow } from "@/components/pawflow-provider";
import { PortalBookingForm } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function PortalPage() {
  const params = useParams<{ businessSlug: string }>();
  const { workspace, createIntakeRequest, createBoardingRequest, addAiLog, addMessage, addPayment, runAiTask } = usePawFlow();
  const [loading, setLoading] = useState<"grooming" | "boarding" | null>(null);
  const [portalMessage, setPortalMessage] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const brand = workspace.organization.brand;
  const latestAppointment = workspace.appointments[0];
  const latestPet = workspace.pets[0];
  const latestCustomer = workspace.customers[0];

  return (
    <main
      className="min-h-screen px-0 py-0 md:px-6 md:py-8"
      style={{ background: `linear-gradient(180deg, ${brand.secondaryColor} 0%, white 50%, #fffaf7 100%)` }}
    >
      <div className="mx-auto w-full max-w-[460px] space-y-6 overflow-hidden border border-white/80 bg-[rgba(255,255,255,0.82)] px-4 py-8 shadow-[0_28px_120px_rgba(61,58,57,0.14)] backdrop-blur-xl md:rounded-[40px]">
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
              <h1 className="mt-2 font-heading text-4xl font-semibold text-zinc-900 sm:text-5xl">{brand.businessName}</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-zinc-600">{brand.portalHeadline}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-600">
            {workspace.organization.contactPhone ? (
              <a
                href={`tel:${workspace.organization.contactPhone}`}
                className="max-w-full break-all rounded-full bg-white px-4 py-2 shadow-sm"
              >
                {workspace.organization.contactPhone}
              </a>
            ) : null}
            {workspace.organization.contactEmail ? (
              <a
                href={`mailto:${workspace.organization.contactEmail}`}
                className="max-w-full break-all rounded-full bg-white px-4 py-2 shadow-sm"
              >
                {workspace.organization.contactEmail}
              </a>
            ) : null}
            {workspace.organization.websiteUrl ? (
              <a
                href={workspace.organization.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="max-w-full break-all rounded-full bg-white px-4 py-2 shadow-sm"
              >
                {workspace.organization.websiteUrl}
              </a>
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
              <label className="flex cursor-pointer items-center gap-3 rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
                <Upload className="size-4 text-zinc-500" />
                <span className="flex-1">Upload vaccine record</span>
                <Input
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setUploadNote(`${file.name} uploaded for review.`);
                    addMessage({
                      organizationId: workspace.organization.id,
                      customerId: latestCustomer?.id,
                      petId: latestPet?.id,
                      channel: "portal",
                      direction: "inbound",
                      subject: "Vaccine upload",
                      body: `Customer uploaded vaccine file: ${file.name}`,
                      sender: "Pet Parent",
                    });
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {uploadNote ? <p className="text-sm text-emerald-700">{uploadNote}</p> : null}
              <Textarea
                placeholder="Message the business"
                value={portalMessage}
                onChange={(event) => setPortalMessage(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-full"
                  onClick={() => {
                    addMessage({
                      organizationId: workspace.organization.id,
                      customerId: latestCustomer?.id,
                      petId: latestPet?.id,
                      channel: "portal",
                      direction: "inbound",
                      subject: "Portal message",
                      body: portalMessage || "Portal message submitted.",
                      sender: "Pet Parent",
                    });
                    setPortalMessage("");
                  }}
                >
                  Send portal message
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    addPayment({
                      organizationId: workspace.organization.id,
                      customerId: latestCustomer?.id || workspace.customers[0]?.id || "",
                      appointmentId: latestAppointment?.id,
                      amount: latestAppointment?.deposit || 25,
                      depositAmount: latestAppointment?.deposit || 25,
                      status: "paid",
                      method: "stripe",
                      dueDate: new Date().toISOString().slice(0, 10),
                      label: `Portal deposit for ${latestPet?.name || "upcoming visit"}`,
                    });
                    addMessage({
                      organizationId: workspace.organization.id,
                      customerId: latestCustomer?.id,
                      petId: latestPet?.id,
                      channel: "portal",
                      direction: "outbound",
                      subject: "Deposit received",
                      body: `Deposit received for ${latestPet?.name || "your pet"}. Your visit is now marked as confirmed in the demo.`,
                      sender: brand.businessName,
                    });
                    setDepositNote("Deposit captured in the demo payment ledger.");
                  }}
                >
                  Pay deposit
                </Button>
              </div>
              {depositNote ? <p className="text-sm text-emerald-700">{depositNote}</p> : null}
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
