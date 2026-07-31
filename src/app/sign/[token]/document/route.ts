import { headers } from "next/headers";

import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";

/**
 * Streams the source PDF to a valid signer and records the first "viewed" event.
 * Token-gated inside the engine via resolveSigner — no login (the crypto-strong
 * signing token IS the auth).
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const revsign = getRevSign(await getOrigin());
  return revsign.handlers.signerDocument(token, { ip, userAgent: h.get("user-agent") });
}
