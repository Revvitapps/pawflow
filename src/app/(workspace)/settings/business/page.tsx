"use client";

import { usePawFlow } from "@/components/pawflow-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BusinessSettingsPage() {
  const { workspace, updateBusinessSettings, updateService } = usePawFlow();
  const business = workspace.organization;

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border-white/80 bg-white/90">
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Business settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Contact & location</h2>
              <p className="mt-1 text-sm text-zinc-600">Edit the public business details customers and staff rely on.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <LabeledField label="Website URL">
                <Input value={business.websiteUrl || ""} onChange={(e) => updateBusinessSettings({ websiteUrl: e.target.value })} />
              </LabeledField>
              <LabeledField label="Contact email">
                <Input value={business.contactEmail || ""} onChange={(e) => updateBusinessSettings({ contactEmail: e.target.value })} />
              </LabeledField>
              <LabeledField label="Contact phone">
                <Input value={business.contactPhone || ""} onChange={(e) => updateBusinessSettings({ contactPhone: e.target.value })} />
              </LabeledField>
              <LabeledField label="Business address">
                <Input value={business.address || ""} onChange={(e) => updateBusinessSettings({ address: e.target.value })} />
              </LabeledField>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Hours & boarding capacity</h2>
              <p className="mt-1 text-sm text-zinc-600">Keep your schedule and available boarding crate count clearly defined.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <LabeledField label="Business hours">
                <Textarea value={business.hours.join("\n")} onChange={(e) => updateBusinessSettings({ hours: e.target.value.split("\n") })} />
              </LabeledField>
              <LabeledField label="Available boarding crates">
                <Input
                  type="number"
                  value={String(business.boardingCapacity)}
                  onChange={(e) => updateBusinessSettings({ boardingCapacity: Number(e.target.value) })}
                />
              </LabeledField>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Policies & AI rules</h2>
              <p className="mt-1 text-sm text-zinc-600">These settings control deposits, cancellations, vaccine requirements, and assistant behavior.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <LabeledField label="Cancellation policy">
                <Textarea value={business.cancellationPolicy} onChange={(e) => updateBusinessSettings({ cancellationPolicy: e.target.value })} />
              </LabeledField>
              <LabeledField label="Deposit policy">
                <Textarea value={business.depositPolicy} onChange={(e) => updateBusinessSettings({ depositPolicy: e.target.value })} />
              </LabeledField>
              <LabeledField label="Vaccine requirements">
                <Textarea
                  value={business.vaccineRequirements.join("\n")}
                  onChange={(e) => updateBusinessSettings({ vaccineRequirements: e.target.value.split("\n") })}
                />
              </LabeledField>
              <LabeledField label="AI guardrails">
                <Textarea value={business.aiGuardrails.join("\n")} onChange={(e) => updateBusinessSettings({ aiGuardrails: e.target.value.split("\n") })} />
              </LabeledField>
            </div>
          </section>
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">{service.category}</p>
                <div className="mt-3 grid gap-3">
                  <LabeledField label="Service name">
                    <Input value={service.name} onChange={(e) => updateService(service.id, { name: e.target.value })} />
                  </LabeledField>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <LabeledField label="Base charge">
                      <Input
                        type="number"
                        value={String(service.price)}
                        onChange={(e) => updateService(service.id, { price: Number(e.target.value) })}
                      />
                    </LabeledField>
                    <LabeledField label="Duration (minutes)">
                      <Input
                        type="number"
                        value={String(service.durationMinutes)}
                        onChange={(e) => updateService(service.id, { durationMinutes: Number(e.target.value) })}
                      />
                    </LabeledField>
                    <LabeledField label="Deposit charge">
                      <Input
                        type="number"
                        value={String(service.depositAmount)}
                        onChange={(e) => updateService(service.id, { depositAmount: Number(e.target.value) })}
                      />
                    </LabeledField>
                  </div>
                  <LabeledField label="Service description">
                    <Textarea value={service.description} onChange={(e) => updateService(service.id, { description: e.target.value })} />
                  </LabeledField>
                </div>
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

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
