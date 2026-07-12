"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, PawPrint, Sparkles, UserCog } from "lucide-react";

import { usePawFlow } from "@/components/pawflow-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const roles = [
  { key: "owner", label: "Owner / Admin", icon: Building2, note: "See revenue, occupancy, and AI ops insights." },
  { key: "front-desk", label: "Front Desk", icon: UserCog, note: "Manage appointments, texts, and vaccine follow-up." },
  { key: "staff", label: "Groomer / Staff", icon: PawPrint, note: "Review notes, update status, and log pet care details." },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { setDemoSession, workspace } = usePawFlow();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-0 py-0 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[460px] overflow-hidden border border-white/80 bg-[rgba(255,250,247,0.94)] px-4 py-10 shadow-[0_28px_120px_rgba(61,58,57,0.14)] backdrop-blur-xl md:rounded-[40px]">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-white"
          >
            <ArrowLeft className="size-4" />
            Back to Home Screen
          </Link>
        </div>
        <div className="mb-10 text-center">
          <div className="relative mx-auto mb-5 h-20 w-20 overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
            <Image src="/paw-flow-logo.png" alt="PawFlow logo" fill className="object-contain" sizes="80px" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-zinc-400">Workspace Access</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-zinc-900 sm:text-5xl">{workspace.organization.brand.businessName}</h1>
          <p className="mt-4 text-lg text-zinc-600">Pick a role and open the workspace.</p>
        </div>
        <Card className="mb-6 rounded-[32px] border-[#dff3f0] bg-[linear-gradient(135deg,#ffffff_0%,#eef7f5_100%)] shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">New Client Setup</p>
              <h2 className="mt-2 font-heading text-3xl font-semibold text-zinc-900">Start Here</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-600">
                Set up branding, services, staff, and business details for a new workspace.
              </p>
            </div>
            <Button
              className="rounded-full bg-[#79c6bf] px-6 py-6 text-zinc-900 hover:bg-[#68b7af]"
              onClick={() => {
                setDemoSession("owner");
                router.push("/setup");
              }}
            >
              <Sparkles className="size-4" />
              Start Here
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.key} className="rounded-[32px] border-white/80 bg-white/90 shadow-[0_20px_60px_rgba(61,58,57,0.08)]">
              <CardContent className="p-6">
                <div className="mb-5 inline-flex rounded-[22px] bg-[#fff3ea] p-4">
                  <role.icon className="size-6 text-zinc-700" />
                </div>
                <h2 className="font-heading text-2xl font-semibold text-zinc-900">{role.label}</h2>
                <p className="mt-3 min-h-16 text-sm leading-6 text-zinc-600">{role.note}</p>
                <Button
                  className="mt-6 w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() => {
                    setDemoSession(role.key);
                    router.push("/dashboard");
                  }}
                >
                  Start Here
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
