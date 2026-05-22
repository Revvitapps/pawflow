"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Bell, Home, LogOut, RotateCcw, Sparkles } from "lucide-react";

import { LogoBadge } from "@/components/logo-badge";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
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
      className="min-h-screen"
      style={{
        background: `radial-gradient(circle at top left, ${colors.secondaryColor} 0%, white 38%, #fffaf7 100%)`,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar
          businessName={workspace.organization.brand.businessName}
          logoUrl={workspaceLogoUrl}
          colors={{
            primary: colors.primaryColor,
            accent: colors.accentColor,
            neutral: colors.neutralColor,
          }}
        />
        <div className="flex min-h-screen flex-1 flex-col pb-28 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 px-4 py-4 backdrop-blur-xl md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <LogoBadge src="/paw-flow-logo.png" alt="PawFlow logo" size={54} rounded="rounded-[18px]" className="shrink-0" />
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Workspace</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2 py-1">
                      {workspaceLogoUrl ? (
                        <LogoBadge
                          src={workspaceLogoUrl}
                          alt={`${workspace.organization.brand.businessName} logo`}
                          size={22}
                          rounded="rounded-full"
                          className="shadow-none"
                        />
                      ) : null}
                      <span className="text-xs font-medium text-zinc-600">{workspace.organization.brand.businessName}</span>
                    </div>
                  </div>
                  <h1 className="font-heading text-3xl font-semibold text-zinc-900">{title}</h1>
                  <p className="mt-1 max-w-2xl text-sm text-zinc-600">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button variant="outline" className="rounded-full">
                    <Home className="size-4" />
                    Home Screen
                  </Button>
                </Link>
                <Link href="/setup">
                  <Button className="rounded-full bg-[#79c6bf] text-zinc-900 hover:bg-[#68b7af]">
                    <Sparkles className="size-4" />
                    Start Here
                  </Button>
                </Link>
                <Link href={`/portal/${workspace.organization.brand.businessSlug}`}>
                  <Button variant="outline" className="rounded-full">
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
          <main className="flex-1 px-4 py-5 md:px-6">{children}</main>
        </div>
      </div>
      <MobileNav color={colors.primaryColor} />
    </div>
  );
}
