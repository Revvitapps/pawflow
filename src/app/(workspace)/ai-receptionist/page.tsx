import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

export default async function AiReceptionistPage() {
  await requireSession();
  return (
    <ComingSoon
      title="AI Receptionist"
      description="The capped Claude-powered receptionist (missed-call text-back, intake summaries) is being wired to live call/intake data. Until then this screen is gated instead of running on demo data."
    />
  );
}
