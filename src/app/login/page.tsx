"use client";

import { useRouter } from "next/navigation";
import { Building2, PawPrint, UserCog } from "lucide-react";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e8f7f4_0%,#fff7ef_40%,#ffffff_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[28px] bg-[#79c6bf] text-3xl text-white">
            🐾
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-zinc-400">Demo Workspace</p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-zinc-900">{workspace.organization.brand.businessName}</h1>
          <p className="mt-4 text-lg text-zinc-600">Pick a role and enter a fully interactive PawFlow prototype.</p>
        </div>
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
                  Enter Demo Workspace
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
