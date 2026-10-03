"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { LoadingBlocks, PageShell, SectionCard } from "@/components/energy/page-shell";
import { RawRecords } from "@/components/energy/raw-records";
import { Chip } from "@/components/energy/ui-bits";
import { setEventOutcome } from "@/lib/actions";
import {
  adaptationStats,
  buildClues,
  buildComparisons,
  buildPhaseComparison,
  describeComparison,
  describePhaseComparison,
  pendingOutcomes,
  searchRecords,
  type Perspective,
} from "@/lib/analysis";
import { longLabel } from "@/lib/dates";
import { OUTCOME_LABEL, RULES } from "@/lib/defaults";
import { useAppData } from "@/lib/hooks";
import { troughRecoveries } from "@/lib/trend";
import type { AppData, Outcome } from "@/lib/types";
import { cn } from "@/lib/utils";

function Associations({ data }: { data: AppData }) {
  const [perspective, setPerspective] = useState<Perspective>("same");
  const all = buildComparisons(data.records, data.tags, data.settings).filter((c) => c.perspective === perspective);
  const shown = all
    .filter((c) => c.enough)
    .sort((a, b) => Math.abs((b.avgA as number) - (b.avgB as number)) - Math.abs((a.avgA as number) - (a.avgB as number)));
  const phase = buildPhaseComparison(data.records, perspective);
  const lacking = all.filter((c) => !c.enough && c.datesA.length + c.datesB.length > 0);
  const [showLacking, setShowLacking] = useState(false);

  return (
    <div className="space-y-4">
      <SectionCard
        title="各项与精力的关系"
        hint={`两组各至少 ${RULES.minGroup} 条有效记录才展示;未记录的不进入任何一组`}
      >
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="视角">
          {(
            [
              ["same", "同一天"],
              ["next", "次日"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={perspective === k}
              onClick={() => setPerspective(k)}
              className={cn(
                "h-9 rounded-xl text-sm font-medium transition-colors",
                perspective === k ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {perspective === "same"
            ? "比较条件当天的精力平均值。"
            : "只匹配相邻的下一个自然日;中间漏记的日子不会被跨过去。"}
          这些只是“在你的记录中”的平均差异,不说明原因,也不是医学结论。
        </p>
      </SectionCard>

      {phase.showable ? (
        <section className="rounded-[24px] bg-card/90 p-5 shadow-[0_10px_30px_-18px_oklch(0.4_0.06_180/0.5)]">
          <p className="text-[11px] text-muted-foreground">生理周期</p>
          <p className="mt-1 text-[14px] font-medium leading-relaxed">{describePhaseComparison(phase)}</p>
          <ul className="mt-3 space-y-1.5">
            {phase.groups.map((g) => (
              <li key={g.value} className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-[13px]">
                <span className="w-14 shrink-0 font-medium">{g.label}</span>
                {g.enough ? (
                  <span className="flex-1 tabular-nums">平均 {(g.avg as number).toFixed(1)}</span>
                ) : (
                  <span className="flex-1 text-xs text-muted-foreground">样本不足,暂不比较</span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {g.dates.length} 天{g.enough ? "" : `(需 ${RULES.minGroup} 天)`}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-x-4">
            {phase.groups
              .filter((g) => g.enough)
              .map((g) => (
                <RawRecords key={g.value} dates={g.dates} records={data.records} label={`${g.label}的记录`} />
              ))}
          </div>
        </section>
      ) : null}

      {shown.length === 0 && !phase.showable ? (
        <SectionCard title="暂时没有可以展示的对比">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            记录还不够:每一组至少要有 {RULES.minGroup} 条有效记录。继续记录一段时间,这里会自动出现。
          </p>
        </SectionCard>
      ) : (
        shown.map((c) => (
          <section key={`${c.id}-${c.perspective}`} className="rounded-[24px] bg-card/90 p-5 shadow-[0_10px_30px_-18px_oklch(0.4_0.06_180/0.5)]">
            <p className="text-[11px] text-muted-foreground">{c.factor}</p>
            <p className="mt-1 text-[14px] font-medium leading-relaxed">{describeComparison(c)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
              <div className="rounded-2xl bg-teal-600/10 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{c.aLabel}</div>
                <div className="font-semibold tabular-nums">
                  平均 {(c.avgA as number).toFixed(1)} · {c.datesA.length} 天
                </div>
              </div>
              <div className="rounded-2xl bg-slate-500/10 px-3 py-2">
                <div className="text-[11px] text-muted-foreground">{c.bLabel}</div>
                <div className="font-semibold tabular-nums">
                  平均 {(c.avgB as number).toFixed(1)} · {c.datesB.length} 天
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4">
              <RawRecords dates={c.datesA} records={data.records} label={`${c.aLabel}的记录`} />
              <RawRecords dates={c.datesB} records={data.records} label={`${c.bLabel}的记录`} />
            </div>
          </section>
        ))
      )}

      {!phase.showable && phase.groups.some((g) => g.dates.length > 0) && (
        <SectionCard title="生理周期:数据还不够" hint={`至少两个阶段各有 ${RULES.minGroup} 条有效记录才展示差异`}>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {phase.groups.map((g) => `${g.label} ${g.dates.length} 条`).join(" · ")}
          </p>
        </SectionCard>
      )}

      {lacking.length > 0 && (
        <SectionCard title="数据还不够" hint="样本不足时不展示差异,避免把偶然当成规律">
          <button
            type="button"
            aria-expanded={showLacking}
            onClick={() => setShowLacking((v) => !v)}
            className="text-xs text-primary"
          >
            {showLacking ? "收起" : `查看 ${lacking.length} 项的样本数`}
          </button>
          {showLacking && (
            <ul className="mt-2 space-y-1.5">
              {lacking.map((c) => (
                <li key={`${c.id}-${c.perspective}`} className="rounded-xl bg-muted/60 px-3 py-2 text-xs leading-relaxed">
                  <span className="font-medium">{c.factor}</span>:{c.aLabel} {c.datesA.length} 条 · {c.bLabel} {c.datesB.length} 条
                  <span className="text-muted-foreground">(各需 {RULES.minGroup} 条)</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
        胃部感受是你自己写的文字,只用于回看和搜索,不参与自动统计。
      </p>
    </div>
  );
}

function Clues({ data }: { data: AppData }) {
  const [query, setQuery] = useState("");
  const clues = buildClues(data.records, data.tagMap, data.settings);
  const stats = adaptationStats(data.records, data.tagMap);
  const pending = pendingOutcomes(data.records, data.tagMap).slice(0, 6);
  const withEnergy = Object.values(data.records).filter((r) => r.energy !== null);
  const low = withEnergy.filter((r) => (r.energy as number) <= data.settings.lowEnergyMax);
  const waits = troughRecoveries(data.records, data.settings.lowEnergyMax);
  const results = searchRecords(data.records, query);

  return (
    <div className="space-y-4">
      <SectionCard title="我怎样波动" hint="精力、体感和胃部文字的变化与重复">
        {withEnergy.length < RULES.minTrendValues ? (
          <p className="text-[13px] text-muted-foreground">再多记录几天,这里会开始呈现你的起伏。</p>
        ) : (
          <p className="text-[13px] leading-relaxed">
            在你的记录里,有精力记录的 {withEnergy.length} 天中,有 {low.length} 天偏低(≤ {data.settings.lowEnergyMax}),
            {waits.length >= RULES.minTroughEpisodes
              ? `其中 ${waits.length} 次低谷可以比较前后变化。`
              : "低谷次数还不够多,暂不总结规律。"}
            <Link href="/trends/" className="ml-1 text-primary">
              去看趋势
            </Link>
          </p>
        )}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索胃部感受、备注、身体和饮食标签"
            aria-label="搜索记录"
            className="h-10 w-full rounded-2xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </div>
        <div className="mt-2">
          <p className="mb-1 text-[11px] text-muted-foreground">{query.trim() ? `匹配到 ${results.length} 条` : "最近写过胃部感受的日子"}</p>
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">{query.trim() ? "没有找到匹配的记录。" : "还没有写过胃部感受。"}</p>
          ) : (
            <ul className="space-y-1">
              {results.slice(0, 8).map((r) => (
                <li key={r.date}>
                  <Link href={`/day/?d=${r.date}`} className="block rounded-xl bg-muted/60 px-3 py-2 text-xs active:bg-muted">
                    <span className="font-medium">{longLabel(r.date)}</span>
                    {r.energy !== null && <span className="ml-2 text-muted-foreground">精力 {r.energy}</span>}
                    {r.stomach && <span className="mt-0.5 block">胃部:{r.stomach}</span>}
                    {r.note && <span className="mt-0.5 block text-muted-foreground">备注:{r.note}</span>}
                    {r.bodyTags && <span className="mt-0.5 block text-muted-foreground">{r.bodyTags.join("、")}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="什么情况下容易变化"
        hint={`某种状态下精力偏低至少出现 ${RULES.clueMinLow} 次才会列出,附样本量并可点开原始记录`}
      >
        {clues.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            记录还不够多,暂时没有线索。样本足够时才会出现,措辞只说“在你的记录中”,不把偶然当成结论。
          </p>
        ) : (
          <ul className="space-y-3">
            {clues.map((c) => (
              <li key={c.id} className="rounded-2xl bg-muted/50 p-3.5">
                {c.lines.map((line, i) => (
                  <p key={line} className={cn("text-[13px] leading-relaxed", i === 0 ? "font-medium" : "mt-1")}>
                    {line}
                  </p>
                ))}
                <p className="mt-1 text-[11px] text-muted-foreground">{c.baseline}</p>
                <div className="mt-1">
                  <RawRecords dates={c.lowDates} records={data.records} label="精力偏低的原始记录" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="怎样调整更适合当时的我" hint="来自“今天的调整”里你自己标记的感受">
        {pending.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-medium">还没记感受的调整,想起来再补就好</p>
            {pending.map((p) => (
              <div key={`${p.date}-${p.tag.id}`} className="rounded-2xl bg-secondary/60 px-3 py-2">
                <div className="text-[13px]">
                  <span className="font-medium">
                    {p.tag.emoji} {p.tag.name}
                  </span>
                  <span className="ml-2 text-[11px] text-muted-foreground">{longLabel(p.date)}</span>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
                    <Chip key={o} active={false} onClick={() => setEventOutcome(p.date, p.tag.id, o)} className="h-8 flex-1 px-1 text-xs">
                      {OUTCOME_LABEL[o]}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {stats.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            同一种调整至少记过 {RULES.clueMinTries} 次感受后,这里会汇总。也欢迎记下“没有帮助”的时候,同一个行为在不同状态下是否适合你,正是要看的。
          </p>
        ) : (
          <ul className="space-y-2.5">
            {stats.map((s) => (
              <li key={s.tag.id} className="rounded-2xl bg-muted/50 p-3.5">
                <p className="text-[13px] font-medium">
                  {s.tag.emoji} {s.tag.name}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed">
                  在你的记录中标记过 {s.rated} 次:好一些 {s.better} 次,差不多 {s.same} 次,更不舒服 {s.worse} 次。
                </p>
                <RawRecords dates={s.dates} records={data.records} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

export default function InsightsPage() {
  const data = useAppData();
  const [tab, setTab] = useState<"assoc" | "clues">("assoc");
  if (!data) return <LoadingBlocks />;
  return (
    <PageShell title="洞察" subtitle="看看自己怎样波动、什么情况下容易变化、怎样调整更适合当时的自己。只说“在你的记录中”,不下因果和医学结论。">
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-card/80 p-1" role="tablist">
        {(
          [
            ["assoc", "关联洞察"],
            ["clues", "回看与线索"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn(
              "h-10 rounded-xl text-sm font-medium transition-colors",
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "assoc" ? <Associations data={data} /> : <Clues data={data} />}
    </PageShell>
  );
}
