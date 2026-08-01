"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { db } from "@/server/db";
import { getRevSign, type StaffContext } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";

const NEW_PATH = "/signatures/new";

// Staff who can send documents for signature. pet_parent (a client-facing role)
// is deliberately excluded — sending intake/consent/vaccine forms is a staff op.
const SIGN_ROLES = ["owner", "front_desk", "staff"] as const;

/** Resolves the caller's session into the engine's StaffContext, carrying the
 * businessId as the opaque tenantId and the business name as the issuing party. */
async function staffCtx(): Promise<{ ctx: StaffContext; businessId: string }> {
  const session = await requireRole(SIGN_ROLES);
  const businessId = session.user.businessId;
  const business = await db.getBusiness(businessId);
  return {
    businessId,
    ctx: {
      tenantId: businessId,
      userId: session.user.id,
      tenantName: business?.name ?? "PawFlow",
    },
  };
}

function withError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** Collects the repeated signerName/signerEmail fields, dropping empty rows. */
function parseSigners(formData: FormData) {
  const names = formData.getAll("signerName").map(String);
  const emails = formData.getAll("signerEmail").map(String);
  const rows: { name: string; email: string }[] = [];
  for (let i = 0; i < Math.max(names.length, emails.length); i++) {
    const name = (names[i] ?? "").trim();
    const email = (emails[i] ?? "").trim();
    if (name === "" && email === "") continue;
    rows.push({ name, email });
  }
  return rows;
}

export async function createSignatureRequestAction(formData: FormData) {
  const { ctx } = await staffCtx();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    withError(NEW_PATH, "Attach the PDF you need signed.");
  }

  // Link the request to whatever host object it's for (a client / pet /
  // reservation id). Kept opaque to the engine via `linkedRef`.
  const linkTo = String(formData.get("linkedRef") ?? "").trim();
  const linkedRef = linkTo && linkTo !== "none" ? linkTo : undefined;

  const revsign = getRevSign(await getOrigin());
  const res = await revsign.createRequest(ctx, {
    title: String(formData.get("title") ?? ""),
    message: String(formData.get("message") ?? "") || undefined,
    linkedRef,
    signers: parseSigners(formData),
    pdf: {
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename: file.name || "document.pdf",
      size: file.size,
      type: file.type,
    },
  });
  if (!res.ok) withError(NEW_PATH, res.error);

  revalidatePath("/signatures");
  redirect(`/signatures/${res.requestId}`);
}

export async function voidSignatureRequestAction(requestId: string, formData: FormData) {
  const { ctx } = await staffCtx();
  const revsign = getRevSign(await getOrigin());
  const res = await revsign.voidRequest(ctx, requestId, String(formData.get("reason") ?? "") || null);
  if (!res.ok) withError(`/signatures/${requestId}`, res.error);
  revalidatePath(`/signatures/${requestId}`);
  redirect(`/signatures/${requestId}`);
}

export async function resendSignerAction(requestId: string, signerId: string) {
  const { ctx } = await staffCtx();
  const revsign = getRevSign(await getOrigin());
  const res = await revsign.resendSigner(ctx, requestId, signerId);
  if (!res.ok) withError(`/signatures/${requestId}`, res.error);
  revalidatePath(`/signatures/${requestId}`);
  redirect(`/signatures/${requestId}`);
}
