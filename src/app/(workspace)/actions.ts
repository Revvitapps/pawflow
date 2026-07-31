"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppointmentStatus, ReservationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { requireSession, requireRole, AuthorizationError } from "@/lib/session";
import {
  ClientCreateSchema,
  ClientUpdateSchema,
  PetCreateSchema,
  PetUpdateSchema,
  AppointmentCreateSchema,
  ReservationCreateSchema,
  BusinessSettingsSchema,
  BrandSettingsSchema,
  MessageCreateSchema,
  firstError,
} from "@/lib/schemas";

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

function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Status / assignment writes
// ---------------------------------------------------------------------------

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
  revalidatePath("/calendar");
}

export async function assignKennelAction(formData: FormData) {
  const session = await requireSession();
  const reservationId = String(formData.get("reservationId") ?? "");
  const kennelId = String(formData.get("kennelId") ?? "");
  if (!reservationId || !kennelId) return;

  try {
    await db.assignKennel(session.user.businessId, reservationId, kennelId);
  } catch (err) {
    failTo("/boarding", err instanceof Error ? err.message : "Could not assign kennel.");
  }
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "reservation.kennel_assigned",
    entityType: "reservation",
    entityId: reservationId,
    metadata: { kennelId },
  });
  revalidatePath("/boarding");
}

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
  revalidatePath("/calendar");
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function createClientAction(formData: FormData) {
  const session = await requireSession();
  const parsed = ClientCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/customers", firstError(parsed.error));

  const { name, phone, email, notes } = parsed.data;
  const client = await db.createClient(session.user.businessId, {
    name,
    phone,
    email,
    notes: notes ? [notes] : [],
  });
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "client.created",
    entityType: "client",
    entityId: client.id,
  });
  revalidatePath("/customers");
  redirect(`/customers/${client.id}`);
}

export async function updateClientAction(formData: FormData) {
  const session = await requireSession();
  const parsed = ClientUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/customers", firstError(parsed.error));

  const { id, name, phone, email } = parsed.data;
  await db.updateClient(session.user.businessId, id, {
    ...(name !== undefined ? { name } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(email !== undefined ? { email } : {}),
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  redirect(`/customers/${id}`);
}

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

export async function createPetAction(formData: FormData) {
  const session = await requireSession();
  const parsed = PetCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/pets", firstError(parsed.error));

  const { clientId, name, breed, age, weight, allergies, cutPreferences } = parsed.data;
  try {
    const pet = await db.createPet(session.user.businessId, {
      clientId,
      name,
      breed,
      age,
      weight,
      allergies: splitList(allergies),
      cutPreferences,
    });
    await db.recordAudit(session.user.businessId, {
      actorId: session.user.id,
      action: "pet.created",
      entityType: "pet",
      entityId: pet.id,
    });
    revalidatePath("/pets");
    redirect(`/pets/${pet.id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) failTo("/pets", err.message);
    throw err;
  }
}

export async function updatePetAction(formData: FormData) {
  const session = await requireSession();
  const parsed = PetUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/pets", firstError(parsed.error));

  const { id, name, breed, age, weight, allergies, cutPreferences } = parsed.data;
  await db.updatePet(session.user.businessId, id, {
    name,
    breed,
    age,
    weight,
    allergies: splitList(allergies),
    cutPreferences,
  });
  revalidatePath(`/pets/${id}`);
  revalidatePath("/pets");
  redirect(`/pets/${id}`);
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function createAppointmentAction(formData: FormData) {
  const session = await requireSession();
  const parsed = AppointmentCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/appointments", firstError(parsed.error));

  const { clientId, petId, serviceId, staffId, date, startTime, endTime, priceDollars, notes } = parsed.data;
  try {
    const appt = await db.createAppointment(session.user.businessId, {
      clientId,
      petId,
      serviceId: serviceId || undefined,
      staffId: staffId || undefined,
      date: new Date(date),
      startTime,
      endTime,
      priceCents: Math.round(priceDollars * 100),
      notes,
    });
    await db.recordAudit(session.user.businessId, {
      actorId: session.user.id,
      action: "appointment.created",
      entityType: "appointment",
      entityId: appt.id,
    });
    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    redirect("/appointments");
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) failTo("/appointments", err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export async function createReservationAction(formData: FormData) {
  const session = await requireSession();
  const parsed = ReservationCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/boarding", firstError(parsed.error));

  const { clientId, petId, kind, startDate, endDate, feedingNotes, medicationNotes } = parsed.data;
  try {
    const reservation = await db.createReservation(session.user.businessId, {
      clientId,
      petId,
      kind,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      feedingNotes,
      medicationNotes,
    });
    await db.recordAudit(session.user.businessId, {
      actorId: session.user.id,
      action: "reservation.created",
      entityType: "reservation",
      entityId: reservation.id,
    });
    revalidatePath("/boarding");
    revalidatePath("/calendar");
    redirect("/boarding");
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) failTo("/boarding", err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Settings — real Business record
// ---------------------------------------------------------------------------

export async function updateBusinessAction(formData: FormData) {
  // Settings writes are owner-only (least privilege) — a valid staff session is
  // not enough.
  const session = await requireRole(["owner"]).catch((e) => {
    if (e instanceof AuthorizationError) failTo("/settings/business", e.message);
    throw e;
  });
  const parsed = BusinessSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/settings/business", firstError(parsed.error));

  const { name, timezone, boardingCapacity } = parsed.data;
  await db.updateBusiness(session.user.businessId, {
    name,
    ...(timezone ? { timezone } : {}),
    boardingCapacity,
  });
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "business.updated",
    entityType: "business",
    entityId: session.user.businessId,
  });
  revalidatePath("/settings/business");
  redirect("/settings/business?saved=1");
}

export async function updateBrandAction(formData: FormData) {
  const session = await requireRole(["owner"]).catch((e) => {
    if (e instanceof AuthorizationError) failTo("/settings/brand", e.message);
    throw e;
  });
  const parsed = BrandSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/settings/brand", firstError(parsed.error));

  await db.updateBusiness(session.user.businessId, { brand: parsed.data });
  revalidatePath("/settings/brand");
  redirect("/settings/brand?saved=1");
}

// ---------------------------------------------------------------------------
// Messages — real Notification records
// ---------------------------------------------------------------------------

export async function sendMessageAction(formData: FormData) {
  const session = await requireSession();
  const parsed = MessageCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) failTo("/messages", firstError(parsed.error));

  const { clientId, subject, body } = parsed.data;
  await db.createNotification(session.user.businessId, {
    clientId: clientId || undefined,
    type: "review_request",
    channel: "sms",
    subject,
    body,
    status: "sent",
  });
  revalidatePath("/messages");
  redirect("/messages");
}

// ---------------------------------------------------------------------------
// Payments — mark a real Invoice paid
// ---------------------------------------------------------------------------

export async function markInvoicePaidAction(formData: FormData) {
  // Financial writes: owners and front desk only.
  const session = await requireRole(["owner", "front_desk"]).catch((e) => {
    if (e instanceof AuthorizationError) failTo("/payments", e.message);
    throw e;
  });
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.setInvoiceStatus(session.user.businessId, id, "paid");
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "invoice.paid",
    entityType: "invoice",
    entityId: id,
  });
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
