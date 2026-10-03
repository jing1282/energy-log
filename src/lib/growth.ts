import type { DayRecord, Settings, Tag } from "./types";

export function careTags(day: DayRecord, tags: Record<string, Tag>): string[] {
  if (!day.savedAt || day.demo) return [];
  return [...new Set(day.savedCareTags ?? day.events.filter((e) => tags[e.tagId]?.kind === "gain").map((e) => e.tagId))];
}
export function growthStage(count: number) {
  return count >= 21 ? 3 : count >= 7 ? 2 : count >= 1 ? 1 : 0;
}
export function isPlantNight(hour: number, settings: Settings) {
  if (settings.plantMode === "day") return false;
  if (settings.plantMode === "night") return true;
  const start = settings.plantDayStart ?? 7;
  const end = settings.plantDayEnd ?? 21;
  const day = start === end || (start < end ? hour >= start && hour < end : hour >= start || hour < end);
  return !day;
}
