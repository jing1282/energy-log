import type { DayRecord, Settings, Tag } from "./types";

export const RULES = {
  windowDays: 7,
  minGroup: 7,
  minTroughEpisodes: 3,
  minTrendValues: 5,
  clueMinLow: 3,
  clueMinTries: 3,
  favoriteWindowDays: 30,
};

export const DEFAULT_SETTINGS: Settings = {
  key: "main",
  plantMode: "auto",
  plantMotion: "system",
  plantDayStart: 7,
  plantDayEnd: 21,
  plentyMin: 2,
  overdrawnMax: -3,
  lowEnergyMax: 2,
  dietTags: ["规律", "外卖", "油腻", "甜食", "酒精", "咖啡因多"],
  bodyTags: [],
  demoOffered: false,
  installHintDismissed: false,
  lastBackupAt: null,
};

function tag(
  id: string,
  name: string,
  emoji: string,
  kind: Tag["kind"],
  order: number,
  favorite = false,
): Tag {
  return { id, name, emoji, kind, points: 1, favorite, order, archived: false };
}

export const DEFAULT_TAGS: Tag[] = [
  tag("walk", "散步晒太阳", "🌤️", "gain", 1, true),
  tag("sleep", "睡饱了", "😴", "gain", 2),
  tag("friends", "和朋友聊天", "💬", "gain", 3),
  tag("sport", "运动出汗", "🏃", "gain", 4),
  tag("hobby", "做喜欢的事", "🎨", "gain", 5),
  tag("quiet", "安静发呆", "🍵", "gain", 6),
  tag("early", "早点休息", "🛏️", "gain", 7),
  tag("lessen", "减少安排", "🗓️", "gain", 8),
  tag("warm", "保暖", "🧣", "gain", 9),
  tag("dietadj", "调整饮食", "🥣", "gain", 10),
  tag("late", "熬夜", "🌙", "drain", 11),
  tag("overwork", "赶工加班", "💻", "drain", 12),
  tag("conflict", "争执冲突", "⚡", "drain", 13),
  tag("sitting", "久坐不动", "🪑", "drain", 14),
  tag("info", "信息过载", "📱", "drain", 15),
  tag("social", "应酬社交", "🍻", "drain", 16),
];

export function emptyDay(date: string): DayRecord {
  return {
    date,
    energy: null,
    mood: null,
    stress: null,
    events: [],
    sleepHours: null,
    sleepQuality: null,
    exercise: null,
    exerciseLevel: null,
    diet: null,
    coldHot: null,
    dryWet: null,
    stomach: null,
    cycle: null,
    bodyTags: null,
    note: null,
    moments: [],
    savedAt: null,
    updatedAt: null,
    demo: false,
  };
}

/** 把来自备份或旧版本的记录补齐为完整结构,缺失的字段一律为 null。 */
export function normalizeDay(raw: Partial<DayRecord> & { date: string }): DayRecord {
  const base = emptyDay(raw.date);
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof DayRecord)[]) {
    const v = raw[key];
    if (v !== undefined) out[key] = v;
  }
  const day = out as unknown as DayRecord;
  day.events = (raw.events ?? []).map((e) => ({
    tagId: e.tagId,
    points: e.points ?? 1,
    outcome: e.outcome ?? null,
  }));
  if (Array.isArray(raw.savedCareTags)) day.savedCareTags = [...new Set(raw.savedCareTags.filter((id) => typeof id === "string"))];
  day.moments = raw.moments ?? [];
  return day;
}

export const SLEEP_OPTIONS = [
  { label: "不到 5 小时", value: 4.5 },
  { label: "5–6 小时", value: 5.5 },
  { label: "6–7 小时", value: 6.5 },
  { label: "7–8 小时", value: 7.5 },
  { label: "8 小时以上", value: 8.5 },
];

export const COLD_HOT = [
  { value: 1, label: "很冷" },
  { value: 2, label: "偏冷" },
  { value: 3, label: "舒适" },
  { value: 4, label: "偏热" },
  { value: 5, label: "很热" },
];

export const CYCLE_PHASES = [
  { value: "menstrual" as const, label: "月经期" },
  { value: "follicular" as const, label: "卵泡期" },
  { value: "ovulation" as const, label: "排卵期" },
  { value: "luteal" as const, label: "黄体期" },
];

export const CYCLE_COLOR: Record<string, string> = {
  menstrual: "oklch(0.88 0.07 20)",
  follicular: "oklch(0.9 0.06 150)",
  ovulation: "oklch(0.92 0.08 90)",
  luteal: "oklch(0.88 0.06 300)",
};

export const OUTCOME_LABEL = {
  better: "好一些",
  same: "差不多",
  worse: "更不舒服",
} as const;

export const METRICS = [
  { key: "energy" as const, label: "精力", hint: "现在电量如何", words: ["见底了", "偏低", "一般", "不错", "充沛"] },
  { key: "mood" as const, label: "情绪", hint: "心里的天气", words: ["低落", "有点闷", "平静", "愉快", "很开心"] },
  { key: "stress" as const, label: "压力", hint: "肩上的重量", words: ["很轻松", "还好", "适中", "偏重", "很沉重"] },
];

export type MetricKey = (typeof METRICS)[number]["key"];
