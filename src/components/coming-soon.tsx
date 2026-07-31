import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Clean placeholder for features that don't yet have a backing data model.
 * Used instead of showing fabricated demo data to a logged-in user.
 */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-2xl bg-[#f4fbfa] p-3">
          <Sparkles className="size-6 text-[#2f8f86]" />
        </div>
        <h2 className="font-heading text-xl font-semibold text-zinc-900">{title}</h2>
        <p className="max-w-sm text-sm text-zinc-500">{description}</p>
        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Coming soon
        </span>
      </CardContent>
    </Card>
  );
}
