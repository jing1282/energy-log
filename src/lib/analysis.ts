import { addDaysKey } from "./dates";
import { COLD_HOT, CYCLE_PHASES, RULES } from "./defaults";
import { seasonOf } from "./solar-terms";
import type { DayRecord, Records, Settings, Tag } from "./types";

export type Perspective = "same" | "next";

export interface Comparison {
  id: string;
  factor: string;
  aLabel: string;
  bLabel: string;
  perspective: Perspective;
  datesA: string[];
  datesB: string[];
  avgA: number | null;
  avgB: number | null;
  enough: boolean;
}

type Grouper = (r: DayRecord) => "A" | "B" | null;

interface Spec {
  id: string;
  factor: string;
  aLabel: string;
  bLabel: string;
  group: Grouper;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const coldGroup = (c: number | null) => (c === null ? null : c <= 2 ? "cold" : c === 3 ? "ok" : "hot");

function buildSpecs(tags: Tag[], settings: Settings, records: Records): Spec[] {
  const specs: Spec[] = [
    {
      id: "exercise",
      factor: "锻炼",
      aLabel: "有锻炼",
      bLabel: "明确没锻炼",
      group: (r) => (r.exercise === "yes" ? "A" : r.exercise === "no" ? "B" : null),
    },
    {
      id: "sleep",
      factor: "睡眠时长",
      aLabel: "睡眠不到 6 小时",
      bLabel: "睡 7 小时及以上",
      group: (r) => (r.sleepHours === null ? null : r.sleepHours < 6 ? "A" : r.sleepHours >= 7 ? "B" : null),
    },
    {
      id: "stress",
      factor: "压力",
      aLabel: "压力偏重(4–5)",
      bLabel: "压力偏轻(1–2)",
      group: (r) => (r.stress === null ? null : r.stress >= 4 ? "A" : r.stress <= 2 ? "B" : null),
    },
    {
      id: "mood",
      factor: "情绪",
      aLabel: "情绪偏低(1–2)",
      bLabel: "情绪偏好(4–5)",
      group: (r) => (r.mood === null ? null : r.mood <= 2 ? "A" : r.mood >= 4 ? "B" : null),
    },
    {
      id: "cold",
      factor: "冷热体感",
      aLabel: "偏冷及以下",
      bLabel: "舒适",
      group: (r) => (coldGroup(r.coldHot) === "cold" ? "A" : coldGroup(r.coldHot) === "ok" ? "B" : null),
    },
    {
      id: "hot",
      factor: "冷热体感",
      aLabel: "偏热及以上",
      bLabel: "舒适",
      group: (r) => (coldGroup(r.coldHot) === "hot" ? "A" : coldGroup(r.coldHot) === "ok" ? "B" : null),
    },
    {
      id: "dry",
      factor: "燥湿体感",
      aLabel: "觉得燥",
      bLabel: "燥湿都不明显",
      group: (r) => (r.dryWet === null ? null : r.dryWet.includes("dry") ? "A" : r.dryWet.length === 0 ? "B" : null),
    },
    {
      id: "damp",
      factor: "燥湿体感",
      aLabel: "觉得湿",
      bLabel: "燥湿都不明显",
      group: (r) => (r.dryWet === null ? null : r.dryWet.includes("damp") ? "A" : r.dryWet.length === 0 ? "B" : null),
    },
  ];

  const combos: [string, string, (r: DayRecord) => boolean][] = [
    ["cold-damp", "冷加湿", (r) => coldGroup(r.coldHot) === "cold" && !!r.dryWet?.includes("damp")],
    ["cold-dry", "冷加燥", (r) => coldGroup(r.coldHot) === "cold" && !!r.dryWet?.includes("dry")],
    ["hot-damp", "热加湿", (r) => coldGroup(r.coldHot) === "hot" && !!r.dryWet?.includes("damp")],
    ["hot-dry", "热加燥", (r) => coldGroup(r.coldHot) === "hot" && !!r.dryWet?.includes("dry")],
  ];
  for (const [id, label, test] of combos) {
    specs.push({
      id,
      factor: "冷热与燥湿组合",
      aLabel: label,
      bLabel: "其余记录了冷热和燥湿的日子",
      group: (r) => (r.coldHot === null || r.dryWet === null ? null : test(r) ? "A" : "B"),
    });
  }

  const dietNames = new Set<string>(settings.dietTags);
  for (const r of Object.values(records)) for (const d of r.diet ?? []) dietNames.add(d);
  for (const name of dietNames) {
    specs.push({
      id: `diet-${name}`,
      factor: "饮食",
      aLabel: `饮食有“${name}”`,
      bLabel: `记了饮食但没有“${name}”`,
      group: (r) => (r.diet === null ? null : r.diet.includes(name) ? "A" : "B"),
    });
  }

  for (const t of tags.filter((x) => !x.archived)) {
    specs.push({
      id: `event-${t.id}`,
      factor: t.kind === "gain" ? "赋能事件" : "耗能事件",
      aLabel: `选了“${t.name}”`,
      bLabel: `没选“${t.name}”`,
      group: (r) => (r.events.some((e) => e.tagId === t.id) ? "A" : r.savedAt !== null ? "B" : null),
    });
  }
  return specs;
}

/** 两组样本分别判断;未记录不进入任何一组;次日关联只匹配相邻自然日。 */
export function buildComparisons(records: Records, tags: Tag[], settings: Settings): Comparison[] {
  const specs = buildSpecs(tags, settings, records);
  const all = Object.values(records);
  const out: Comparison[] = [];
  for (const spec of specs) {
    for (const perspective of ["same", "next"] as Perspective[]) {
      const a: { date: string; v: number }[] = [];
      const b: { date: string; v: number }[] = [];
      for (const r of all) {
        const g = spec.group(r);
        if (!g) continue;
        const target = perspective === "same" ? r : records[addDaysKey(r.date, 1)];
        const v = target?.energy ?? null;
        if (v === null) continue;
        (g === "A" ? a : b).push({ date: r.date, v });
      }
      out.push({
        id: spec.id,
        factor: spec.factor,
        aLabel: spec.aLabel,
        bLabel: spec.bLabel,
        perspective,
        datesA: a.map((x) => x.date).sort(),
        datesB: b.map((x) => x.date).sort(),
        avgA: avg(a.map((x) => x.v)),
        avgB: avg(b.map((x) => x.v)),
        enough: a.length >= RULES.minGroup && b.length >= RULES.minGroup,
      });
    }
  }
  return out;
}

export interface PhaseGroup {
  value: string;
  label: string;
  dates: string[];
  avg: number | null;
  enough: boolean;
}

export interface PhaseComparison {
  perspective: Perspective;
  groups: PhaseGroup[];
  /** 至少两个阶段样本达标才展示差异 */
  showable: boolean;
}

/** 生理周期按阶段分组比较精力:每组分别判断样本数,未记录阶段的日子不进入任何一组。 */
export function buildPhaseComparison(records: Records, perspective: Perspective): PhaseComparison {
  const all = Object.values(records);
  const groups: PhaseGroup[] = CYCLE_PHASES.map((p) => {
    const vals: { date: string; v: number }[] = [];
    for (const r of all) {
      if (r.cycle !== p.value) continue;
      const target = perspective === "same" ? r : records[addDaysKey(r.date, 1)];
      const v = target?.energy ?? null;
      if (v !== null) vals.push({ date: r.date, v });
    }
    return {
      value: p.value,
      label: p.label,
      dates: vals.map((x) => x.date).sort(),
      avg: avg(vals.map((x) => x.v)),
      enough: vals.length >= RULES.minGroup,
    };
  });
  return { perspective, groups, showable: groups.filter((g) => g.enough).length >= 2 };
}

export function describePhaseComparison(c: PhaseComparison): string {
  const ok = c.groups.filter((g) => g.enough);
  const sorted = [...ok].sort((a, b) => (b.avg as number) - (a.avg as number));
  const hi = sorted[0];
  const lo = sorted[sorted.length - 1];
  const diff = (hi.avg as number) - (lo.avg as number);
  const when = c.perspective === "same" ? "的日子" : "的次日";
  if (diff < 0.2) return `在你的记录中,各个阶段${when}精力平均差别很小。`;
  return `在你的记录中,${hi.label}${when}精力平均最高(${(hi.avg as number).toFixed(1)}),${lo.label}${when}平均最低(${(lo.avg as number).toFixed(1)}),相差 ${diff.toFixed(1)}。`;
}

export function describeComparison(c: Comparison): string {
  const diff = (c.avgA as number) - (c.avgB as number);
  const when = c.perspective === "same" ? "的日子" : "的次日";
  if (Math.abs(diff) < 0.2) {
    return `在你的记录中,${c.aLabel}${when}和${c.bLabel}${when},精力平均差别很小。`;
  }
  return `在你的记录中,${c.aLabel}${when},精力平均比${c.bLabel}${when}${diff > 0 ? "高" : "低"} ${Math.abs(diff).toFixed(1)}。`;
}

export interface Clue {
  id: string;
  title: string;
  total: number;
  lowDates: string[];
  lines: string[];
  baseline: string;
}

interface Condition {
  id: string;
  title: string;
  test: (r: DayRecord) => boolean;
}

function conditions(): Condition[] {
  const cold = (r: DayRecord) => coldGroup(r.coldHot) === "cold";
  const hot = (r: DayRecord) => coldGroup(r.coldHot) === "hot";
  const dry = (r: DayRecord) => !!r.dryWet?.includes("dry");
  const damp = (r: DayRecord) => !!r.dryWet?.includes("damp");
  return [
    { id: "cold-damp", title: "冷加湿", test: (r) => cold(r) && damp(r) },
    { id: "cold-dry", title: "冷加燥", test: (r) => cold(r) && dry(r) },
    { id: "hot-damp", title: "热加湿", test: (r) => hot(r) && damp(r) },
    { id: "hot-dry", title: "热加燥", test: (r) => hot(r) && dry(r) },
    { id: "cold", title: "偏冷及以下", test: cold },
    { id: "hot", title: "偏热及以上", test: hot },
    { id: "dry", title: "觉得燥", test: dry },
    { id: "damp", title: "觉得湿", test: damp },
    ...CYCLE_PHASES.map((c) => ({
      id: `cycle-${c.value}`,
      title: c.label,
      test: (r: DayRecord) => r.cycle === c.value,
    })),
    { id: "sleep", title: "睡眠不到 6 小时", test: (r) => r.sleepHours !== null && r.sleepHours < 6 },
    { id: "stress", title: "压力偏重(4–5)", test: (r) => r.stress !== null && r.stress >= 4 },
    ...(["春", "夏", "秋", "冬"] as const).map((s) => ({
      id: `season-${s}`,
      title: `${s}季`,
      test: (r: DayRecord) => seasonOf(r.date).season === s,
    })),
  ];
}

export function buildClues(records: Records, tagMap: Record<string, Tag>, settings: Settings): Clue[] {
  const withEnergy = Object.values(records).filter((r) => r.energy !== null);
  const lowAll = withEnergy.filter((r) => (r.energy as number) <= settings.lowEnergyMax);
  const baseline = withEnergy.length
    ? `作为对照:全部有精力记录的 ${withEnergy.length} 天里,有 ${lowAll.length} 天偏低(${Math.round((lowAll.length / withEnergy.length) * 100)}%)。`
    : "";
  const clues: Clue[] = [];
  for (const cond of conditions()) {
    const inCond = withEnergy.filter(cond.test);
    const low = inCond.filter((r) => (r.energy as number) <= settings.lowEnergyMax);
    if (low.length < RULES.clueMinLow) continue;
    const lines = [`在你的记录中,“${cond.title}”共 ${inCond.length} 条有精力记录,其中有 ${low.length} 次精力偏低。`];
    const stats = new Map<string, { m: number; k: number }>();
    for (const r of low) {
      for (const e of r.events) {
        if (e.outcome === null || tagMap[e.tagId]?.kind !== "gain") continue;
        const s = stats.get(e.tagId) ?? { m: 0, k: 0 };
        s.m += 1;
        if (e.outcome === "better") s.k += 1;
        stats.set(e.tagId, s);
      }
    }
    const tries = [...stats.entries()]
      .filter(([, s]) => s.m >= RULES.clueMinTries)
      .sort((a, b) => b[1].k / b[1].m - a[1].k / a[1].m || b[1].m - a[1].m)
      .slice(0, 3);
    for (const [id, s] of tries) {
      lines.push(`其中尝试“${tagMap[id].name}”的 ${s.m} 次里,有 ${s.k} 次标记为“好一些”,可以继续观察。`);
    }
    clues.push({
      id: cond.id,
      title: cond.title,
      total: inCond.length,
      lowDates: low.map((r) => r.date).sort(),
      lines,
      baseline,
    });
  }
  return clues.sort((a, b) => b.lowDates.length - a.lowDates.length);
}

export interface AdaptStat {
  tag: Tag;
  rated: number;
  better: number;
  same: number;
  worse: number;
  dates: string[];
}

export function adaptationStats(records: Records, tagMap: Record<string, Tag>): AdaptStat[] {
  const map = new Map<string, AdaptStat>();
  for (const r of Object.values(records)) {
    for (const e of r.events) {
      const tag = tagMap[e.tagId];
      if (!tag || tag.kind !== "gain" || e.outcome === null) continue;
      const s = map.get(tag.id) ?? { tag, rated: 0, better: 0, same: 0, worse: 0, dates: [] };
      s.rated += 1;
      s[e.outcome] += 1;
      s.dates.push(r.date);
      map.set(tag.id, s);
    }
  }
  return [...map.values()]
    .filter((s) => s.rated >= RULES.clueMinTries)
    .map((s) => ({ ...s, dates: s.dates.sort() }))
    .sort((a, b) => b.better / b.rated - a.better / a.rated || b.rated - a.rated);
}

/** 补填提醒:最近几天里选了赋能事件但还没记感受的条目。 */
export function pendingOutcomes(records: Records, tagMap: Record<string, Tag>, days = 7) {
  const out: { date: string; tag: Tag }[] = [];
  const keys = Object.keys(records).sort().reverse().slice(0, days);
  for (const k of keys) {
    for (const e of records[k].events) {
      const tag = tagMap[e.tagId];
      if (tag?.kind === "gain" && e.outcome === null) out.push({ date: k, tag });
    }
  }
  return out;
}

export function coldHotLabel(v: number | null) {
  return COLD_HOT.find((c) => c.value === v)?.label ?? null;
}

export function searchRecords(records: Records, query: string): DayRecord[] {
  const q = query.trim().toLowerCase();
  const all = Object.values(records).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!q) return all.filter((r) => r.stomach).slice(0, 20);
  return all
    .filter((r) =>
      [r.stomach, r.note, ...(r.bodyTags ?? []), ...(r.diet ?? [])]
        .filter((x): x is string => !!x)
        .some((x) => x.toLowerCase().includes(q)),
    )
    .slice(0, 50);
}
