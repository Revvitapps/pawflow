import { db } from "@/server/db";
import { requireSession } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBrandAction } from "../../actions";

export default async function BrandSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireSession();
  const { error, saved } = await searchParams;
  const business = await db.getBusiness(session.user.businessId);
  const brand = (business?.brand as Record<string, string> | undefined) ?? {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Brand</CardTitle>
        </CardHeader>
        <CardContent>
          {saved ? (
            <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>
          ) : null}
          {error ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <form action={updateBrandAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Display name</label>
              <Input name="businessName" defaultValue={brand.businessName ?? business?.name ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Primary color</label>
                <Input name="primaryColor" defaultValue={brand.primaryColor ?? "#79c6bf"} placeholder="#79c6bf" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Secondary color</label>
                <Input name="secondaryColor" defaultValue={brand.secondaryColor ?? "#dff3f0"} placeholder="#dff3f0" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-500">Portal headline</label>
              <Input name="portalHeadline" defaultValue={brand.portalHeadline ?? ""} placeholder="Book grooming & boarding online" />
            </div>
            <Button type="submit" size="sm" className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
              Save brand
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
