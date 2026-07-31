import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";

/**
 * Lets a signer download the completed, fully-signed PDF (with certificate of
 * completion) from their own signing link, once the request is COMPLETED.
 * Token-gated inside the engine via resolveSigner.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const revsign = getRevSign(await getOrigin());
  return revsign.handlers.signerSigned(token);
}
