import { requireSession } from "@/lib/session";
import { ComingSoon } from "@/components/coming-soon";

export default async function ReviewsPage() {
  await requireSession();
  return (
    <ComingSoon
      title="Reviews"
      description="Collecting and replying to Google/Yelp reviews will live here. This feature has no backing data model yet, so it is gated rather than showing sample data."
    />
  );
}
