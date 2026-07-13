"use client";

import Link from "next/link";
import { useState } from "react";

import { usePawFlow } from "@/components/pawflow-provider";
import { AppointmentCard, EmptyState } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppointmentsPage() {
  const { workspace, approveIntakeRequest, updateAppointmentStatus, addMessage, addAiLog, runAiTask } = usePawFlow();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleStatusChange = async (appointmentId: string, status: Parameters<typeof updateAppointmentStatus>[1]) => {
    const appointment = workspace.appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    const customer = workspace.customers.find((item) => item.id === appointment.customerId);
    const pet = workspace.pets.find((item) => item.id === appointment.petId);
    updateAppointmentStatus(appointmentId, status);

    if (status === "ready" && customer && pet) {
      setBusyId(appointmentId);
      const output = await runAiTask("generateReadyForPickupMessage", { customerName: customer.name, petName: pet.name });
      addAiLog("generateReadyForPickupMessage", `${customer.name} / ${pet.name}`, output);
      addMessage({
        organizationId: workspace.organization.id,
        customerId: customer.id,
        petId: pet.id,
        channel: "sms",
        direction: "outbound",
        subject: "Ready to Wag",
        body: output,
        sender: "Front Desk",
        aiSuggested: true,
      });
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Appointment Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {workspace.appointments.map((appointment) => (
            <div key={appointment.id} className="space-y-2">
              <AppointmentCard
                appointment={appointment}
                pet={workspace.pets.find((pet) => pet.id === appointment.petId)}
                customer={workspace.customers.find((customer) => customer.id === appointment.customerId)}
                serviceLabel={workspace.services.find((service) => service.id === appointment.serviceId)?.name || "Service"}
                staffName={workspace.staff.find((staff) => staff.id === appointment.staffId)?.name || "Staff"}
                onStatusChange={(status) => void handleStatusChange(appointment.id, status)}
              />
              <Link href={`/appointments/${appointment.id}`}>
                <Button variant="outline" className="w-full rounded-full">Open appointment detail</Button>
              </Link>
            </div>
          ))}
          {busyId ? <p className="text-sm text-zinc-500">Generating ready-for-pickup message...</p> : null}
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">New customer intake</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {workspace.intakeRequests.length ? (
            workspace.intakeRequests.map((request) => {
              const customer = workspace.customers.find((item) => item.id === request.customerId);
              const pet = workspace.pets.find((item) => item.id === request.petId);
              return (
                <div key={request.id} className="rounded-[28px] bg-zinc-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">{request.type} intake</p>
                      <h3 className="font-heading text-xl font-semibold text-zinc-900">{pet?.name} · {customer?.name}</h3>
                      <p className="mt-2 text-sm text-zinc-600">{request.aiSummary}</p>
                    </div>
                    <Button className="rounded-full" onClick={() => approveIntakeRequest(request.id)} disabled={request.status !== "new"}>
                      {request.status === "new" ? "Approve + convert to appointment" : "Scheduled"}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState title="No fresh intake requests" body="Portal and AI receptionist submissions will land here for staff approval." icon={() => null} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
