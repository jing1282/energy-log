"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, LineChart, PiggyBank, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "今日", icon: CalendarCheck, also: ["/day"] },
  { href: "/account/", label: "账户", icon: PiggyBank, also: [] as string[] },
  { href: "/trends/", label: "趋势", icon: LineChart, also: [] as string[] },
  { href: "/insights/", label: "洞察", icon: Sparkles, also: [] as string[] },
  { href: "/settings/", label: "设置", icon: Settings, also: [] as string[] },
];

function isActive(pathname: string, href: string, also: string[]) {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
  const cur = norm(pathname);
  return cur === norm(href) || also.includes(cur);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="主导航"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-border/70 bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, also }) => {
          const active = isActive(pathname, href, also);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/12",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
