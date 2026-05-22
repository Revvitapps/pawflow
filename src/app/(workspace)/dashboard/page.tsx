"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import {
  AIInsightCard,
  DashboardCard,
  EmptyState,
  MiniMetric,
  QuickActionButton,
  RevenueSnapshot,
  StatusBadge,
  uiIcons,
} from "@/components/pawflow-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REBOOKING_CUTOFF_ISO = new Date(Date.now() - 1000 * 60 * 60 * 24 * 42).toISOString().slice(0, 10);

export default function DashboardPage() {
  const { workspace, addAiLog, addMessage, runAiTask } = usePawFlow();
  const [aiSummary, setAiSummary] = useState("Generating your AI ops brief...");
  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = workspace.appointments.filter((appointment) => appointment.date === today);
  const currentBoarding = workspace.boardingStays.filter((stay) => stay.status === "checked-in");
  const unreadMessages = workspace.messages.filter((message) => message.direction === "inbound");
  const readyPets = workspace.appointments.filter((appointment) => appointment.status === "ready");
  const vaccineAlerts = workspace.pets.flatMap((pet) =>
    pet.vaccineRecords
      .filter((record) => record.status === "expired" || record.status === "expiring-soon")
      .map((record) => ({ pet, record })),
  );
  const paid = workspace.payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = workspace.payments.filter((payment) => payment.status !== "paid").reduce((sum, payment) => sum + payment.amount, 0);
  const deposits = workspace.payments.reduce((sum, payment) => sum + payment.depositAmount, 0);

  useEffect(() => {
    runAiTask("summarizeDay", { workspace }).then((output) => {
      setAiSummary(output);
      addAiLog("summarizeDay", "Dashboard daily summary", output);
    });
  }, [addAiLog, runAiTask, workspace]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Today's Appointments" value={String(todayAppointments.length)} hint="Mixed grooming flow across the day" icon={uiIcons.appointments} />
        <DashboardCard title="Boarding Occupancy" value={`${currentBoarding.length}/${workspace.organization.boardingCapacity}`} hint="Pets currently checked in" icon={uiIcons.pets} />
        <DashboardCard title="Missed Calls" value={String(workspace.missedCalls.length)} hint="Needs attention from AI rescue" icon={uiIcons.missedCalls} />
        <DashboardCard title="Unread Messages" value={String(unreadMessages.length)} hint="Unified inbox waiting on follow-up" icon={uiIcons.messages} />
      </div>

      {workspace.organization.workspaceMode === "demo" ? (
        <Card className="rounded-[32px] border-[#dff3f0] bg-[linear-gradient(135deg,#ffffff_0%,#eef7f5_100%)]">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">Guided Onboarding</p>
              <h2 className="mt-2 font-heading text-2xl font-semibold text-zinc-900">Start here for a real client setup</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600">
                This workspace is still Zion &amp; Co., the preserved demo example. Use the guided setup flow to brand a new grooming business, enter services and staff, and create her own working version.
              </p>
            </div>
            <Link href="/setup">
              <button className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white">Open setup wizard</button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AIInsightCard title="Today's gentle game plan" body={aiSummary} />
        <div className="grid gap-4 sm:grid-cols-2">
          <MiniMetric label="Pets Ready to Wag" value={String(readyPets.length)} colorClassName="bg-emerald-50" />
          <MiniMetric label="Vaccine Watch" value={String(vaccineAlerts.length)} colorClassName="bg-amber-50" />
          <MiniMetric label="No-Show Risk" value={String(workspace.appointments.filter((appointment) => appointment.noShowRisk === "high").length)} colorClassName="bg-rose-50" />
          <MiniMetric label="Rebooking Opportunities" value={String(workspace.pets.filter((pet) => pet.lastVisitAt && pet.lastVisitAt < REBOOKING_CUTOFF_ISO).length)} colorClassName="bg-sky-50" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/appointments"><QuickActionButton label="Create appointment" icon={uiIcons.appointments} /></Link>
        <Link href="/messages"><QuickActionButton label="Missed Call Rescue" icon={uiIcons.missedCalls} /></Link>
        <Link href="/pets"><QuickActionButton label="Same Fluff as Last Time" icon={uiIcons.sameAsLastTime} /></Link>
        <Link href="/reviews"><QuickActionButton label="Come Back Soon campaigns" icon={uiIcons.rebooking} /></Link>
      </div>

      <RevenueSnapshot paid={paid} outstanding={outstanding} deposits={deposits} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Today&apos;s appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAppointments.length ? (
              todayAppointments.map((appointment) => {
                const pet = workspace.pets.find((item) => item.id === appointment.petId);
                const customer = workspace.customers.find((item) => item.id === appointment.customerId);
                return (
                  <div key={appointment.id} className="flex items-center justify-between rounded-[24px] bg-zinc-50 p-4">
                    <div>
                      <p className="font-medium text-zinc-900">{appointment.startTime} · {pet?.name}</p>
                      <p className="text-sm text-zinc-500">{customer?.name}</p>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                );
              })
            ) : (
              <EmptyState title="A calm calendar" body="No appointments are scheduled today yet." icon={uiIcons.appointments} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Vaccine Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vaccineAlerts.length ? (
              vaccineAlerts.map(({ pet, record }) => {
                const customer = workspace.customers.find((item) => item.id === pet.customerId);
                return (
                  <div key={record.id} className="rounded-[24px] bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900">{pet.name} · {record.name}</p>
                        <p className="text-sm text-zinc-500">{customer?.name} · expires {record.expiresAt}</p>
                      </div>
                      <button
                        className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                        onClick={() =>
                          addMessage({
                            organizationId: workspace.organization.id,
                            customerId: customer?.id,
                            petId: pet.id,
                            channel: "sms",
                            direction: "outbound",
                            subject: "Vaccine reminder",
                            body: `${pet.name}'s ${record.name} record is ${record.status.replace("-", " ")}. Please upload an update before boarding or daycare.`,
                            sender: "PawFlow Automations",
                          })
                        }
                      >
                        Mock-send
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="All clear" body="No vaccine issues need attention right now." icon={uiIcons.vaccine} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
