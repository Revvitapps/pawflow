"use client";

import Image from "next/image";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  Bone,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Dog,
  HeartHandshake,
  MessageCircleMore,
  PawPrint,
  PhoneMissed,
  ShieldAlert,
  Sparkles,
  Syringe,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  Appointment,
  AppointmentStatus,
  AutomationSetting,
  BoardingStay,
  Customer,
  Message,
  Pet,
  PortalRequestPayload,
  VaccineRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const appointmentTone: Record<AppointmentStatus, string> = {
  requested: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  "checked-in": "bg-violet-100 text-violet-800",
  "in-progress": "bg-fuchsia-100 text-fuchsia-800",
  ready: "bg-emerald-100 text-emerald-800",
  completed: "bg-zinc-200 text-zinc-800",
  cancelled: "bg-rose-100 text-rose-800",
  "no-show": "bg-rose-200 text-rose-900",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = appointmentTone[status as AppointmentStatus] || "bg-zinc-100 text-zinc-700";
  return <span className={cn("rounded-full px-3 py-1 text-xs font-semibold capitalize", tone)}>{status}</span>;
}

export function VaccineBadge({ record }: { record: VaccineRecord }) {
  const tone =
    record.status === "current"
      ? "bg-emerald-100 text-emerald-800"
      : record.status === "expiring-soon"
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", tone)}>
      <Syringe className="size-3" />
      {record.name} · {record.status.replace("-", " ")}
    </span>
  );
}

export function DashboardCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-500">{title}</span>
          <div className="rounded-2xl bg-zinc-100 p-2">
            <Icon className="size-4 text-zinc-700" />
          </div>
        </div>
        <div className="text-3xl font-semibold text-zinc-900">{value}</div>
        <p className="mt-2 text-sm text-zinc-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function AIInsightCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="rounded-[28px] border-0 bg-[linear-gradient(135deg,#fff7ee_0%,#ffe2eb_55%,#fff_100%)] shadow-[0_30px_80px_rgba(242,183,198,0.25)]">
      <CardContent className="p-6">
        <div className="mb-3 inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-zinc-700">
          AI Summary
        </div>
        <h3 className="font-heading text-xl font-semibold text-zinc-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-zinc-700">{body}</p>
      </CardContent>
    </Card>
  );
}

export function QuickActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <Button variant="outline" className="h-auto justify-start rounded-[24px] px-4 py-4 text-left" onClick={onClick}>
      <div className="mr-3 rounded-2xl bg-zinc-100 p-2">
        <Icon className="size-4 text-zinc-700" />
      </div>
      <span>{label}</span>
    </Button>
  );
}

export function AppointmentCard({
  appointment,
  pet,
  customer,
  serviceLabel,
  staffName,
  onStatusChange,
}: {
  appointment: Appointment;
  pet?: Pet;
  customer?: Customer;
  serviceLabel: string;
  staffName: string;
  onStatusChange?: (status: AppointmentStatus) => void;
}) {
  const statuses: AppointmentStatus[] = [
    "requested",
    "confirmed",
    "checked-in",
    "in-progress",
    "ready",
    "completed",
    "cancelled",
    "no-show",
  ];

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">{appointment.startTime}</p>
            <h3 className="font-heading text-xl font-semibold text-zinc-900">{pet?.name || "Pet"} · {serviceLabel}</h3>
            <p className="text-sm text-zinc-600">{customer?.name} with {staffName}</p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-3">
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-4" />
            {appointment.startTime} - {appointment.endTime}
          </span>
          <span className="inline-flex items-center gap-2">
            <CreditCard className="size-4" />
            ${appointment.price}
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldAlert className="size-4" />
            No-show risk {appointment.noShowRisk}
          </span>
        </div>
        <p className="rounded-2xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">{appointment.notes || "No notes yet."}</p>
        {onStatusChange ? (
          <div className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={status === appointment.status ? "default" : "outline"}
                className="rounded-full"
                onClick={() => onStatusChange(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PetProfileCard({ pet, owner }: { pet: Pet; owner?: Customer }) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#fff1e8] text-2xl">🐾</div>
          <div>
            <h3 className="font-heading text-xl font-semibold text-zinc-900">{pet.name}</h3>
            <p className="text-sm text-zinc-600">{pet.breed} · {pet.age} · {pet.weight}</p>
            <p className="text-sm text-zinc-500">Owner: {owner?.name}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {pet.vaccineRecords.map((record) => (
            <VaccineBadge key={record.id} record={record} />
          ))}
        </div>
        <div className="mt-4 grid gap-3 text-sm text-zinc-700">
          <p><span className="font-semibold text-zinc-900">Same Fluff as Last Time:</span> {pet.sameAsLastTime || "No preference saved yet."}</p>
          <p><span className="font-semibold text-zinc-900">Cut preferences:</span> {pet.cutPreferences || "Add grooming notes for next visit."}</p>
          <p><span className="font-semibold text-zinc-900">Boarding notes:</span> {pet.boardingNotes || "No boarding notes."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerCard({ customer, petCount }: { customer: Customer; petCount: number }) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-zinc-900">{customer.name}</h3>
            <p className="text-sm text-zinc-600">{customer.phone} · {customer.email}</p>
          </div>
          <Badge className="rounded-full bg-zinc-100 text-zinc-700">{petCount} pets</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {customer.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
          ))}
        </div>
        <div className="mt-4 text-sm text-zinc-600">
          <p>Preferred channel: {customer.preferredChannel}</p>
          <p>Balance: ${(customer.balanceCents / 100).toFixed(2)}</p>
          <p>Last visit: {customer.lastVisitAt || "New"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MessageThread({ message }: { message: Message }) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{message.channel}</p>
            <h3 className="font-heading text-lg font-semibold text-zinc-900">{message.subject}</h3>
            <p className="text-sm text-zinc-600">{message.sender}</p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {message.direction}
          </Badge>
        </div>
        <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">{message.body}</p>
        <p className="mt-3 text-xs text-zinc-400">{formatDistanceToNowStrict(parseISO(message.createdAt), { addSuffix: true })}</p>
      </CardContent>
    </Card>
  );
}

export function AutomationToggleCard({
  automation,
  onToggle,
}: {
  automation: AutomationSetting;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <h3 className="font-heading text-lg font-semibold text-zinc-900">{automation.title}</h3>
          <p className="mt-2 text-sm text-zinc-600">{automation.description}</p>
        </div>
        <Switch checked={automation.enabled} onCheckedChange={onToggle} />
      </CardContent>
    </Card>
  );
}

export function BrandPreview({
  businessName,
  logoUrl,
  primaryColor,
  secondaryColor,
  accentColor,
  poweredByPawFlow,
}: {
  businessName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  poweredByPawFlow: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-[32px] border-white/70 bg-white">
      <div className="p-6" style={{ background: `linear-gradient(135deg, ${secondaryColor} 0%, white 60%, ${accentColor}55 100%)` }}>
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white shadow-sm">
              {logoUrl ? (
                <Image src={logoUrl} alt={`${businessName} logo`} fill className="object-contain" sizes="48px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl text-white" style={{ backgroundColor: primaryColor }}>
                  🐾
                </div>
              )}
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold text-zinc-900">{businessName}</h3>
              <p className="text-sm text-zinc-500">Customer portal preview</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
              Book a groom
            </div>
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-700">Upload vaccine records</div>
            <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-700">Message the front desk</div>
          </div>
          {poweredByPawFlow ? (
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-400">Powered by PawFlow</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function BoardingStayCard({
  stay,
  pet,
  customer,
  onAssignRoom,
  onCheckOut,
}: {
  stay: BoardingStay;
  pet?: Pet;
  customer?: Customer;
  onAssignRoom?: (room: string) => void;
  onCheckOut?: () => void;
}) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Boarding stay</p>
            <h3 className="font-heading text-xl font-semibold text-zinc-900">{pet?.name || "Pet"} · {stay.room}</h3>
            <p className="text-sm text-zinc-600">{customer?.name}</p>
          </div>
          <StatusBadge status={stay.status} />
        </div>
        <div className="grid gap-2 text-sm text-zinc-600">
          <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{stay.startDate} to {stay.endDate}</span>
          <span className="inline-flex items-center gap-2"><Bone className="size-4" />{stay.feedingNotes || "No feeding notes yet."}</span>
          <span className="inline-flex items-center gap-2"><HeartHandshake className="size-4" />{stay.medicationNotes || "No medication notes."}</span>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
          Pawgress: {stay.photoUpdates[0] || "No updates yet."}
        </div>
        <div className="flex flex-wrap gap-2">
          {onAssignRoom ? (
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => onAssignRoom(`Suite ${Math.floor(Math.random() * 4) + 1}C`)}>
              Assign room
            </Button>
          ) : null}
          {onCheckOut ? (
            <Button size="sm" className="rounded-full" onClick={onCheckOut}>
              Check out
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueSnapshot({
  paid,
  outstanding,
  deposits,
}: {
  paid: number;
  outstanding: number;
  deposits: number;
}) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Revenue Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[24px] bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Paid</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">${paid.toFixed(0)}</p>
        </div>
        <div className="rounded-[24px] bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">${outstanding.toFixed(0)}</p>
        </div>
        <div className="rounded-[24px] bg-sky-50 p-4">
          <p className="text-sm text-sky-700">Deposits</p>
          <p className="mt-2 text-2xl font-semibold text-sky-900">${deposits.toFixed(0)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PortalBookingForm({
  type,
  onSubmit,
  loading,
}: {
  type: "grooming" | "boarding";
  onSubmit: (payload: PortalRequestPayload) => Promise<void> | void;
  loading?: boolean;
}) {
  const defaultService = type === "boarding" ? "Overnight Boarding" : "Full Groom";

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        await onSubmit({
          customerName: String(formData.get("customerName") || ""),
          phone: String(formData.get("phone") || ""),
          email: String(formData.get("email") || ""),
          petName: String(formData.get("petName") || ""),
          breed: String(formData.get("breed") || ""),
          serviceNeeded: String(formData.get("serviceNeeded") || defaultService),
          preferredDates: String(formData.get("preferredDates") || ""),
          specialNotes: String(formData.get("specialNotes") || ""),
          behaviorConcerns: String(formData.get("behaviorConcerns") || ""),
          vaccineStatus: String(formData.get("vaccineStatus") || ""),
          requestType: type,
        });
        event.currentTarget.reset();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="customerName" placeholder="Customer name" required />
        <Input name="petName" placeholder="Pet name" required />
        <Input name="phone" placeholder="Phone" required />
        <Input name="email" placeholder="Email" required />
        <Input name="breed" placeholder="Breed" required />
        <Input name="serviceNeeded" placeholder="Service needed" defaultValue={defaultService} required />
      </div>
      <Input name="preferredDates" placeholder={type === "boarding" ? "Preferred dates: 2026-06-10 to 2026-06-14" : "Preferred dates or time windows"} required />
      <Textarea name="specialNotes" placeholder="Special notes, pickup timing, coat goals, feeding details..." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Textarea name="behaviorConcerns" placeholder="Behavior concerns" />
        <Textarea name="vaccineStatus" placeholder="Vaccine status" />
      </div>
      <Button className="w-full rounded-full" disabled={loading}>
        {loading ? "Working..." : type === "boarding" ? "Request stay" : "Request booking"}
      </Button>
    </form>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-[28px] border-dashed border-zinc-200 bg-white/70">
      <CardContent className="flex flex-col items-center px-6 py-10 text-center">
        <div className="mb-4 rounded-full bg-zinc-100 p-4">
          <Icon className="size-6 text-zinc-600" />
        </div>
        <h3 className="font-heading text-xl font-semibold text-zinc-900">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">{body}</p>
      </CardContent>
    </Card>
  );
}

export const uiIcons = {
  missedCalls: PhoneMissed,
  appointments: CalendarDays,
  ready: CheckCircle2,
  messages: MessageCircleMore,
  rebooking: ArrowUpRight,
  pets: Dog,
  alerts: AlertTriangle,
  vaccine: Syringe,
  sameAsLastTime: PawPrint,
  ai: Sparkles,
};

export function MiniMetric({
  label,
  value,
  colorClassName,
}: {
  label: string;
  value: string;
  colorClassName?: string;
}) {
  return (
    <div className={cn("rounded-[24px] bg-zinc-100 p-4", colorClassName)}>
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export function StaffChip({ label }: { label: string }) {
  return (
    <Badge className="rounded-full bg-white text-zinc-700 shadow-sm">
      <Avatar className="mr-2 size-5">
        <AvatarFallback>{label.slice(0, 1)}</AvatarFallback>
      </Avatar>
      {label}
    </Badge>
  );
}

export function DateLabel({ isoDate }: { isoDate: string }) {
  return <span>{format(parseISO(isoDate), "MMM d, yyyy")}</span>;
}
