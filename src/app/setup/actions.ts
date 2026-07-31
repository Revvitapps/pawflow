"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireRole, AuthorizationError } from "@/lib/session";
import { z } from "zod";

const SetupSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(160),
  boardingCapacity: z.coerce.number().int().min(0).max(10000).optional().default(0),
  primaryColor: z.string().trim().max(20).optional().default("#79c6bf"),
  secondaryColor: z.string().trim().max(20).optional().default("#dff3f0"),
  portalHeadline: z.string().trim().max(300).optional().default(""),
});

export async function completeSetupAction(formData: FormData) {
  // Initial business setup is an owner-only operation.
  const session = await requireRole(["owner"]).catch((e) => {
    if (e instanceof AuthorizationError) {
      redirect(`/setup?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  });
  const parsed = SetupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/setup?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input.")}`);
  }

  const { name, boardingCapacity, primaryColor, secondaryColor, portalHeadline } = parsed.data;
  await db.updateBusiness(session.user.businessId, {
    name,
    boardingCapacity,
    brand: { businessName: name, primaryColor, secondaryColor, portalHeadline },
  });
  await db.recordAudit(session.user.businessId, {
    actorId: session.user.id,
    action: "business.setup_completed",
    entityType: "business",
    entityId: session.user.businessId,
  });
  redirect("/dashboard");
}
