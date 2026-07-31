"use client";

import Link from "next/link";
import { Bell, Home, LogOut } from "lucide-react";

import { LogoBadge } from "@/components/logo-badge";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth-actions";

const BRAND = {
  primaryColor: "#79c6bf",
  secondaryColor: "#dff3f0",
};

export function AppShell({
  title,
  description,
  businessName,
  children,
}: {
  title: string;
  description: string;
  businessName: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        background: `radial-gradient(circle at top left, ${BRAND.secondaryColor} 0%, rgba(255,255,255,0.92) 38%, #fffaf7 100%)`,
      }}
    >
      <div
        className="shrink-0 border-b border-white/70 px-4 py-3"
        style={{
          background: `linear-gradient(180deg, ${BRAND.primaryColor}14 0%, rgba(255,255,255,0.88) 100%)`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
            <LogoBadge src="/paw-flow-logo.png" alt="PawFlow logo" size={24} rounded="rounded-full" className="shadow-none" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">PawFlow</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-2 text-[11px] font-medium text-zinc-600 shadow-sm">
            <span className="truncate">{businessName}</span>
          </div>
        </div>
      </div>

      <header className="shrink-0 border-b border-white/70 bg-white/80 px-4 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <LogoBadge src="/paw-flow-logo.png" alt="PawFlow logo" size={48} rounded="rounded-[18px]" className="shrink-0" />
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Workspace</span>
                </div>
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                  <span className="truncate text-xs font-medium text-zinc-600">{businessName}</span>
                </div>
              </div>
              <h1 className="font-heading text-2xl font-semibold text-zinc-900 sm:text-3xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-600">{description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full px-3 text-xs sm:text-sm">
                <Home className="size-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline" size="icon" className="rounded-full">
                <Bell className="size-4" />
              </Button>
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="icon" className="rounded-full" aria-label="Log out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-28">{children}</main>
      <MobileNav color={BRAND.primaryColor} />
    </div>
  );
}
