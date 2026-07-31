import Link from "next/link";

import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeSetupAction } from "./actions";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const { error } = await searchParams;
  const business = await db.getBusiness(session.user.businessId);
  const brand = (business?.brand as Record<string, string> | undefined) ?? {};

  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-4 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.32em] text-zinc-400">Set up your workspace</p>
        <h1 className="mt-2 text-center font-heading text-3xl font-semibold text-zinc-900">Finish your profile</h1>
        <p className="mt-2 text-center text-sm text-zinc-600">
          These details power your dashboard, boarding capacity, and customer portal.
        </p>

        <Card className="mt-6 rounded-[28px] border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
          <CardHeader>
            <CardTitle>Business details</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            ) : null}
            <form action={completeSetupAction} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Business name</label>
                <Input name="name" defaultValue={business?.name ?? ""} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Boarding capacity</label>
                <Input name="boardingCapacity" type="number" min="0" defaultValue={business?.boardingCapacity ?? 0} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Primary color</label>
                  <Input name="primaryColor" defaultValue={brand.primaryColor ?? "#79c6bf"} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Secondary color</label>
                  <Input name="secondaryColor" defaultValue={brand.secondaryColor ?? "#dff3f0"} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Portal headline</label>
                <Input name="portalHeadline" defaultValue={brand.portalHeadline ?? ""} placeholder="Book grooming & boarding online" />
              </div>
              <Button type="submit" className="w-full rounded-full bg-[#79c6bf] py-6 text-zinc-900 hover:bg-[#68b7af]">
                Save and go to dashboard
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Link href="/dashboard" className="text-sm text-zinc-500 underline underline-offset-4">
            Skip for now
          </Link>
        </div>
      </div>
    </main>
  );
}
