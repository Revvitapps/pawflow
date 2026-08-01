import { requireSession } from "@/lib/session";
import { getRevSign } from "@/lib/revsign";
import { getOrigin } from "@/lib/origin";

/**
 * Staff download of a signature request's PDF. `?type=signed` returns the
 * finished signed document (once completed); anything else returns the source.
 * Tenant-scoped inside the engine via the injected StaffContext (businessId) —
 * a request that belongs to another tenant resolves to a 404 there.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await ctx.params;
  const wantSigned = new URL(req.url).searchParams.get("type") === "signed";
  const revsign = getRevSign(await getOrigin());
  return revsign.handlers.staffDocument(
    { tenantId: session.user.businessId, userId: session.user.id },
    id,
    { signed: wantSigned },
  );
}
