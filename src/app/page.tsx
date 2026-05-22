import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  HeartHandshake,
  MessageCircleMore,
  PawPrint,
  PhoneMissed,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  "Mobile-first scheduling for grooming and boarding",
  "AI receptionist for missed calls, pricing, and intake",
  "Customer + pet records with same-as-last-time memory",
  "Vaccine tracking, reminders, and boarding readiness",
  "Messages, reviews, reactivation, and deposit workflows",
];

export default function HomePage() {
  const painPoints = [
    { copy: "Missed calls become lost revenue", icon: PhoneMissed },
    { copy: "Vaccines live in email threads and screenshots", icon: ShieldCheck },
    { copy: "Same as last time only exists in someone's head", icon: PawPrint },
    { copy: "No-show follow-up and rebooking happen too late", icon: CalendarDays },
  ];

  return (
    <main className="overflow-hidden bg-[#fffaf6] text-zinc-900">
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#d7f2ee_0%,transparent_35%),radial-gradient(circle_at_top_right,#ffdbe6_0%,transparent_28%),linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-8">
          <header className="flex items-center justify-between rounded-full border border-white/80 bg-white/80 px-5 py-3 shadow-[0_15px_60px_rgba(61,58,57,0.06)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-white shadow-sm">
                <Image src="/paw-flow-logo.png" alt="PawFlow logo" fill className="object-contain" sizes="44px" />
              </div>
              <div>
                <p className="font-heading text-xl font-semibold">PawFlow</p>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Pet-Care Operating System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" className="rounded-full">Start Here</Button>
              </Link>
              <Link href="/dashboard">
                <Button className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800">
                  Enter Demo Workspace
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </header>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
            <div>
              <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm">
                Modern pet boutique meets practical operations software
              </div>
              <h1 className="mt-6 max-w-3xl font-heading text-5xl font-semibold leading-tight md:text-7xl">
                PawFlow helps grooming and boarding businesses stop running on notebooks, missed calls, texts, sticky notes, and memory.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
                One playful, trustworthy workspace for grooming, boarding, daycare, customer messaging, white-label portals, and AI-powered front-desk help.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button className="rounded-full bg-[#3d3a39] px-6 py-6 text-base text-white hover:bg-[#2d2a29]">
                    Explore the Workspace
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/portal/zion-and-co-grooming-lodge">
                  <Button variant="outline" className="rounded-full px-6 py-6 text-base">Open Customer Portal</Button>
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature} className="rounded-[24px] border border-white/80 bg-white/75 px-4 py-4 text-sm text-zinc-700 shadow-sm">
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-10 hidden rounded-[28px] bg-white/90 p-4 shadow-xl md:block">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">Missed Call Rescue</p>
                <p className="mt-2 text-sm text-zinc-700">AI text-back sent in 13 sec</p>
              </div>
              <div className="rounded-[36px] border border-white/80 bg-white/85 p-5 shadow-[0_30px_100px_rgba(61,58,57,0.10)] backdrop-blur">
                <div className="rounded-[30px] bg-[linear-gradient(180deg,#fff7ee_0%,#ffffff_100%)] p-5">
                  <div className="grid gap-4">
                    <div className="rounded-[24px] bg-[#79c6bf]/20 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700">
                        <Sparkles className="size-4" />
                        AI Summary of Today
                      </div>
                      <p className="text-sm leading-6 text-zinc-700">
                        Three grooms before lunch, one vaccine issue to resolve, two rebooking opportunities, and a ready-for-pickup text queued for Zion.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[24px] bg-white p-4 shadow-sm">
                        <p className="text-sm text-zinc-500">Boarding Occupancy</p>
                        <p className="mt-2 text-3xl font-semibold">11 / 18</p>
                      </div>
                      <div className="rounded-[24px] bg-white p-4 shadow-sm">
                        <p className="text-sm text-zinc-500">Vaccine Watch</p>
                        <p className="mt-2 text-3xl font-semibold">4</p>
                      </div>
                    </div>
                    <div className="rounded-[24px] bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">Ready to Wag</p>
                          <p className="text-sm text-zinc-500">Zion is ready for pickup</p>
                        </div>
                        <MessageCircleMore className="size-5 text-[#79c6bf]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-zinc-400">The Problem</p>
          <h2 className="mt-3 font-heading text-4xl font-semibold">Pet-care teams lose time in the cracks between calls, clipboards, and memory.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {painPoints.map((item) => (
            <div key={item.copy} className="rounded-[28px] border border-[#f4e9e1] bg-white p-6 shadow-[0_16px_50px_rgba(61,58,57,0.05)]">
              <div className="mb-4 inline-flex rounded-2xl bg-[#fff2ea] p-3">
                <item.icon className="size-5 text-zinc-700" />
              </div>
              <p className="text-lg font-medium leading-7 text-zinc-800">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: "AI receptionist",
              body: "Handles missed calls, pricing questions, boarding availability, and intake collection from the first day.",
              icon: Bot,
            },
            {
              title: "Grooming + boarding together",
              body: "One shared customer timeline for services, notes, vaccines, boarding stays, deposits, and follow-up.",
              icon: HeartHandshake,
            },
            {
              title: "White-label customer portal",
              body: "A branded booking and messaging experience that feels like your business, not generic software.",
              icon: Star,
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f2_100%)] p-6 shadow-[0_20px_60px_rgba(61,58,57,0.06)]">
              <div className="mb-4 inline-flex rounded-2xl bg-[#dff3f0] p-3">
                <item.icon className="size-5 text-zinc-700" />
              </div>
              <h3 className="font-heading text-2xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="rounded-[40px] bg-[#3d3a39] px-6 py-10 text-white md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-white/50">Pricing Preview</p>
              <h2 className="mt-3 font-heading text-4xl font-semibold">Start with the essentials. Grow into your branded ops stack.</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/70">
                Built for Vercel deployment, AI-ready from the start, and structured for real Supabase + Twilio + payments when you&apos;re ready.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[30px] bg-white/10 p-5">
                <p className="text-sm text-white/60">Starter</p>
                <p className="mt-2 text-4xl font-semibold">$99</p>
                <p className="mt-2 text-sm text-white/70">Core scheduling, CRM, portal, and AI receptionist basics.</p>
              </div>
              <div className="rounded-[30px] bg-white p-5 text-zinc-900">
                <p className="text-sm text-zinc-500">Growth</p>
                <p className="mt-2 text-4xl font-semibold">$249</p>
                <p className="mt-2 text-sm text-zinc-600">Automations, boarding workflows, reactivation, and brand customization.</p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login">
              <Button className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#67b6af]">Get started</Button>
            </Link>
            <Link href="/portal/zion-and-co-grooming-lodge">
              <Button variant="outline" className="rounded-full border-white/30 bg-transparent text-white hover:bg-white/10">
                See the portal
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
