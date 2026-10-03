"use client";

import { Heart, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { STATUS_COPY, energyHint, type Account } from "@/lib/account";
import { longLabel } from "@/lib/dates";
import { METRICS, RULES } from "@/lib/defaults";
import type { Season } from "@/lib/solar-terms";
import type { Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  plenty: { pill: "bg-emerald-300/25 text-emerald-50", dot: "bg-emerald-300" },
  low: { pill: "bg-amber-300/25 text-amber-50", dot: "bg-amber-300" },
  overdrawn: { pill: "bg-rose-300/25 text-rose-50", dot: "bg-rose-300" },
} as const;

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export function AccountCard({
  account,
  energy,
  todayKey,
  season,
  settings,
}: {
  account: Account;
  energy: number | null;
  todayKey: string;
  season: Season;
  settings: Settings;
}) {
  const copy = STATUS_COPY[account.status];
  const style = STATUS_STYLE[account.status];
  const meterMin = Math.min(-6, settings.overdrawnMax - 3);
  const meterMax = Math.max(8, settings.plentyMin + 6);
  const toPct = (v: number) => Math.min(100, Math.max(0, ((v - meterMin) / (meterMax - meterMin)) * 100));
  const lowAt = toPct(settings.overdrawnMax + 0.5);
  const plentyAt = toPct(settings.plentyMin - 0.5);
  const energyWords = METRICS[0].words;

  return (
    <section
      aria-label="能量账户"
      className={cn(
        "relative overflow-hidden rounded-[28px] p-5 text-white shadow-[0_18px_40px_-18px_oklch(0.45_0.09_180/0.7)] transition-colors duration-500",
        account.status === "plenty" && "bg-[linear-gradient(145deg,oklch(0.58_0.1_172),oklch(0.45_0.08_195))]",
        account.status === "low" && "bg-[linear-gradient(145deg,oklch(0.62_0.09_130),oklch(0.5_0.08_175))]",
        account.status === "overdrawn" && "bg-[linear-gradient(145deg,oklch(0.6_0.09_60),oklch(0.52_0.09_20))]",
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/10 blur-sm" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-white/8" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-white/85">
            <PiggyBank className="size-4" />
            能量账户
          </div>
          <div className="mt-0.5 text-xs text-white/70">
            {longLabel(todayKey)} · {season.label}
          </div>
        </div>
        <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur", style.pill)}>
          <span className={cn("size-1.5 rounded-full", style.dot)} />
          近期收支 · {copy.label}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-[1.25fr_1fr] gap-3">
        <div>
          <div className="text-[11px] text-white/70">近 {RULES.windowDays} 天收支</div>
          <div className="mt-1 flex items-end gap-1.5">
            <span
              key={account.balance}
              className="animate-in fade-in zoom-in-90 text-5xl font-semibold leading-none tracking-tight tabular-nums duration-300"
              aria-live="polite"
            >
              {signed(account.balance)}
            </span>
            <span className="pb-0.5 text-xs text-white/70">分</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/14 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-1 text-[11px] text-white/75">
            <Heart className="size-3" />
            今天自评精力
          </div>
          {energy !== null ? (
            <div className="mt-0.5">
              <span className="text-2xl font-semibold tabular-nums">{energy}</span>
              <span className="ml-1 text-xs text-white/80">/ 5 · {energyWords[energy - 1]}</span>
            </div>
          ) : (
            <div className="mt-1.5 text-[13px] text-white/80">还没记录</div>
          )}
        </div>
      </div>

      <div className="relative mt-4">
        <div className="relative flex h-2 overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-rose-200/60" style={{ width: `${lowAt}%` }} />
          <div className="h-full bg-amber-100/60" style={{ width: `${plentyAt - lowAt}%` }} />
          <div className="h-full flex-1 bg-emerald-100/70" />
        </div>
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white/90 transition-[left] duration-500 ease-out"
          style={{ left: `${toPct(account.balance)}%`, boxShadow: "0 2px 8px rgb(0 0 0 / 0.25)" }}
        />
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white/14 px-3.5 py-2.5 backdrop-blur">
          <div className="flex items-center gap-1 text-xs text-white/75">
            <TrendingUp className="size-3.5" />
            收入 · 赋能
          </div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums">
            +{account.income}
            <span className="ml-1.5 text-[11px] font-normal text-white/65">今日 +{account.todayIncome}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/14 px-3.5 py-2.5 backdrop-blur">
          <div className="flex items-center gap-1 text-xs text-white/75">
            <TrendingDown className="size-3.5" />
            支出 · 耗能
          </div>
          <div className="mt-0.5 text-xl font-semibold tabular-nums">
            −{account.expense}
            <span className="ml-1.5 text-[11px] font-normal text-white/65">今日 −{account.todayExpense}</span>
          </div>
        </div>
      </div>

      <div className="relative mt-4 space-y-2">
        <p className="text-[15px] font-semibold">{copy.title}</p>
        <p className="text-[13px] leading-relaxed text-white/85">{copy.message}</p>
        <p className="rounded-xl bg-white/12 px-3 py-2 text-[13px] leading-relaxed text-white/90">
          {energyHint(account, energy, settings)}
        </p>
      </div>

      <details className="group relative mt-4 text-[11px] leading-relaxed text-white/70">
        <summary className="cursor-pointer list-none text-white/75 underline-offset-2 hover:underline">
          这个数字是怎么来的
        </summary>
        <div className="mt-1.5 space-y-1 text-white/65">
          <p>近期收支 = 最近 {RULES.windowDays} 个自然日的赋能总分 − 耗能总分。不做衰减,也不含精力评分。</p>
          <p>分值是你自己设定的,它记录的是近期充电与消耗,不代表体力储备,也不代表还能撑多久。</p>
          <p>这是滚动窗口:旧记录移出窗口造成的变化,不是你今天多消耗了。</p>
          <p>
            档位规则(可在设置里调整):≥ {settings.plentyMin} 为充足,≤ {settings.overdrawnMax} 为透支,其间为偏低。
          </p>
        </div>
      </details>
    </section>
  );
}
