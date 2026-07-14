"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Globe, Sparkles } from "lucide-react";

import { usePawFlow } from "@/components/pawflow-provider";
import { BrandPreview } from "@/components/pawflow-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WebsiteBrandIntake } from "@/lib/types";

const stepLabels = ["Business", "Services", "Staff", "Policies", "Go live"];

const starterServices = [
  { name: "Full Groom", category: "grooming", durationMinutes: 120, price: 95, depositAmount: 25 },
  { name: "Bath + Tidy", category: "grooming", durationMinutes: 75, price: 65, depositAmount: 0 },
  { name: "Overnight Boarding", category: "boarding", durationMinutes: 1440, price: 70, depositAmount: 50 },
];

export default function SetupPage() {
  const router = useRouter();
  const { setDemoSession, startBusinessSetup } = usePawFlow();
  const [step, setStep] = useState(0);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [form, setForm] = useState({
    websiteUrl: "",
    businessName: "",
    businessSlug: "",
    logoUrl: "",
    portalHeadline: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    primaryColor: "#79c6bf",
    secondaryColor: "#fff5ef",
    accentColor: "#f2b7c6",
    hours: "Mon-Fri: 8:00 AM - 6:00 PM\nSat: 8:00 AM - 3:00 PM",
    boardingCapacity: "12",
    cancellationPolicy: "Please give 24-48 hours notice for cancellations.",
    depositPolicy: "Deposits required for first visits, larger grooms, and holiday boarding.",
    vaccineRequirements: "Rabies\nBordetella\nDHPP",
    aiGuardrails: "Do not make medical claims.\nAsk for vaccine records for boarding/daycare.",
    service1Name: starterServices[0].name,
    service1Price: String(starterServices[0].price),
    service1Duration: String(starterServices[0].durationMinutes),
    service2Name: starterServices[1].name,
    service2Price: String(starterServices[1].price),
    service2Duration: String(starterServices[1].durationMinutes),
    service3Name: starterServices[2].name,
    service3Price: String(starterServices[2].price),
    service3Duration: String(starterServices[2].durationMinutes),
    ownerName: "",
    groomerName: "",
    frontDeskName: "",
  });

  const updateField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const pullFromWebsite = async () => {
    setWebsiteError("");
    setWebsiteLoading(true);

    try {
      const response = await fetch("/api/brand-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.websiteUrl }),
      });

      const data = (await response.json()) as WebsiteBrandIntake & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not pull website details.");
      }

      setForm((current) => ({
        ...current,
        websiteUrl: data.normalizedUrl || current.websiteUrl,
        businessName: data.businessName || current.businessName,
        businessSlug: data.businessSlug || current.businessSlug,
        logoUrl: data.logoUrl || data.logos?.[0] || current.logoUrl,
        portalHeadline: data.description || current.portalHeadline,
        contactEmail: data.emails?.[0] || current.contactEmail,
        contactPhone: data.phones?.[0] || current.contactPhone,
        address: data.addresses?.[0] || current.address,
        primaryColor: data.primaryColor || current.primaryColor,
        hours: data.hours?.length ? data.hours.join("\n") : current.hours,
        service1Name: data.services?.[0] || current.service1Name,
        service2Name: data.services?.[1] || current.service2Name,
        service3Name: data.services?.[2] || current.service3Name,
      }));
    } catch (error) {
      setWebsiteError(error instanceof Error ? error.message : "Could not pull website details.");
    } finally {
      setWebsiteLoading(false);
    }
  };

  return (
    <main className="h-full space-y-6 overflow-y-auto bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_45%,#ffffff_100%)] px-4 py-8">
      <div className="flex flex-col items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-zinc-400">Start Here</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold text-zinc-900 sm:text-5xl">Set up your own grooming business</h1>
          <p className="mt-3 max-w-3xl text-lg text-zinc-600">
            Build your branded workspace, add services and staff, and get your customer-facing portal ready to share.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => router.push("/login")}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6">
          <Card className="rounded-[32px] border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Onboarding steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {stepLabels.map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-[22px] px-3 py-3 text-center text-sm font-medium ${
                      index === step ? "bg-zinc-900 text-white" : index < step ? "bg-[#dff3f0] text-zinc-800" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {step === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#dff3f0] bg-[#f7fffd] p-4">
                    <p className="text-sm font-semibold text-zinc-800">Pull brand info from a website</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      Paste a business URL and PawFlow will try to prefill the business name, logo, and public-facing intro before you finish setup.
                    </p>
                    <div className="mt-3 flex flex-col gap-3 md:flex-row">
                      <Input
                        placeholder="Website URL"
                        value={form.websiteUrl}
                        onChange={(e) => updateField("websiteUrl", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={pullFromWebsite}
                        disabled={!form.websiteUrl.trim() || websiteLoading}
                      >
                        <Globe className="size-4" />
                        {websiteLoading ? "Pulling..." : "Pull from Website"}
                      </Button>
                    </div>
                    {websiteError ? <p className="mt-3 text-sm text-rose-600">{websiteError}</p> : null}
                  </div>
                  <LabeledField label="Business name">
                    <Input value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Business slug">
                    <Input
                      value={form.businessSlug}
                      onChange={(e) => updateField("businessSlug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    />
                  </LabeledField>
                  <LabeledField label="Logo URL">
                    <Input value={form.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} />
                  </LabeledField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledField label="Contact email">
                      <Input value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} />
                    </LabeledField>
                    <LabeledField label="Contact phone">
                      <Input value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} />
                    </LabeledField>
                  </div>
                  <LabeledField label="Business address">
                    <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Portal headline">
                    <Textarea value={form.portalHeadline} onChange={(e) => updateField("portalHeadline", e.target.value)} />
                  </LabeledField>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <LabeledField label="Primary color">
                      <Input type="color" value={form.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} />
                    </LabeledField>
                    <LabeledField label="Secondary color">
                      <Input type="color" value={form.secondaryColor} onChange={(e) => updateField("secondaryColor", e.target.value)} />
                    </LabeledField>
                    <LabeledField label="Accent color">
                      <Input type="color" value={form.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} />
                    </LabeledField>
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Service name</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Base charge</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Duration (minutes)</p>
                  </div>
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-zinc-600">Service 1</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <LabeledField label="Service name">
                        <Input value={form.service1Name} onChange={(e) => updateField("service1Name", e.target.value)} />
                      </LabeledField>
                      <LabeledField label="Base charge">
                        <Input type="number" value={form.service1Price} onChange={(e) => updateField("service1Price", e.target.value)} />
                      </LabeledField>
                      <LabeledField label="Duration (minutes)">
                        <Input type="number" value={form.service1Duration} onChange={(e) => updateField("service1Duration", e.target.value)} />
                      </LabeledField>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-zinc-600">Service 2</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <LabeledField label="Service name">
                        <Input value={form.service2Name} onChange={(e) => updateField("service2Name", e.target.value)} />
                      </LabeledField>
                      <LabeledField label="Base charge">
                        <Input type="number" value={form.service2Price} onChange={(e) => updateField("service2Price", e.target.value)} />
                      </LabeledField>
                      <LabeledField label="Duration (minutes)">
                        <Input type="number" value={form.service2Duration} onChange={(e) => updateField("service2Duration", e.target.value)} />
                      </LabeledField>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-zinc-600">Service 3</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <LabeledField label="Service name">
                        <Input value={form.service3Name} onChange={(e) => updateField("service3Name", e.target.value)} />
                      </LabeledField>
                      <LabeledField label="Base charge">
                        <Input type="number" value={form.service3Price} onChange={(e) => updateField("service3Price", e.target.value)} />
                      </LabeledField>
                      <LabeledField label="Duration (minutes)">
                        <Input type="number" value={form.service3Duration} onChange={(e) => updateField("service3Duration", e.target.value)} />
                      </LabeledField>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <LabeledField label="Owner / admin name">
                    <Input value={form.ownerName} onChange={(e) => updateField("ownerName", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Lead groomer name">
                    <Input value={form.groomerName} onChange={(e) => updateField("groomerName", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Front desk / scheduler name">
                    <Input value={form.frontDeskName} onChange={(e) => updateField("frontDeskName", e.target.value)} />
                  </LabeledField>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <LabeledField label="Business hours">
                    <Textarea value={form.hours} onChange={(e) => updateField("hours", e.target.value)} placeholder="One line per day pattern" />
                  </LabeledField>
                  <LabeledField label="Available boarding crates">
                    <Input type="number" value={form.boardingCapacity} onChange={(e) => updateField("boardingCapacity", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Cancellation policy">
                    <Textarea value={form.cancellationPolicy} onChange={(e) => updateField("cancellationPolicy", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Deposit policy">
                    <Textarea value={form.depositPolicy} onChange={(e) => updateField("depositPolicy", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="Vaccine requirements">
                    <Textarea value={form.vaccineRequirements} onChange={(e) => updateField("vaccineRequirements", e.target.value)} />
                  </LabeledField>
                  <LabeledField label="AI guardrails">
                    <Textarea value={form.aiGuardrails} onChange={(e) => updateField("aiGuardrails", e.target.value)} />
                  </LabeledField>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4 rounded-[28px] bg-zinc-50 p-5">
                  <div className="inline-flex rounded-full bg-[#dff3f0] px-3 py-1 text-xs font-semibold text-zinc-700">
                    <Sparkles className="mr-2 size-4" />
                    Ready to launch your workspace
                  </div>
                  <p className="text-sm leading-7 text-zinc-700">
                    This will create a branded workspace with services, staff, business settings, and a customer portal tailored to the business.
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" className="rounded-full" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
                  Back
                </Button>
                {step < 4 ? (
                  <Button className="rounded-full" onClick={() => setStep((current) => Math.min(4, current + 1))}>
                    Next step
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    className="rounded-full"
                    onClick={() => {
                      setDemoSession("owner");
                      startBusinessSetup({
                        businessName: form.businessName || "My Grooming Business",
                        businessSlug: form.businessSlug || "my-grooming-business",
                        logoUrl: form.logoUrl,
                        portalHeadline: form.portalHeadline,
                        websiteUrl: form.websiteUrl,
                        contactEmail: form.contactEmail,
                        contactPhone: form.contactPhone,
                        address: form.address,
                        primaryColor: form.primaryColor,
                        secondaryColor: form.secondaryColor,
                        accentColor: form.accentColor,
                        hours: form.hours.split("\n").filter(Boolean),
                        boardingCapacity: Number(form.boardingCapacity) || 0,
                        cancellationPolicy: form.cancellationPolicy,
                        depositPolicy: form.depositPolicy,
                        vaccineRequirements: form.vaccineRequirements.split("\n").filter(Boolean),
                        aiGuardrails: form.aiGuardrails.split("\n").filter(Boolean),
                        services: [
                          {
                            name: form.service1Name,
                            category: "grooming",
                            durationMinutes: Number(form.service1Duration) || 120,
                            price: Number(form.service1Price) || 95,
                            depositAmount: 25,
                          },
                          {
                            name: form.service2Name,
                            category: "grooming",
                            durationMinutes: Number(form.service2Duration) || 75,
                            price: Number(form.service2Price) || 65,
                            depositAmount: 0,
                          },
                          {
                            name: form.service3Name,
                            category: "boarding",
                            durationMinutes: Number(form.service3Duration) || 1440,
                            price: Number(form.service3Price) || 70,
                            depositAmount: 50,
                          },
                        ],
                        staff: [
                          { name: form.ownerName || "Owner", roleLabel: "Owner / Admin", specialty: "Business operations" },
                          { name: form.groomerName || "Lead Groomer", roleLabel: "Lead Groomer", specialty: "Styling and care" },
                          { name: form.frontDeskName || "Front Desk", roleLabel: "Front Desk", specialty: "Scheduling and customer care" },
                        ],
                        socialLinks: [],
                      });
                      router.push("/dashboard");
                    }}
                  >
                    Create my workspace
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <BrandPreview
            businessName={form.businessName || "Your Business Preview"}
            logoUrl={form.logoUrl || undefined}
            primaryColor={form.primaryColor}
            secondaryColor={form.secondaryColor}
            accentColor={form.accentColor}
            poweredByPawFlow
          />
      </div>
    </main>
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
