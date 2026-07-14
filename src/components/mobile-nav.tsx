"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarDays, Home, Inbox, PawPrint } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/pets", label: "Pets", icon: PawPrint },
  { href: "/messages", label: "Inbox", icon: Inbox },
  { href: "/ai-receptionist", label: "AI", icon: Bot },
];

export function MobileNav({ color }: { color: string }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-3 bottom-4 z-40 rounded-[28px] border border-white/80 bg-white/90 p-2 shadow-[0_25px_80px_rgba(61,58,57,0.14)] backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl px-2 py-3 text-[11px] font-semibold text-zinc-500",
                active && "text-white",
              )}
              style={active ? { backgroundColor: color } : undefined}
            >
              <Icon className="mb-1 size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
