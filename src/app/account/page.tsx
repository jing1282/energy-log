"use client";

import Link from "next/link";
import { AccountCard } from "@/components/energy/account-card";
import { Star } from "lucide-react";
import { LoadingBlocks, PageShell, SectionCard } from "@/components/energy/page-shell";
import { seasonOf } from "@/lib/solar-terms";
import { computeAccount, dayTotals, frequentGains } from "@/lib/account";
import { saveTag } from "@/lib/actions";
import { addDays, dateKey, longLabel, shortLabel } from "@/lib/dates";
import { RULES } from "@/lib/defaults";
import { useAppData } from "@/lib/hooks";
import type { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export default function AccountPage() {
  const data = useAppData();
  if (!data) return <LoadingBlocks />;

  const today = new Date();
  const account = computeAccount(data.records, data.tagMap, today, data.settings);
  const todayKey = dateKey(today);
  const favorites = frequentGains(data.records, data.tags, today, 3);

  const days = Array.from({ length: RULES.windowDays }, (_, i) => {
    const key = dateKey(addDays(today, -i));
    return { key, ...dayTotals(data.records[key], data.tagMap), recorded: !!data.records[key] };
  });
  const maxDay = Math.max(1, ...days.map((d) => Math.max(d.gain, d.drain)));

  const blocks = Array.from({ length: 8 }, (_, b) => {
    const keys = Array.from({ length: 7 }, (_, i) => dateKey(addDays(today, -(b * 7 + i))));
    let gain = 0;
    let drain = 0;
    const byTag = new Map<string, number>();
    for (const k of keys) {
      const r = data.records[k];
      if (!r) continue;
      for (const e of r.events) {
        const tag = data.tagMap[e.tagId];
        if (!tag) continue;
        if (tag.kind === "gain") gain += e.points;
        else drain += e.points;
        byTag.set(tag.id, (byTag.get(tag.id) ?? 0) + e.points);
      }
    }
    const top = [...byTag.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, pts]) => ({ tag: data.tagMap[id], pts }));
    return { label: `${shortLabel(keys[6])} – ${shortLabel(keys[0])}`, gain, drain, top };
  }).filter((b, i) => i === 0 || b.gain + b.drain > 0);

  const windowTags = (() => {
    const byTag = new Map<string, number>();
    for (const d of days) {
      for (const e of data.records[d.key]?.events ?? []) byTag.set(e.tagId, (byTag.get(e.tagId) ?? 0) + e.points);
    }
    return [...byTag.entries()]
      .filter(([id]) => data.tagMap[id])
      .map(([id, pts]) => ({ tag: data.tagMap[id], pts }))
      .sort((a, b) => b.pts - a.pts);
  })();
  const maxTag = Math.max(1, ...windowTags.map((t) => t.pts));

  const toggleFavorite = (tag: Tag) => saveTag({ ...tag, favorite: !tag.favorite });
  const gainTags = data.tags.filter((t) => t.kind === "gain" && !t.archived);

  return (
    <PageShell
      title="能量账户"
      subtitle="这里记录的是近期充电与消耗,不代表实际还能撑多久。分值是你自己设定的主观数字。"
    >
      <AccountCard
        account={account}
        energy={data.records[todayKey]?.energy ?? null}
        todayKey={todayKey}
        season={seasonOf(todayKey)}
        settings={data.settings}
      />

      <SectionCard title="你常用的充电方式" hint="先按你收藏或最常选的 3 项推荐,不判断效果">
        <ul className="space-y-1.5">
          {favorites.length === 0 && <li className="text-sm text-muted-foreground">选过几次充电的事之后,这里会列出你常用的。</li>}
          {favorites.map((f) => (
            <li key={f.tag.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-[13px]">
              <span>{f.tag.emoji}</span>
              <span className="flex-1 font-medium">{f.tag.name}</span>
              <span className="text-[11px] text-muted-foreground">近 {RULES.favoriteWindowDays} 天 {f.count} 次</span>
            </li>
          ))}
        </ul>
        <p className="mb-2 mt-4 text-xs text-muted-foreground">点星标可以收藏,收藏的会优先出现在推荐里。</p>
        <div className="flex flex-wrap gap-1.5">
          {gainTags.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.favorite}
              onClick={() => toggleFavorite(t)}
              className={cn(
                "flex h-9 items-center gap-1 rounded-full border px-3 text-[13px] transition-all active:scale-95",
                t.favorite ? "border-amber-400 bg-amber-50 text-amber-800" : "border-border bg-card text-foreground/80",
              )}
            >
              <Star className={cn("size-3.5", t.favorite && "fill-amber-400 text-amber-500")} />
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="按日明细" hint="点一天可以查看或补填当天记录">
        <ul className="space-y-1.5">
          {days.map((d) => (
            <li key={d.key}>
              <Link
                href={`/day/?d=${d.key}`}
                className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-[13px] active:bg-muted"
              >
                <span className="w-[88px] shrink-0 text-muted-foreground">{longLabel(d.key)}</span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 rounded-full bg-teal-500/80" style={{ width: `${(d.gain / maxDay) * 100}%`, minWidth: d.gain ? 4 : 0 }} />
                    {d.gain > 0 && <span className="text-[11px] tabular-nums text-teal-700">+{d.gain}</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 rounded-full bg-orange-400/80" style={{ width: `${(d.drain / maxDay) * 100}%`, minWidth: d.drain ? 4 : 0 }} />
                    {d.drain > 0 && <span className="text-[11px] tabular-nums text-orange-600">−{d.drain}</span>}
                  </span>
                </span>
                <span className={cn("w-8 shrink-0 text-right font-medium tabular-nums", !d.recorded && "text-muted-foreground")}>
                  {d.recorded ? signed(d.gain - d.drain) : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">“—”表示这一天没有记录,不是 0 分。</p>
      </SectionCard>

      <SectionCard title="这 7 天的构成" hint="钱花在哪、从哪来">
        {windowTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">最近 7 天还没有记录事件。</p>
        ) : (
          <ul className="space-y-2">
            {windowTags.map(({ tag, pts }) => (
              <li key={tag.id} className="flex items-center gap-2 text-[13px]">
                <span className="w-28 shrink-0 truncate">
                  {tag.emoji} {tag.name}
                </span>
                <span className="h-2 flex-1 rounded-full bg-muted">
                  <span
                    className={cn("block h-2 rounded-full", tag.kind === "gain" ? "bg-teal-500/80" : "bg-orange-400/80")}
                    style={{ width: `${(pts / maxTag) * 100}%` }}
                  />
                </span>
                <span className="w-7 text-right tabular-nums text-muted-foreground">
                  {tag.kind === "gain" ? "+" : "−"}
                  {pts}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="按周对比" hint="每 7 天为一周,从今天往前数">
        <ul className="space-y-3">
          {blocks.map((b, i) => (
            <li key={b.label} className="text-[13px]">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">
                  {i === 0 ? "最近 7 天" : b.label}
                  {i === 0 && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{b.label}</span>}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  +{b.gain} / −{b.drain} · 净 {signed(b.gain - b.drain)}
                </span>
              </div>
              {b.top.length > 0 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {b.top.map((t) => `${t.tag.name}${t.tag.kind === "gain" ? "+" : "−"}${t.pts}`).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

    </PageShell>
  );
}
