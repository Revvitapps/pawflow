import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { getBusinessById } from "@/server/tenant";
import { authMfa, roleRequiresMfa } from "@/lib/mfa";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side session check for the whole authed area. The proxy
  // is only an optimistic pre-filter; this is where access is truly enforced.
  const session = await requireSession();

  // MFA enforcement for privileged roles. An owner (or other required role) who
  // hasn't enrolled is bounced to the forced-enrollment page, which lives OUTSIDE
  // this route group so the redirect can't loop.
  if (roleRequiresMfa(session.user.role) && !(await authMfa.isEnabled(session.user.id))) {
    redirect("/enroll-mfa");
  }

  const business = await getBusinessById(session.user.businessId);

  return (
    <AppShell
      title="Daily Flow"
      description="Run grooming, boarding, reminders, and customer care from one calm mobile-first workspace."
      businessName={business?.name ?? "Your business"}
    >
      {children}
    </AppShell>
  );
}
