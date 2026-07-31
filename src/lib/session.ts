import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Full session verification for a protected page or server action. This is the
 * authoritative check (the proxy is only an optimistic pre-filter). Redirects to
 * /login when there is no valid session.
 *
 * Returns the session with a guaranteed `user.businessId` — the tenant every
 * db.ts call must be scoped to.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/login");
  return session;
}

/** Non-redirecting variant for pages that render differently when signed out. */
export async function getOptionalSession() {
  return auth();
}
