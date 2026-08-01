"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";
import { isAnyRateLimited, recordFailedAttempt, clientIpFromHeaders } from "@/lib/rateLimit";

async function reqMeta() {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  return { ip: ip === "unknown" ? null : ip, userAgent: h.get("user-agent"), ipRaw: ip };
}

function withError(token: string, message: string): never {
  redirect(`/sign/${token}?error=${encodeURIComponent(message)}`);
}

/** Throttle public signing attempts per token AND per source IP (20/min). The
 * checker fails closed, so a datastore outage blocks rather than opens. */
async function throttle(token: string, ip: string) {
  const ids = [`sign:token:${token}`, `sign:ip:${ip}`];
  if (await isAnyRateLimited(ids, { maxAttempts: 20, windowMs: 60_000 })) {
    withError(token, "Too many attempts — please wait a moment and try again.");
  }
  await recordFailedAttempt(ids);
}

/** Public — the signing token is the auth. */
export async function submitSignatureAction(token: string, formData: FormData) {
  const meta = await reqMeta();
  await throttle(token, meta.ipRaw);
  const revsign = getRevSign(await getOrigin());
  const res = await revsign.submitSignature(
    token,
    {
      signature: formData.get("signature"),
      signatureType: formData.get("signatureType"),
      consent: formData.get("consent") === "on",
    },
    { ip: meta.ip, userAgent: meta.userAgent },
  );
  if (!res.ok) withError(token, res.error);
  revalidatePath(`/sign/${token}`);
  redirect(`/sign/${token}`);
}

export async function declineSignatureAction(token: string, formData: FormData) {
  const meta = await reqMeta();
  await throttle(token, meta.ipRaw);
  const revsign = getRevSign(await getOrigin());
  const res = await revsign.declineSignature(
    token,
    { reason: formData.get("reason") },
    { ip: meta.ip, userAgent: meta.userAgent },
  );
  if (!res.ok) withError(token, res.error);
  revalidatePath(`/sign/${token}`);
  redirect(`/sign/${token}`);
}
