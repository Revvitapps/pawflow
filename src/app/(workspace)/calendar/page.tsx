"use client";

import Link from "next/link";
import { useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { usePawFlow } from "@/components/pawflow-provider";
import { AppointmentCard, EmptyState, StatusBadge } from "@/components/pawflow-ui";
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

type CalendarView = "day" | "week" | "month";

export default function CalendarPage() {
  const { workspace, createAppointment } = usePawFlow();
  const params =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialView = params?.get("view");
  const initialDate = params?.get("date");
  const [view, setView] = useState<CalendarView>(
    initialView === "day" || initialView === "week" || initialView === "month" ? initialView : "day",
  );
  const [staffFilter, setStaffFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    initialDate ? new Date(`${initialDate}T12:00:00`) : new Date(),
  );
  const today = format(selectedDate, "yyyy-MM-dd");

  const filteredAppointments = workspace.appointments.filter(
    (appointment) =>
      (staffFilter === "all" || appointment.staffId === staffFilter) &&
      (serviceFilter === "all" || appointment.serviceId === serviceFilter),
  );

  const dayAppointments = filteredAppointments.filter((appointment) => appointment.date === today);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthStart = startOfMonth(selectedDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthEnd = endOfMonth(selectedDate);
  const monthGridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays: Date[] = [];
  for (let cursor = monthGridStart; cursor <= monthGridEnd; cursor = addDays(cursor, 1)) {
    monthDays.push(cursor);
  }

  const navigate = (direction: "prev" | "next") => {
    const delta = direction === "next" ? 1 : -1;
    if (view === "day") setSelectedDate((current) => addDays(current, delta));
    if (view === "week") setSelectedDate((current) => addDays(current, delta * 7));
    if (view === "month") {
      const nextDate = new Date(selectedDate);
      nextDate.setMonth(selectedDate.getMonth() + delta);
      setSelectedDate(nextDate);
    }
  };

  const title =
    view === "day"
      ? format(selectedDate, "EEEE, MMM d")
      : view === "week"
        ? `${format(weekDays[0], "MMM d")} - ${format(weekDays[6], "MMM d")}`
        : format(selectedDate, "MMMM yyyy");

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Calendar view for {format(selectedDate, "yyyy-MM-dd")}</p>
            <h2 className="font-heading text-3xl font-semibold text-zinc-900">Visual Schedule</h2>
            <p className="text-sm text-zinc-600">Switch between a full day, full week, and full month layout like a lightweight Google Calendar flow.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1">
              {(["day", "week", "month"] as CalendarView[]).map((option) => (
                <button
                  key={option}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
                    view === option ? "bg-zinc-900 text-white" : "text-zinc-600"
                  }`}
                  onClick={() => setView(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
              <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => navigate("prev")}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-36 text-center text-sm font-medium text-zinc-700">{title}</span>
              <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => navigate("next")}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
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
                  <DialogDescription>Create an appointment directly in the workspace schedule.</DialogDescription>
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

      {view === "day" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {dayAppointments.length ? (
            dayAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                pet={workspace.pets.find((pet) => pet.id === appointment.petId)}
                customer={workspace.customers.find((customer) => customer.id === appointment.customerId)}
                serviceLabel={workspace.services.find((service) => service.id === appointment.serviceId)?.name || "Service"}
                staffName={workspace.staff.find((staff) => staff.id === appointment.staffId)?.name || "Staff"}
                href={`/appointments/${appointment.id}`}
              />
            ))
          ) : (
            <EmptyState title="Open pockets of time" body="No appointments match these filters right now." icon={CalendarPlus} />
          )}
        </div>
      ) : null}

      {view === "week" ? (
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardContent className="grid gap-4 p-4 md:grid-cols-7">
            {weekDays.map((day) => {
              const iso = format(day, "yyyy-MM-dd");
              const appointments = filteredAppointments
                .filter((appointment) => appointment.date === iso)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div key={iso} className="rounded-[24px] bg-zinc-50 p-3">
                  <div className="mb-3 border-b border-zinc-200 pb-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">{format(day, "EEE")}</p>
                    <button className="mt-1 text-left text-lg font-semibold text-zinc-900" onClick={() => setSelectedDate(day)}>
                      {format(day, "d")}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {appointments.length ? (
                      appointments.map((appointment) => {
                        const pet = workspace.pets.find((item) => item.id === appointment.petId);
                        return (
                          <div key={appointment.id} className="rounded-[18px] bg-white p-3 shadow-sm">
                            <Link href={`/appointments/${appointment.id}`} className="block">
                              <p className="text-sm font-semibold text-zinc-900">{appointment.startTime}</p>
                              <p className="mt-1 text-sm text-zinc-700">{pet?.name}</p>
                              <div className="mt-2">
                                <StatusBadge status={appointment.status} />
                              </div>
                            </Link>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-zinc-400">No bookings</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {view === "month" ? (
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardContent className="p-4">
            <div className="mb-3 grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const iso = format(day, "yyyy-MM-dd");
                const appointments = filteredAppointments
                  .filter((appointment) => appointment.date === iso)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <button
                    key={iso}
                    className={`min-h-32 rounded-[22px] border p-3 text-left ${
                      isSameMonth(day, selectedDate)
                        ? "border-zinc-200 bg-white"
                        : "border-transparent bg-zinc-50 text-zinc-400"
                    } ${isSameDay(day, selectedDate) ? "ring-2 ring-[#79c6bf]" : ""}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">{format(day, "d")}</span>
                      {appointments.length ? (
                        <span className="rounded-full bg-[#dff3f0] px-2 py-1 text-[11px] font-semibold text-zinc-700">
                          {appointments.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {appointments.slice(0, 3).map((appointment) => {
                        const pet = workspace.pets.find((item) => item.id === appointment.petId);
                        return (
                          <Link
                            key={appointment.id}
                            href={`/appointments/${appointment.id}`}
                            className="block rounded-[16px] bg-[#fff6ef] px-2 py-2 text-xs text-zinc-700"
                          >
                            <div className="font-semibold">{appointment.startTime}</div>
                            <div>{pet?.name}</div>
                          </Link>
                        );
                      })}
                      {appointments.length > 3 ? (
                        <div className="text-xs font-medium text-zinc-500">+{appointments.length - 3} more</div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardContent className="p-5">
          <h3 className="font-heading text-xl font-semibold text-zinc-900">Selected day detail</h3>
          <p className="mt-1 text-sm text-zinc-500">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {filteredAppointments
              .filter((appointment) => appointment.date === format(selectedDate, "yyyy-MM-dd"))
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  pet={workspace.pets.find((pet) => pet.id === appointment.petId)}
                  customer={workspace.customers.find((customer) => customer.id === appointment.customerId)}
                  serviceLabel={workspace.services.find((service) => service.id === appointment.serviceId)?.name || "Service"}
                  staffName={workspace.staff.find((staff) => staff.id === appointment.staffId)?.name || "Staff"}
                  href={`/appointments/${appointment.id}`}
                />
              ))}
            {!filteredAppointments.some((appointment) => appointment.date === format(selectedDate, "yyyy-MM-dd")) ? (
              <EmptyState title="Nothing booked here yet" body="Pick another date or create a new appointment from the calendar header." icon={CalendarPlus} />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
