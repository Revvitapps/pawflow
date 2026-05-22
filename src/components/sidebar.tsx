"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  CreditCard,
  Home,
  Inbox,
  PawPrint,
  Settings2,
  Sparkles,
  Star,
  Store,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/pets", label: "Pets", icon: PawPrint },
  { href: "/appointments", label: "Appointments", icon: Sparkles },
  { href: "/boarding", label: "Boarding", icon: Store },
  { href: "/messages", label: "Messages", icon: Inbox },
  { href: "/ai-receptionist", label: "AI Receptionist", icon: Bot },
  { href: "/automations", label: "Automations", icon: Sparkles },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/settings/brand", label: "Brand", icon: Star },
  { href: "/settings/business", label: "Business", icon: Settings2 },
];

export function Sidebar({
  businessName,
  colors,
}: {
  businessName: string;
  colors: { primary: string; accent: string; neutral: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/70 bg-white/85 p-5 backdrop-blur-xl lg:flex lg:flex-col">
      <div
        className="rounded-[28px] border border-white/80 p-5 shadow-[0_20px_70px_rgba(69,63,58,0.08)]"
        style={{
          background: `linear-gradient(180deg, ${colors.primary}22 0%, #ffffff 100%)`,
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg"
            style={{ backgroundColor: colors.primary }}
          >
            PF
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">PawFlow</p>
            <h2 className="font-heading text-lg font-semibold text-zinc-900">{businessName}</h2>
          </div>
        </div>
        <p className="rounded-2xl bg-white/80 px-3 py-2 text-sm text-zinc-600">
          Stop running on sticky notes, missed calls, and memory.
        </p>
      </div>
      <nav className="mt-5 grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active ? "text-white shadow-lg" : "text-zinc-600 hover:bg-white hover:text-zinc-900",
              )}
              style={active ? { backgroundColor: colors.neutral } : undefined}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
