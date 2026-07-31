import { notFound } from "next/navigation";
import { CalendarDays, MessageCircleMore, PawPrint } from "lucide-react";

import { getPublicBusinessBySlug } from "@/server/tenant";

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getPublicBusinessBySlug(businessSlug);
  if (!business) notFound();

  const brand = (business.brand as Record<string, string> | undefined) ?? {};
  const primary = brand.primaryColor || "#79c6bf";
  const secondary = brand.secondaryColor || "#dff3f0";
  const headline = brand.portalHeadline || "Booking, intake, and updates for your pet — all in one place.";

  return (
    <main
      className="h-full overflow-y-auto px-4 py-10"
      style={{ background: `radial-gradient(circle at top, ${secondary} 0%, #ffffff 55%)` }}
    >
      <div className="mx-auto max-w-md text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] text-white shadow-sm"
          style={{ backgroundColor: primary }}
        >
          <PawPrint className="size-7" />
        </div>
        <h1 className="mt-5 font-heading text-3xl font-semibold text-zinc-900">{business.name}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">{headline}</p>

        <div className="mt-8 grid gap-3 text-left">
          {[
            { icon: CalendarDays, title: "Book a visit", body: "Request grooming, boarding, or daycare." },
            { icon: MessageCircleMore, title: "Messages", body: "Get reminders and pet updates." },
            { icon: PawPrint, title: "Pet records", body: "Keep vaccines and notes current." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-zinc-100 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2" style={{ backgroundColor: secondary }}>
                  <item.icon className="size-5 text-zinc-700" />
                </div>
                <div>
                  <p className="font-heading text-base font-semibold text-zinc-900">{item.title}</p>
                  <p className="text-sm text-zinc-500">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-500">
          Online booking is being set up for {business.name}. Please call or text for now.
        </p>
      </div>
    </main>
  );
}
