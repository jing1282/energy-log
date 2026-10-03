import { rollingBalance } from "./account";
import { addDays, dateKey, dayIndex, parseKey, shortLabel } from "./dates";
import { RULES } from "./defaults";
import { seasonOf } from "./solar-terms";
import type { Records, Settings, Tag } from "./types";

export interface TrendPoint {
  date: string;
  label: string;
  value: number | null;
}

export function buildEnergyTrend(records: Records, today: Date, days = 14): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dateKey(addDays(today, -i));
    points.push({ date: key, label: shortLabel(key), value: records[key]?.energy ?? null });
  }
  return points;
}

/** 只统计相邻自然日内「低谷 → 回到高于低谷线」的完整波动,漏记会让该次波动不可比较。 */
export function troughRecoveries(records: Records, lowMax: number): number[] {
  const series = Object.values(records)
    .filter((r) => r.energy !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const waits: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const cur = series[i];
    if ((cur.energy as number) > lowMax) continue;
    const prev = series[i - 1];
    if (prev && dayIndex(cur.date) - dayIndex(prev.date) === 1 && (prev.energy as number) <= lowMax) continue;
    for (let j = i + 1; j < series.length; j++) {
      if (dayIndex(series[j].date) - dayIndex(series[j - 1].date) !== 1) break;
      if ((series[j].energy as number) > lowMax) {
        waits.push(dayIndex(series[j].date) - dayIndex(cur.date));
        break;
      }
    }
  }
  return waits;
}

export function trendSummary(points: TrendPoint[], records: Records, settings: Settings, rangeLabel: string): string[] {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length < RULES.minTrendValues) {
    return ["再多记录几天,这里会如实呈现你的精力起伏。数据少的时候不做推断。"];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lines = [
    min === max
      ? `${rangeLabel}你的精力都记录在 ${min},比较平稳。`
      : `${rangeLabel},你的精力在 ${min} 到 ${max} 之间波动。`,
  ];
  const waits = troughRecoveries(records, settings.lowEnergyMax);
  if (waits.length >= RULES.minTroughEpisodes) {
    const sorted = [...waits].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    lines.push(
      `在你的记录里,有 ${waits.length} 次可以比较的低谷,通常约 ${median} 天后回到 ${settings.lowEnergyMax + 1} 以上。`,
    );
  } else {
    lines.push("记录越多,这里会越清楚。低谷出现的次数还不够多,暂不总结回升规律。");
  }
  return lines;
}

export type TrendMetric = "energy" | "mood" | "stress" | "sleep" | "balance";
export type RangeKey = "7" | "30" | "90" | "all";

export const TREND_METRICS: { key: TrendMetric; label: string; unit: string; digits: number }[] = [
  { key: "energy", label: "精力", unit: "", digits: 1 },
  { key: "mood", label: "情绪", unit: "", digits: 1 },
  { key: "stress", label: "压力", unit: "", digits: 1 },
  { key: "sleep", label: "睡眠时长", unit: "小时", digits: 1 },
  { key: "balance", label: "近期收支", unit: "分", digits: 1 },
];

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7 天" },
  { key: "30", label: "30 天" },
  { key: "90", label: "90 天" },
  { key: "all", label: "全部" },
];

export interface SeriesPoint {
  date: string;
  label: string;
  value: number | null;
  ma: number | null;
  season: string;
  cycle: string | null;
}

export function metricValue(
  records: Records,
  tagMap: Record<string, Tag>,
  key: string,
  metric: TrendMetric,
): number | null {
  const r = records[key];
  if (metric === "balance") return rollingBalance(records, tagMap, key);
  if (!r) return null;
  if (metric === "sleep") return r.sleepHours;
  return r[metric];
}

export function buildSeries(
  records: Records,
  tagMap: Record<string, Tag>,
  today: Date,
  metric: TrendMetric,
  range: RangeKey,
): SeriesPoint[] {
  const todayKey = dateKey(today);
  const dates = Object.keys(records).sort();
  const firstKey = dates[0] ?? todayKey;
  const span = range === "all" ? dayIndex(todayKey) - dayIndex(firstKey) + 1 : Number(range);
  const keys: string[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const k = dateKey(addDays(today, -i));
    if (metric === "balance" && k < firstKey) continue;
    keys.push(k);
  }
  const lookback = 6;
  const values = new Map<string, number | null>();
  const need = [...keys];
  for (let i = 1; i <= lookback; i++) need.unshift(dateKey(addDays(parseKey(keys[0] ?? todayKey), -i)));
  for (const k of need) values.set(k, metricValue(records, tagMap, k, metric));
  return keys.map((k) => {
    const window: number[] = [];
    for (let i = 0; i < 7; i++) {
      const v = values.get(dateKey(addDays(parseKey(k), -i)));
      if (v !== null && v !== undefined) window.push(v);
    }
    const ma = window.length >= 3 ? window.reduce((a, b) => a + b, 0) / window.length : null;
    return { date: k, label: shortLabel(k), value: values.get(k) ?? null, ma, season: seasonOf(k).season, cycle: records[k]?.cycle ?? null };
  });
}

export interface PeriodCompare {
  current: { avg: number; n: number } | null;
  previous: { avg: number; n: number } | null;
}

/** 最近 N 天与此前 N 天的平均值对比,缺失值不参与;任一边少于 3 条则不比较。 */
export function comparePeriods(
  records: Records,
  tagMap: Record<string, Tag>,
  today: Date,
  metric: TrendMetric,
  days: number,
): PeriodCompare {
  const collect = (offset: number) => {
    const vals: number[] = [];
    for (let i = 0; i < days; i++) {
      const v = metricValue(records, tagMap, dateKey(addDays(today, -(offset + i))), metric);
      if (v !== null) vals.push(v);
    }
    return vals.length >= 3 ? { avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length } : null;
  };
  return { current: collect(0), previous: collect(days) };
}

export interface SeasonSegment {
  season: string;
  from: string;
  to: string;
}

/** 周期阶段背景带:只连接相邻且阶段相同的已记录日子,未记录的日子留白。 */
export function cycleSegments(series: SeriesPoint[]): SeasonSegment[] {
  const out: SeasonSegment[] = [];
  let current: SeasonSegment | null = null;
  for (const p of series) {
    if (p.cycle === null) {
      current = null;
      continue;
    }
    if (current && current.season === p.cycle) current.to = p.date;
    else {
      current = { season: p.cycle, from: p.date, to: p.date };
      out.push(current);
    }
  }
  return out;
}

export function seasonSegments(series: SeriesPoint[]): SeasonSegment[] {
  const out: SeasonSegment[] = [];
  for (const p of series) {
    const last = out[out.length - 1];
    if (last && last.season === p.season) last.to = p.date;
    else out.push({ season: p.season, from: p.date, to: p.date });
  }
  return out;
}
