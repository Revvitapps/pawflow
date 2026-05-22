"use client";

import { usePawFlow } from "@/components/pawflow-provider";
import { BrandPreview } from "@/components/pawflow-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function BrandSettingsPage() {
  const { workspace, updateBrandSettings } = usePawFlow();
  const brand = workspace.organization.brand;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">White-label brand settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={brand.businessName} onChange={(e) => updateBrandSettings({ businessName: e.target.value })} placeholder="Business name" />
          <Input value={brand.logoUrl || ""} onChange={(e) => updateBrandSettings({ logoUrl: e.target.value })} placeholder="Upload logo placeholder URL" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input type="color" value={brand.primaryColor} onChange={(e) => updateBrandSettings({ primaryColor: e.target.value })} />
            <Input type="color" value={brand.secondaryColor} onChange={(e) => updateBrandSettings({ secondaryColor: e.target.value })} />
            <Input type="color" value={brand.accentColor} onChange={(e) => updateBrandSettings({ accentColor: e.target.value })} />
            <Input value={brand.roundedScale} onChange={(e) => updateBrandSettings({ roundedScale: e.target.value })} placeholder="Rounded preview" />
          </div>
          <Input value={brand.portalHeadline} onChange={(e) => updateBrandSettings({ portalHeadline: e.target.value })} placeholder="Portal headline" />
          <Input value={brand.notificationSignature} onChange={(e) => updateBrandSettings({ notificationSignature: e.target.value })} placeholder="Notification template branding" />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={brand.poweredByPawFlow}
              onChange={(e) => updateBrandSettings({ poweredByPawFlow: e.target.checked })}
            />
            Powered by PawFlow
          </label>
          <div className="rounded-[24px] bg-zinc-50 p-4 text-sm text-zinc-600">
            Portal URL preview: /portal/{brand.businessSlug}
          </div>
        </CardContent>
      </Card>
      <BrandPreview
        businessName={brand.businessName}
        primaryColor={brand.primaryColor}
        secondaryColor={brand.secondaryColor}
        accentColor={brand.accentColor}
        poweredByPawFlow={brand.poweredByPawFlow}
      />
    </div>
  );
}
