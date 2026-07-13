"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { usePawFlow } from "@/components/pawflow-provider";
import { StatusBadge } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const appointmentSteps = ["requested", "confirmed", "checked-in", "in-progress", "ready", "completed"];

export default function AppointmentDetailPage() {
  const params = useParams<{ appointmentId: string }>();
  const { workspace, updateAppointment, updateAppointmentStatus, addMessage, addAiLog, runAiTask } = usePawFlow();

  const appointment = workspace.appointments.find((item) => item.id === params.appointmentId);
  const customer = workspace.customers.find((item) => item.id === appointment?.customerId);
  const pet = workspace.pets.find((item) => item.id === appointment?.petId);
  const payment = workspace.payments.find((item) => item.appointmentId === appointment?.id);

  if (!appointment) {
    return (
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-6">
          <p className="text-sm text-zinc-600">Appointment record not found in the demo workspace.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Appointment detail</p>
          <h2 className="font-heading text-3xl font-semibold text-zinc-900">{pet?.name} · {appointment.date}</h2>
        </div>
        <Link href="/appointments">
          <Button variant="outline" className="rounded-full">Back to appointments</Button>
        </Link>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Milestone flow</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {appointmentSteps.map((step) => (
            <button
              key={step}
              type="button"
              className={`rounded-[24px] px-4 py-4 text-left text-sm ${step === appointment.status ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-700"}`}
              onClick={() => updateAppointmentStatus(appointment.id, step as typeof appointment.status)}
            >
              {step}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Editable details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                updateAppointment(appointment.id, {
                  date: String(formData.get("date") || ""),
                  startTime: String(formData.get("startTime") || ""),
                  endTime: String(formData.get("endTime") || ""),
                  staffId: String(formData.get("staffId") || ""),
                  serviceId: String(formData.get("serviceId") || ""),
                  status: String(formData.get("status") || appointment.status) as typeof appointment.status,
                  noShowRisk: String(formData.get("noShowRisk") || appointment.noShowRisk) as typeof appointment.noShowRisk,
                  price: Number(formData.get("price") || 0),
                  deposit: Number(formData.get("deposit") || 0),
                  notes: String(formData.get("notes") || ""),
                  reminderEnabled: Boolean(formData.get("reminderEnabled")),
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="date" defaultValue={appointment.date} type="date" />
                <select name="status" defaultValue={appointment.status} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  {["requested", "confirmed", "checked-in", "in-progress", "ready", "completed", "cancelled", "no-show"].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <Input name="startTime" defaultValue={appointment.startTime} type="time" />
                <Input name="endTime" defaultValue={appointment.endTime} type="time" />
                <select name="staffId" defaultValue={appointment.staffId} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  {workspace.staff.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
                <select name="serviceId" defaultValue={appointment.serviceId} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  {workspace.services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
                <Input name="price" type="number" defaultValue={appointment.price} />
                <Input name="deposit" type="number" defaultValue={appointment.deposit} />
                <select name="noShowRisk" defaultValue={appointment.noShowRisk} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <Textarea name="notes" defaultValue={appointment.notes} placeholder="Appointment notes" />
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" name="reminderEnabled" defaultChecked={appointment.reminderEnabled} className="rounded" />
                Reminder enabled
              </label>
              <Button className="rounded-full">Save appointment</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge status={appointment.status} />
              {customer ? <Link href={`/customers/${customer.id}`} className="block rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Customer · {customer.name}</Link> : null}
              {pet ? <Link href={`/pets/${pet.id}`} className="block rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Pet · {pet.name}</Link> : null}
              {payment ? <Link href={`/payments/${payment.id}`} className="block rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-700">Payment · {payment.label}</Link> : null}
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                className="rounded-full"
                onClick={async () => {
                  if (!customer || !pet) return;
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
                  updateAppointmentStatus(appointment.id, "ready");
                }}
              >
                Send ready-for-pickup text
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
