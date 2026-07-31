import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

export default async function AutomationsPage() {
  await requireSession();
  return (
    <ComingSoon
      title="Automations"
      description="Reminder, reactivation, and review-request automations will be configured here once their scheduling model is in place."
    />
  );
}
