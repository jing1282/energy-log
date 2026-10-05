import { careTags } from "./growth";
import { db, ensureInit } from "./db";
import { DEFAULT_SETTINGS, DEFAULT_TAGS, emptyDay, normalizeDay } from "./defaults";
import type { MetricKey } from "./defaults";
import type {
  DayRecord,
  DryWet,
  CyclePhase,
  Outcome,
  Points,
  Settings,
  Tag,
} from "./types";

type Patch = Partial<DayRecord> | ((day: DayRecord) => Partial<DayRecord>);

export async function updateDay(date: string, patch: Patch, touch = true) {
  await ensureInit();
  await db.transaction("rw", db.days, db.tags, async () => {
    const existing = await db.days.get(date);
    const day = existing ? normalizeDay(existing) : emptyDay(date);
    if (day.savedCareTags === undefined) {
      const tags = Object.fromEntries((await db.tags.toArray()).map((t) => [t.id, t]));
      day.savedCareTags = careTags(day, tags);
    }
    const delta = typeof patch === "function" ? patch(day) : patch;
    await db.days.put({
      ...day,
      ...delta,
      updatedAt: touch ? Date.now() : day.updatedAt,
    });
  });
}

export const setMetric = (date: string, metric: MetricKey, value: number) =>
  updateDay(date, (d) => ({ [metric]: d[metric] === value ? null : value }));

export const toggleEvent = (date: string, tag: Tag) =>
  updateDay(date, (d) => ({
    events: d.events.some((e) => e.tagId === tag.id)
      ? d.events.filter((e) => e.tagId !== tag.id)
      : [...d.events, { tagId: tag.id, points: tag.points, outcome: null }],
  }));

export const setEventPoints = (date: string, tagId: string, points: Points) =>
  updateDay(date, (d) => ({
    events: d.events.map((e) => (e.tagId === tagId ? { ...e, points } : e)),
  }));

export const setEventOutcome = (date: string, tagId: string, outcome: Outcome) =>
  updateDay(date, (d) => ({
    events: d.events.map((e) =>
      e.tagId === tagId ? { ...e, outcome: e.outcome === outcome ? null : outcome } : e,
    ),
  }));

export const applyLastRatings = (date: string, from: DayRecord) =>
  updateDay(date, (d) => {
    const patch: Partial<DayRecord> = {};
    for (const key of ["energy", "mood", "stress"] as const) {
      if (d[key] === null && from[key] !== null) patch[key] = from[key];
    }
    return patch;
  });

/** 再点一次同一个值会取消,回到「未记录」。 */
export const toggleField = <K extends keyof DayRecord>(
  date: string,
  key: K,
  value: DayRecord[K],
) => updateDay(date, (d) => ({ [key]: d[key] === value ? null : value }));

export const setSleepHours = (date: string, value: number) => toggleField(date, "sleepHours", value);

export const setExercise = (date: string, value: "yes" | "no") =>
  updateDay(date, (d) => {
    const same = d.exercise === value;
    return { exercise: same ? null : value, exerciseLevel: same || value === "no" ? null : d.exerciseLevel };
  });

function toggleInList(list: string[] | null, item: string): string[] | null {
  const cur = list ?? [];
  const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
  return next.length ? next : null;
}

export const toggleDiet = (date: string, tag: string) =>
  updateDay(date, (d) => ({ diet: toggleInList(d.diet, tag) }));

export const toggleBodyTag = (date: string, tag: string) =>
  updateDay(date, (d) => ({ bodyTags: toggleInList(d.bodyTags, tag) }));

export const setColdHot = (date: string, value: number) => toggleField(date, "coldHot", value);

/** 燥、湿可多选;「都不明显」表示明确记录了没有,与未记录不同。 */
export const toggleDryWet = (date: string, value: DryWet | "none") =>
  updateDay(date, (d) => {
    if (value === "none") return { dryWet: d.dryWet !== null && d.dryWet.length === 0 ? null : [] };
    const cur = d.dryWet ?? [];
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    return { dryWet: next.length ? next : null };
  });

export const setCycle = (date: string, value: CyclePhase) => toggleField(date, "cycle", value);

export const setStomach = (date: string, text: string) =>
  updateDay(date, { stomach: text.trim() || null });

export const setNote = (date: string, text: string) =>
  updateDay(date, { note: text.trim() || null });

export const addMoment = (date: string, energy: number) =>
  updateDay(date, (d) => ({ moments: [...d.moments, { ts: Date.now(), energy }] }));

export const removeMoment = (date: string, ts: number) =>
  updateDay(date, (d) => ({ moments: d.moments.filter((m) => m.ts !== ts) }));

export async function saveDay(date: string) {
  await ensureInit();
  return db.transaction("rw", db.days, db.tags, async () => {
    const raw = await db.days.get(date);
    if (!raw) return 0;
    const day = normalizeDay(raw);
    const tags = Object.fromEntries((await db.tags.toArray()).map((t) => [t.id, t]));
    const before = careTags(day, tags);
    const next = [...new Set(day.events.filter((e) => before.includes(e.tagId) || tags[e.tagId]?.kind === "gain").map((e) => e.tagId))];
    await db.days.put({ ...day, savedAt: Date.now(), savedCareTags: next });
    return day.demo ? 0 : next.filter((id) => !before.includes(id)).length;
  });
}

export async function updateSettings(patch: Partial<Settings>) {
  await ensureInit();
  const cur = await db.settings.get("main");
  await db.settings.put({ ...DEFAULT_SETTINGS, ...cur, ...patch, key: "main" });
}

export async function addDietTag(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const s = await db.settings.get("main");
  const list = s?.dietTags ?? DEFAULT_SETTINGS.dietTags;
  if (!list.includes(clean)) await updateSettings({ dietTags: [...list, clean] });
}

export async function addBodyTagOption(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const s = await db.settings.get("main");
  const list = s?.bodyTags ?? [];
  if (!list.includes(clean)) await updateSettings({ bodyTags: [...list, clean] });
}

export async function removeDietOption(name: string) {
  const s = await db.settings.get("main");
  await updateSettings({ dietTags: (s?.dietTags ?? []).filter((t) => t !== name) });
}

export async function removeBodyOption(name: string) {
  const s = await db.settings.get("main");
  await updateSettings({ bodyTags: (s?.bodyTags ?? []).filter((t) => t !== name) });
}

export async function saveTag(tag: Tag) {
  await ensureInit();
  await db.tags.put(tag);
}

export async function createTag(input: Pick<Tag, "name" | "emoji" | "kind" | "points">) {
  await ensureInit();
  const all = await db.tags.toArray();
  const order = Math.max(0, ...all.map((t) => t.order)) + 1;
  const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  await db.tags.put({ ...input, id, favorite: false, order, archived: false });
}

export async function resetTagsToDefault() {
  await db.tags.clear();
  await db.tags.bulkAdd(DEFAULT_TAGS);
}

/** 创建标签与选入当天同一事务；同名重复提交只复用，不取消已有选择。 */
export async function addPersonalEvent(date: string, text: string, kind: Tag["kind"]) {
  const name = text.trim();
  if (!name || name.length > 60) throw new Error("请填写 1 到 60 字的小事。");
  await ensureInit();
  return db.transaction("rw", db.days, db.tags, async () => {
    const all = await db.tags.toArray();
    const matching = all.filter((t) => t.kind === kind && t.name.trim() === name);
    const existing = matching.find((t) => !t.archived) ?? matching[0];
    const tag: Tag = existing ? { ...existing, archived: false } : {
      id: crypto.randomUUID(), name, emoji: kind === "gain" ? "✨" : "•", kind,
      points: 1, favorite: false, archived: false,
      order: Math.max(0, ...all.map((t) => t.order)) + 1,
    };
    const raw = await db.days.get(date);
    const day = raw ? normalizeDay(raw) : emptyDay(date);
    const tagMap = Object.fromEntries(all.map((t) => [t.id, t]));
    const savedCareTags = day.savedCareTags ?? careTags(day, tagMap);
    await db.tags.put(tag);
    if (!day.events.some((e) => e.tagId === tag.id)) {
      await db.days.put({ ...day, savedCareTags,
        events: [...day.events, { tagId: tag.id, points: tag.points, outcome: null }],
        updatedAt: Date.now(),
      });
    }
    return tag.name;
  });
}
