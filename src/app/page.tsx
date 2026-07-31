import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOptionalSession } from "@/lib/session";

const featureChips = [
  "AI receptionist",
  "Mobile scheduling",
  "Pet + owner CRM",
  "Boarding readiness",
];

export default async function HomePage() {
  const session = await getOptionalSession();
  if (session?.user?.businessId) redirect("/dashboard");

  return (
    <main className="relative h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,#d7f2ee_0%,transparent_35%),radial-gradient(circle_at_top_right,#ffdbe6_0%,transparent_28%),linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] px-4 py-5 text-zinc-900">
      <header className="flex items-center justify-between gap-3 rounded-[26px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_15px_60px_rgba(61,58,57,0.06)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-white shadow-sm">
            <Image src="/paw-flow-logo.png" alt="PawFlow logo" fill className="object-contain" sizes="40px" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold">PawFlow</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Pet-Care Operating System</p>
          </div>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm" className="rounded-full">
            Log in
          </Button>
        </Link>
      </header>

      <div className="mt-5 rounded-[30px] border border-white/80 bg-white/80 p-5 shadow-[0_18px_70px_rgba(61,58,57,0.07)]">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f4fbfa] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          <Bot className="size-3.5" />
          Mobile-first
        </div>
        <h1 className="mt-4 font-heading text-[2rem] leading-[1.05] font-semibold text-zinc-900">
          PawFlow runs a pet-care business like an app, not a spreadsheet.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Grooming, boarding, customer communication, intake, and AI front-desk help in one compact workflow built for phone-sized use.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {featureChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-[#ebe2da] bg-[#fffaf6] px-3 py-1.5 text-[11px] font-medium text-zinc-600"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <Link href="/signup" className="flex-1">
            <Button className="h-11 w-full rounded-full bg-zinc-900 text-white hover:bg-zinc-800">
              Create your business
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link href="/login" className="flex-1">
            <Button variant="outline" className="h-11 w-full rounded-full">
              Log in
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/70 bg-[linear-gradient(135deg,#3d3a39_0%,#57514e_100%)] px-4 py-4 text-white shadow-[0_18px_70px_rgba(61,58,57,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">One workspace per business</p>
        <p className="mt-2 text-sm leading-6 text-white/80">
          Every business gets its own secure, tenant-isolated workspace. Sign up as the owner, then invite your team.
        </p>
      </div>
    </main>
  );
}
