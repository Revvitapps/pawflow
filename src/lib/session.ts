import "server-only";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";

export class AuthorizationError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

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

/**
 * Least-privilege gate for privileged server actions. Verifies the session AND
 * that the caller's role is allow-listed for this operation — a valid session is
 * NOT sufficient on its own. Throws AuthorizationError (caught by the action to
 * redirect with a message) so a staff/front_desk user can never perform
 * owner-only writes by replaying a form POST.
 */
export async function requireRole(allowed: readonly UserRole[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    throw new AuthorizationError();
  }
  return session;
}

/** Non-redirecting variant for pages that render differently when signed out. */
export async function getOptionalSession() {
  return auth();
}
