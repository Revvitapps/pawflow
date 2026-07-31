"use server";

import { revalidatePath } from "next/cache";
import type { AppointmentStatus, ReservationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireSession } from "@/lib/session";

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "requested",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
  "no_show",
];

const RESERVATION_STATUSES: ReservationStatus[] = [
  "requested",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
];

/** Move an appointment to a new status — tenant-scoped through db.ts. */
export async function setAppointmentStatusAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) return;

  await db.setAppointmentStatus(session.user.businessId, id, status as AppointmentStatus);
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "appointment.status_changed",
    entityType: "appointment",
    entityId: id,
    metadata: { status },
  });
  revalidatePath("/appointments");
  revalidatePath("/dashboard");
}

/** Assign a kennel to a reservation — capacity + tenant enforced in db.ts. */
export async function assignKennelAction(formData: FormData) {
  const session = await requireSession();
  const reservationId = String(formData.get("reservationId") ?? "");
  const kennelId = String(formData.get("kennelId") ?? "");
  if (!reservationId || !kennelId) return;

  await db.assignKennel(session.user.businessId, reservationId, kennelId);
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "reservation.kennel_assigned",
    entityType: "reservation",
    entityId: reservationId,
    metadata: { kennelId },
  });
  revalidatePath("/boarding");
}

/** Change a reservation's status (check-in / check-out / cancel). */
export async function setReservationStatusAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !RESERVATION_STATUSES.includes(status as ReservationStatus)) return;

  await db.setReservationStatus(session.user.businessId, id, status as ReservationStatus);
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "reservation.status_changed",
    entityType: "reservation",
    entityId: id,
    metadata: { status },
  });
  revalidatePath("/boarding");
}
