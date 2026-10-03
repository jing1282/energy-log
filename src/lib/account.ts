import { addDays, dateKey, dayIndex } from "./dates";
import { RULES } from "./defaults";
import type { DayRecord, Records, Settings, Tag } from "./types";

export type AccountStatus = "plenty" | "low" | "overdrawn";

export interface DayTotals {
  gain: number;
  drain: number;
}

export function dayTotals(record: DayRecord | undefined, tagMap: Record<string, Tag>): DayTotals {
  const totals: DayTotals = { gain: 0, drain: 0 };
  if (!record) return totals;
  for (const e of record.events) {
    const tag = tagMap[e.tagId];
    if (tag) totals[tag.kind] += e.points;
  }
  return totals;
}

export interface Account {
  balance: number;
  income: number;
  expense: number;
  todayIncome: number;
  todayExpense: number;
  status: AccountStatus;
}

export function statusOf(balance: number, settings: Settings): AccountStatus {
  return balance >= settings.plentyMin ? "plenty" : balance <= settings.overdrawnMax ? "overdrawn" : "low";
}

/** 近期收支 = 最近 7 个自然日(含今天)的赋能总分 − 耗能总分。不衰减,不混入精力评分。 */
export function computeAccount(
  records: Records,
  tagMap: Record<string, Tag>,
  today: Date,
  settings: Settings,
): Account {
  let income = 0;
  let expense = 0;
  for (let i = 0; i < RULES.windowDays; i++) {
    const t = dayTotals(records[dateKey(addDays(today, -i))], tagMap);
    income += t.gain;
    expense += t.drain;
  }
  const todayTotals = dayTotals(records[dateKey(today)], tagMap);
  const balance = income - expense;
  return {
    balance,
    income,
    expense,
    todayIncome: todayTotals.gain,
    todayExpense: todayTotals.drain,
    status: statusOf(balance, settings),
  };
}

/** 任意日期结束时的 7 日滚动收支(含当天)。 */
export function rollingBalance(
  records: Records,
  tagMap: Record<string, Tag>,
  endKey: string,
): number {
  const end = dayIndex(endKey);
  let net = 0;
  for (const r of Object.values(records)) {
    const idx = dayIndex(r.date);
    if (idx > end || end - idx >= RULES.windowDays) continue;
    const t = dayTotals(r, tagMap);
    net += t.gain - t.drain;
  }
  return net;
}

export const STATUS_COPY: Record<AccountStatus, { label: string; title: string; message: string }> = {
  plenty: {
    label: "充足",
    title: "最近充电比较多",
    message: "这几天你给自己留了不少充电的时间,可以按自己的节奏安排事情。",
  },
  low: {
    label: "偏低",
    title: "最近充电和消耗差不多",
    message: "最近消耗比较多,可以给自己留一点恢复空间。不用做很多,一件小事就好。",
  },
  overdrawn: {
    label: "透支",
    title: "最近消耗比较多",
    message: "最近消耗比较多,可以给自己留一点恢复空间。这很常见,慢一点也没关系。",
  },
};

export function energyHint(account: Account, energy: number | null, settings: Settings): string {
  if (energy === null) return "今天的精力还没记录,在下面点一下就能看到自己的感受。";
  if (energy <= settings.lowEnergyMax) {
    return account.status === "plenty"
      ? "近期收支不错,但你今天自评精力偏低,仍然适合先休息一下。"
      : "你今天自评精力偏低,先照顾好自己,其他事可以放一放。";
  }
  if (energy >= 4 && account.status === "overdrawn") {
    return "今天感觉不错,挺好。近期消耗偏多,也记得给自己留点恢复的时间。";
  }
  return "今天的自评精力是你当下的真实感受,和近期收支是两件事,两者可以不一致。";
}

export interface Favorite {
  tag: Tag;
  count: number;
}

/** 常用的充电方式:收藏的和最常选的赋能标签,只按使用次数排序,不判断效果。 */
export function frequentGains(
  records: Records,
  tags: Tag[],
  today: Date,
  limit = 3,
): Favorite[] {
  const todayIdx = dayIndex(dateKey(today));
  const counts = new Map<string, number>();
  for (const r of Object.values(records)) {
    const idx = dayIndex(r.date);
    if (idx > todayIdx || todayIdx - idx >= RULES.favoriteWindowDays) continue;
    for (const e of r.events) counts.set(e.tagId, (counts.get(e.tagId) ?? 0) + 1);
  }
  const gains = tags.filter((t) => t.kind === "gain" && !t.archived);
  const rows = gains.map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }));
  const byCount = (a: Favorite, b: Favorite) => b.count - a.count || a.tag.order - b.tag.order;
  const favorites = rows.filter((r) => r.tag.favorite).sort(byCount);
  const used = rows.filter((r) => !r.tag.favorite && r.count > 0).sort(byCount);
  return [...favorites, ...used].slice(0, limit);
}

export function lastReference(records: Records, todayKey: string): DayRecord | undefined {
  return Object.values(records)
    .filter((r) => r.date < todayKey && (r.energy !== null || r.mood !== null || r.stress !== null))
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}
