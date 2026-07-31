import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { getBusinessById } from "@/server/tenant";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side session check for the whole authed area. The proxy
  // is only an optimistic pre-filter; this is where access is truly enforced.
  const session = await requireSession();
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
