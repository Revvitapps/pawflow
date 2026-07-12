"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Bell, Home, LogOut, RotateCcw, Sparkles } from "lucide-react";

import { LogoBadge } from "@/components/logo-badge";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { usePawFlow } from "@/components/pawflow-provider";

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { workspace, session, logoutDemoSession, resetWorkspace, hydrated } = usePawFlow();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !session.isDemoLoggedIn && pathname !== "/login") {
      router.replace("/login");
    }
  }, [hydrated, pathname, router, session.isDemoLoggedIn]);

  const colors = workspace.organization.brand;
  const workspaceLogoUrl =
    workspace.organization.workspaceMode === "demo" ? "/Zion -Groom-Lodge.png" : workspace.organization.brand.logoUrl;

  return (
    <div
      className="min-h-screen px-0 py-0 md:px-6 md:py-8"
      style={{
        background: `radial-gradient(circle at top left, ${colors.secondaryColor} 0%, rgba(255,255,255,0.92) 38%, #fffaf7 100%)`,
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col overflow-hidden border border-white/80 bg-[rgba(255,250,247,0.92)] shadow-[0_28px_120px_rgba(61,58,57,0.14)] backdrop-blur-xl md:min-h-[calc(100vh-4rem)] md:rounded-[40px]">
        <div
          className="border-b border-white/70 px-4 py-3"
          style={{
            background: `linear-gradient(180deg, ${colors.primaryColor}14 0%, rgba(255,255,255,0.88) 100%)`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 shadow-sm">
              <LogoBadge src="/paw-flow-logo.png" alt="PawFlow logo" size={24} rounded="rounded-full" className="shadow-none" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">PawFlow Demo</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-2 text-[11px] font-medium text-zinc-600 shadow-sm">
              {workspaceLogoUrl ? (
                <LogoBadge
                  src={workspaceLogoUrl}
                  alt={`${workspace.organization.brand.businessName} logo`}
                  size={18}
                  rounded="rounded-full"
                  className="shadow-none"
                />
              ) : null}
              <span className="truncate">{workspace.organization.brand.businessName}</span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col pb-28">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 px-4 py-4 backdrop-blur-xl">
            <div className="flex flex-col gap-4">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <LogoBadge src="/paw-flow-logo.png" alt="PawFlow logo" size={48} rounded="rounded-[18px]" className="shrink-0" />
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Workspace</span>
                    </div>
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                      {workspaceLogoUrl ? (
                        <LogoBadge
                          src={workspaceLogoUrl}
                          alt={`${workspace.organization.brand.businessName} logo`}
                          size={22}
                          rounded="rounded-full"
                          className="shadow-none"
                        />
                      ) : null}
                      <span className="truncate text-xs font-medium text-zinc-600">{workspace.organization.brand.businessName}</span>
                    </div>
                  </div>
                  <h1 className="font-heading text-2xl font-semibold text-zinc-900 sm:text-3xl">{title}</h1>
                  <p className="mt-1 max-w-2xl text-sm text-zinc-600">{description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/">
                  <Button variant="outline" className="rounded-full px-3 text-xs sm:text-sm">
                    <Home className="size-4" />
                    Home Screen
                  </Button>
                </Link>
                <Link href="/setup">
                  <Button className="rounded-full bg-[#79c6bf] px-3 text-xs text-zinc-900 hover:bg-[#68b7af] sm:text-sm">
                    <Sparkles className="size-4" />
                    Start Here
                  </Button>
                </Link>
                <Link href={`/portal/${workspace.organization.brand.businessSlug}`}>
                  <Button variant="outline" className="rounded-full px-3 text-xs sm:text-sm">
                    Customer Portal
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Bell className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={resetWorkspace}>
                  <RotateCcw className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={logoutDemoSession}>
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden px-4 py-5">{children}</main>
        </div>
      </div>
      <MobileNav color={colors.primaryColor} />
    </div>
  );
}
