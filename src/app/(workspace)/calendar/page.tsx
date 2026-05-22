"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";

import { usePawFlow } from "@/components/pawflow-provider";
import { AppointmentCard, EmptyState } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CalendarPage() {
  const { workspace, createAppointment } = usePawFlow();
  const [staffFilter, setStaffFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const appointments = workspace.appointments.filter(
    (appointment) =>
      appointment.date === today &&
      (staffFilter === "all" || appointment.staffId === staffFilter) &&
      (serviceFilter === "all" || appointment.serviceId === serviceFilter),
  );

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Day view for {today}</p>
            <h2 className="font-heading text-3xl font-semibold text-zinc-900">Visual Schedule</h2>
            <p className="text-sm text-zinc-600">Drag/drop can slot in later; today’s MVP uses live filters and a creation modal.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="all">All staff</option>
              {workspace.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
            <select className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
              <option value="all">All services</option>
              {workspace.services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <CalendarPlus className="size-4" />
                  Create appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl rounded-[32px]">
                <DialogHeader>
                  <DialogTitle>Create appointment</DialogTitle>
                  <DialogDescription>Build a realistic appointment directly into the demo workspace.</DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    createAppointment({
                      id: crypto.randomUUID(),
                      organizationId: workspace.organization.id,
                      customerId: String(formData.get("customerId")),
                      petId: String(formData.get("petId")),
                      staffId: String(formData.get("staffId")),
                      serviceId: String(formData.get("serviceId")),
                      date: String(formData.get("date")),
                      startTime: String(formData.get("startTime")),
                      endTime: String(formData.get("endTime")),
                      price: Number(formData.get("price")),
                      deposit: Number(formData.get("deposit")),
                      status: "requested",
                      notes: String(formData.get("notes")),
                      noShowRisk: "medium",
                      reminderEnabled: true,
                    });
                    setOpen(false);
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select name="customerId" className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm">
                      {workspace.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.name}</option>
                      ))}
                    </select>
                    <select name="petId" className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm">
                      {workspace.pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>{pet.name}</option>
                      ))}
                    </select>
                    <select name="staffId" className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm">
                      {workspace.staff.map((staff) => (
                        <option key={staff.id} value={staff.id}>{staff.name}</option>
                      ))}
                    </select>
                    <select name="serviceId" className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm">
                      {workspace.services.map((service) => (
                        <option key={service.id} value={service.id}>{service.name}</option>
                      ))}
                    </select>
                    <Input name="date" type="date" defaultValue={today} />
                    <Input name="price" type="number" defaultValue="95" />
                    <Input name="startTime" type="time" defaultValue="09:00" />
                    <Input name="endTime" type="time" defaultValue="10:30" />
                    <Input name="deposit" type="number" defaultValue="25" />
                  </div>
                  <Textarea name="notes" placeholder="Prep notes, cut preferences, pickup details..." />
                  <Button className="w-full rounded-full">Create appointment</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {appointments.length ? (
          appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              pet={workspace.pets.find((pet) => pet.id === appointment.petId)}
              customer={workspace.customers.find((customer) => customer.id === appointment.customerId)}
              serviceLabel={workspace.services.find((service) => service.id === appointment.serviceId)?.name || "Service"}
              staffName={workspace.staff.find((staff) => staff.id === appointment.staffId)?.name || "Staff"}
            />
          ))
        ) : (
          <EmptyState title="Open pockets of time" body="No appointments match these filters right now." icon={CalendarPlus} />
        )}
      </div>
    </div>
  );
}
