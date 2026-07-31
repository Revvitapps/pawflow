import { z } from "zod";

/** Shared input validation for the real write paths. Money is entered in
 *  dollars in the UI and converted to integer cents at the action boundary. */

export const ClientCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const ClientUpdateSchema = ClientCreateSchema.partial().extend({
  id: z.string().min(1),
});

export const PetCreateSchema = z.object({
  clientId: z.string().min(1, "Owner is required"),
  name: z.string().trim().min(1, "Name is required").max(120),
  breed: z.string().trim().max(120).optional().default(""),
  age: z.string().trim().max(40).optional().default(""),
  weight: z.string().trim().max(40).optional().default(""),
  allergies: z.string().trim().max(400).optional().default(""),
  cutPreferences: z.string().trim().max(400).optional().default(""),
});

export const PetUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  breed: z.string().trim().max(120).optional().default(""),
  age: z.string().trim().max(40).optional().default(""),
  weight: z.string().trim().max(40).optional().default(""),
  allergies: z.string().trim().max(400).optional().default(""),
  cutPreferences: z.string().trim().max(400).optional().default(""),
});

export const AppointmentCreateSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  petId: z.string().min(1, "Pet is required"),
  serviceId: z.string().optional().default(""),
  staffId: z.string().optional().default(""),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  priceDollars: z.coerce.number().min(0).max(100000).optional().default(0),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const ReservationCreateSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  petId: z.string().min(1, "Pet is required"),
  kind: z.enum(["boarding", "daycare"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  feedingNotes: z.string().trim().max(2000).optional().default(""),
  medicationNotes: z.string().trim().max(2000).optional().default(""),
});

export const BusinessSettingsSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(160),
  timezone: z.string().trim().max(80).optional().default(""),
  boardingCapacity: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

export const BrandSettingsSchema = z.object({
  businessName: z.string().trim().max(160).optional().default(""),
  primaryColor: z.string().trim().max(20).optional().default(""),
  secondaryColor: z.string().trim().max(20).optional().default(""),
  portalHeadline: z.string().trim().max(300).optional().default(""),
});

export const MessageCreateSchema = z.object({
  clientId: z.string().optional().default(""),
  subject: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().min(1, "Message is required").max(2000),
});

/** A second-factor code: a 6-digit TOTP or an alphanumeric backup code. Kept
 *  permissive on characters (backup codes may contain letters/dashes) but
 *  length-bounded so it can never be an oversized payload. */
export const MfaCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter your authentication code.").max(64),
});

/** Returns the first zod issue message, for surfacing in a redirect query. */
export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input.";
}
