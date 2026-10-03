"use client";

import { useState } from "react";
import Link from "next/link";
import { LoadingBlocks, PageShell, SectionCard } from "@/components/energy/page-shell";
import { TrendChart } from "@/components/energy/trend-chart";
import { Chip } from "@/components/energy/ui-bits";
import { addDays, dateKey, longLabel } from "@/lib/dates";
import { useAppData } from "@/lib/hooks";
import { SEASON_COLOR } from "@/lib/solar-terms";
import { CYCLE_COLOR, CYCLE_PHASES } from "@/lib/defaults";
import {
  RANGES,
  TREND_METRICS,
  buildSeries,
  comparePeriods,
  cycleSegments,
  seasonSegments,
  trendSummary,
  type RangeKey,
  type TrendMetric,
  type PeriodCompare,
} from "@/lib/trend";

function compareText(label: string, metricLabel: string, digits: number, unit: string, c: PeriodCompare) {
  if (!c.current || !c.previous) {
    return `${label}:记录还不够比较(每段至少需要 3 天的有效记录)。`;
  }
  const diff = c.current.avg - c.previous.avg;
  const fmt = (v: number) => v.toFixed(digits).replace("-", "−");
  const u = unit ? ` ${unit}` : "";
  const level =
    Math.abs(diff) < (digits === 0 ? 0.5 : 0.15) ? "差别很小" : `${diff > 0 ? "高" : "低"} ${fmt(Math.abs(diff))}${u}`;
  return `${label}:在你的记录中,最近平均${metricLabel} ${fmt(c.current.avg)}${u}(${c.current.n} 天),此前一段是 ${fmt(c.previous.avg)}${u}(${c.previous.n} 天),${level}。`;
}

export default function TrendsPage() {
  const data = useAppData();
  const [metric, setMetric] = useState<TrendMetric>("energy");
  const [range, setRange] = useState<RangeKey>("30");
  const [background, setBackground] = useState<"season" | "cycle" | "none">("season");
  if (!data) return <LoadingBlocks />;

  const today = new Date();
  const info = TREND_METRICS.find((m) => m.key === metric)!;
  const series = buildSeries(data.records, data.tagMap, today, metric, range);
  const rangeLabel = range === "all" ? "全部记录里" : `近 ${range} 天`;
  const values = series.map((p) => p.value).filter((v): v is number => v !== null);
  const segs = background === "cycle" ? cycleSegments(series) : seasonSegments(series);
  const week = comparePeriods(data.records, data.tagMap, today, metric, 7);
  const month = comparePeriods(data.records, data.tagMap, today, metric, 30);

  let summary: string[];
  if (metric === "energy") {
    summary = trendSummary(
      series.map((p) => ({ date: p.date, label: p.label, value: p.value })),
      data.records,
      data.settings,
      rangeLabel,
    );
  } else if (values.length < 5) {
    summary = ["再多记录几天,这里会如实呈现起伏。数据少的时候不做推断。"];
  } else {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const digits = metric === "sleep" ? 1 : 0;
    const fmt = (v: number) => v.toFixed(digits).replace("-", "−");
    const unit = info.unit ? ` ${info.unit}` : "";
    summary = [
      `${rangeLabel},你的${info.label}在 ${fmt(min)} 到 ${fmt(max)}${unit} 之间波动(${values.length} 天有记录)。`,
    ];
  }

  const recent = Array.from({ length: 14 }, (_, i) => dateKey(addDays(today, -i)));

  return (
    <PageShell title="趋势" subtitle="看见自己的起伏。波动是常态,这里只如实呈现,不下结论。">
      <SectionCard title={`${info.label} · ${RANGES.find((r) => r.key === range)?.label}`}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="指标">
          {TREND_METRICS.map((m) => (
            <Chip key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)} className="shrink-0">
              {m.label}
            </Chip>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="时间范围">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={range === r.key}
              onClick={() => setRange(r.key)}
              className={`h-8 rounded-xl text-xs font-medium transition-colors ${range === r.key ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {series.length === 0 || values.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">这个范围里还没有{info.label}的记录。</p>
        ) : (
          <div className="mt-3">
            <TrendChart series={series} metric={metric} background={background} />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: "oklch(0.62 0.11 170)" }} />
                高点
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: "oklch(0.74 0.12 50)" }} />
                低谷
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "oklch(0.5 0.07 260)" }} />
                7 天移动平均
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="背景带">
              {([["season", "时令背景"], ["cycle", "周期背景"], ["none", "无背景"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={background === k}
                  onClick={() => setBackground(k)}
                  className={`h-8 rounded-xl text-xs font-medium transition-colors ${background === k ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>            {background !== "none" && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {[...new Set(segs.map((s) => s.season))].map((s) => (
                  <span
                    key={s}
                    className="rounded-full px-2 py-0.5 text-[11px] text-foreground/70"
                    style={{ background: background === "cycle" ? CYCLE_COLOR[s] : SEASON_COLOR[s as keyof typeof SEASON_COLOR] }}
                  >
                    {background === "cycle" ? CYCLE_PHASES.find((c) => c.value === s)?.label : s}
                  </span>
                ))}
                {background === "cycle" && segs.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">这个范围里还没有记录生理周期阶段。</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 space-y-1 rounded-xl bg-secondary/70 px-3 py-2.5 text-[13px] leading-relaxed text-secondary-foreground">
          {summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="周与月对比" hint="缺失的日子不参与平均,不会当成 0">
        <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
          <p>{compareText("周", info.label, info.digits, info.unit, week)}</p>
          <p>{compareText("月", info.label, info.digits, info.unit, month)}</p>
        </div>
        {metric === "balance" && (
          <p className="mt-2 text-[11px] text-muted-foreground">近期收支是 7 日滚动值,从有第一条记录的那天开始计算。</p>
        )}
      </SectionCard>

      <SectionCard title="最近 14 天记录" hint="点开可以查看或补填">
        <ul className="grid grid-cols-2 gap-1.5">
          {recent.map((k) => {
            const r = data.records[k];
            return (
              <li key={k}>
                <Link href={`/day/?d=${k}`} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-[13px] active:bg-muted">
                  <span>{longLabel(k).replace(/ 周/, " 周")}</span>
                  <span className="tabular-nums text-muted-foreground">{r ? (r.energy !== null ? `精力 ${r.energy}` : "有记录") : "—"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </PageShell>
  );
}
