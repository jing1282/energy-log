import { db, ensureInit } from "./db";
import { DEFAULT_SETTINGS, SLEEP_OPTIONS, emptyDay } from "./defaults";
import { addDays, dateKey, parseKey } from "./dates";
import { updateSettings } from "./actions";
import type { CyclePhase, DayRecord, DryWet, EventEntry, Outcome } from "./types";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number) => Math.min(5, Math.max(1, Math.round(v)));

const STOMACH_LOW = ["有点胀,没什么胃口", "隐隐发凉,想喝点热的", "偏紧,像有东西堵着", "有点空,说不上来的不舒服"];
const STOMACH_OK = ["比较平稳", "暖暖的,挺舒服", "没太注意到", "饭后有点撑,过一会儿就好了"];
const NOTES = ["今天节奏刚好", "下午有点犯困", "开了一天会", "傍晚散步后好多了", "睡前没看手机"];

export const DEMO_BODY_TAGS = ["肩颈紧", "头沉", "手脚凉"];

export function generateDemoDays(today: Date = new Date(), count = 112): DayRecord[] {
  const rand = mulberry32(20241003);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const days: DayRecord[] = [];
  let prevSleepLow = false;
  let prevEnergy = 3;

  for (let i = count; i >= 1; i--) {
    const date = dateKey(addDays(today, -i));
    if (rand() < 0.07) {
      prevSleepLow = false;
      continue;
    }
    const d = parseKey(date);
    const month = d.getMonth() + 1;
    const dow = d.getDay();
    const day = emptyDay(date);
    day.demo = true;

    const coldBase = month >= 11 || month <= 2 ? 2.2 : month >= 6 && month <= 8 ? 3.9 : 3.1;
    const coldHot = clamp(coldBase + (rand() - 0.5) * 2.2);
    const wetP = month >= 6 && month <= 7 ? 0.55 : 0.25;
    const dryP = month >= 9 || month <= 2 ? 0.45 : 0.15;
    const dryWet: DryWet[] = [];
    if (rand() < dryP) dryWet.push("dry");
    else if (rand() < wetP) dryWet.push("damp");

    const sleepRoll = rand();
    const sleepOption =
      sleepRoll < 0.17 ? SLEEP_OPTIONS[0] : sleepRoll < 0.3 ? SLEEP_OPTIONS[1] : sleepRoll < 0.52 ? SLEEP_OPTIONS[2] : sleepRoll < 0.84 ? SLEEP_OPTIONS[3] : SLEEP_OPTIONS[4];
    const sleepHours = sleepOption.value;
    const sleepLow = sleepHours < 6;
    const sleepHigh = sleepHours >= 7.5;

    const stress = clamp(2.9 + (dow >= 1 && dow <= 4 ? 0.5 : -0.4) + (rand() - 0.5) * 2.6);
    const exerciseRoll = rand();
    const exercise: "yes" | "no" | null = exerciseRoll < 0.36 ? "yes" : exerciseRoll < 0.72 ? "no" : null;

    const gainIds: string[] = [];
    const drainIds: string[] = [];
    if (exercise === "yes" && rand() < 0.8) gainIds.push("sport");
    if (sleepHigh && rand() < 0.4) gainIds.push("sleep");
    for (const id of ["walk", "friends", "hobby", "quiet"]) if (rand() < 0.2) gainIds.push(id);
    if (rand() < 0.1) gainIds.push("early");
    if (prevEnergy <= 2 && rand() < 0.35) gainIds.push("lessen");
    if (coldHot <= 2 && rand() < 0.5) gainIds.push("warm");
    if (rand() < 0.07) gainIds.push("dietadj");
    if (sleepLow && rand() < 0.45) drainIds.push("late");
    for (const id of ["overwork", "conflict", "sitting", "info", "social"]) {
      if (rand() < (id === "overwork" && stress >= 4 ? 0.4 : 0.14)) drainIds.push(id);
    }

    const dayInCycle = ((count - i) % 28) + 1;
    const phase: CyclePhase =
      dayInCycle <= 5 ? "menstrual" : dayInCycle <= 13 ? "follicular" : dayInCycle <= 15 ? "ovulation" : "luteal";
    const phaseEffect = phase === "menstrual" ? -0.6 : phase === "luteal" ? -0.25 : phase === "follicular" ? 0.2 : 0;

    const coldDamp = coldHot <= 2 && dryWet.includes("damp");
    let energy =
      3.15 +
      (sleepHigh ? 0.55 : 0) -
      (sleepLow ? 0.85 : 0) -
      (prevSleepLow ? 0.35 : 0) -
      (stress - 3) * 0.3 +
      (exercise === "yes" ? 0.45 : exercise === "no" ? -0.1 : 0) -
      (coldDamp ? 0.75 : 0) +
      phaseEffect +
      gainIds.length * 0.08 -
      drainIds.length * 0.18 +
      (rand() - 0.5) * 1.1;
    energy = clamp(energy);

    const lowDay = energy <= 2 || coldDamp;
    const outcomeFor = (id: string): Outcome | null => {
      const adaptive = ["early", "lessen", "warm", "dietadj", "walk", "quiet"].includes(id);
      if (!adaptive && !lowDay) return null;
      if (!lowDay && rand() < 0.7) return null;
      const good = id === "warm" && coldHot <= 2 ? 0.8 : id === "early" || id === "lessen" ? 0.6 : 0.4;
      const roll = rand();
      if (roll < 0.15) return null;
      if (roll < 0.15 + good * 0.85) return "better";
      return roll < 0.9 ? "same" : "worse";
    };
    const events: EventEntry[] = [
      ...gainIds.map((id) => ({
        tagId: id,
        points: (rand() < 0.15 ? 2 : 1) as 1 | 2,
        outcome: outcomeFor(id),
      })),
      ...drainIds.map((id) => ({
        tagId: id,
        points: (rand() < 0.15 ? 2 : 1) as 1 | 2,
        outcome: null,
      })),
    ];

    const minimal = rand() < 0.12;
    day.energy = energy;
    day.events = events;
    if (!minimal) {
      day.mood = clamp(energy + (rand() - 0.5) * 1.6);
      day.stress = stress;
      if (rand() < 0.72) day.sleepHours = sleepHours;
      if (day.sleepHours !== null && rand() < 0.7) day.sleepQuality = clamp(sleepHigh ? 4 : sleepLow ? 2 : 3 + (rand() - 0.5) * 1.5);
      day.exercise = exercise;
      if (exercise === "yes" && rand() < 0.7) day.exerciseLevel = pick([1, 2, 2, 3]) as 1 | 2 | 3;
      if (rand() < 0.5) {
        const diet = [pick(["规律", "外卖", "油腻", "甜食", "咖啡因多", "酒精"])];
        if (rand() < 0.3) diet.push(pick(["外卖", "甜食", "咖啡因多"]));
        day.diet = [...new Set(diet)];
      }
      if (rand() < 0.7) day.cycle = phase;
      if (rand() < 0.78) day.coldHot = coldHot;
      if (rand() < 0.72) day.dryWet = dryWet;
      if (rand() < 0.32) day.stomach = energy <= 2 ? pick(STOMACH_LOW) : pick(STOMACH_OK);
      if (rand() < (energy <= 2 ? 0.5 : 0.12)) day.bodyTags = [pick(DEMO_BODY_TAGS)];
      if (rand() < 0.12) day.note = pick(NOTES);
      if (rand() < 0.15) {
        const base = d.getTime() + 9 * 3600_000;
        day.moments = [
          { ts: base, energy: clamp(energy + 0.6) },
          { ts: base + 6 * 3600_000, energy: clamp(energy - 0.4) },
        ];
      }
    } else {
      day.stress = null;
    }
    day.savedAt = d.getTime() + 21 * 3600_000;
    day.updatedAt = day.savedAt;
    days.push(day);
    prevSleepLow = sleepLow;
    prevEnergy = energy;
  }
  return days;
}

export async function loadDemo() {
  await ensureInit();
  const demoDays = generateDemoDays();
  const existing = new Set((await db.days.toArray()).filter((d) => !d.demo).map((d) => d.date));
  await db.days.bulkPut(demoDays.filter((d) => !existing.has(d.date)));
  const s = await db.settings.get("main");
  await updateSettings({
    demoOffered: true,
    bodyTags: [...new Set([...(s?.bodyTags ?? []), ...DEMO_BODY_TAGS])],
  });
}

export async function clearDemo() {
  const demoDates = (await db.days.toArray()).filter((d) => d.demo).map((d) => d.date);
  await db.days.bulkDelete(demoDates);
  const s = await db.settings.get("main");
  await updateSettings({
    demoOffered: true,
    bodyTags: (s?.bodyTags ?? []).filter((t) => !DEMO_BODY_TAGS.includes(t)),
  });
}

export async function hasDemoData(): Promise<boolean> {
  return (await db.days.toArray()).some((d) => d.demo);
}

/** 首次打开且没有任何记录时,载入示例数据方便先看效果;之后不会再自动载入。 */
export async function maybeSeedDemo() {
  const s = await db.settings.get("main");
  if (s?.demoOffered ?? DEFAULT_SETTINGS.demoOffered) return;
  if ((await db.days.count()) === 0) await loadDemo();
  else await updateSettings({ demoOffered: true });
}
