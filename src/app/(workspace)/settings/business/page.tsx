"use client";

import { usePawFlow } from "@/components/pawflow-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BusinessSettingsPage() {
  const { workspace, updateBusinessSettings } = usePawFlow();
  const business = workspace.organization;

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Business settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Textarea value={business.hours.join("\n")} onChange={(e) => updateBusinessSettings({ hours: e.target.value.split("\n") })} />
          <Input type="number" value={String(business.boardingCapacity)} onChange={(e) => updateBusinessSettings({ boardingCapacity: Number(e.target.value) })} />
          <Textarea value={business.cancellationPolicy} onChange={(e) => updateBusinessSettings({ cancellationPolicy: e.target.value })} />
          <Textarea value={business.depositPolicy} onChange={(e) => updateBusinessSettings({ depositPolicy: e.target.value })} />
          <Textarea value={business.vaccineRequirements.join("\n")} onChange={(e) => updateBusinessSettings({ vaccineRequirements: e.target.value.split("\n") })} />
          <Textarea value={business.aiGuardrails.join("\n")} onChange={(e) => updateBusinessSettings({ aiGuardrails: e.target.value.split("\n") })} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Services & pricing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.services.map((service) => (
              <div key={service.id} className="rounded-[24px] bg-zinc-50 p-4">
                <p className="font-medium text-zinc-900">{service.name}</p>
                <p className="text-sm text-zinc-600">{service.description}</p>
                <p className="mt-2 text-sm text-zinc-700">${service.price} · {service.durationMinutes} min · deposit ${service.depositAmount}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-white/80 bg-white/90">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Staff</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.staff.map((staff) => (
              <div key={staff.id} className="rounded-[24px] bg-zinc-50 p-4">
                <p className="font-medium text-zinc-900">{staff.name}</p>
                <p className="text-sm text-zinc-600">{staff.roleLabel} · {staff.specialty}</p>
                <p className="mt-2 text-sm text-zinc-700">{staff.phone}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
