import { db, ensureInit, readDays } from "./db";
import { DEFAULT_SETTINGS, DEFAULT_TAGS, normalizeDay } from "./defaults";
import { updateSettings } from "./actions";
import type { BackupFile, DayRecord, Settings, Tag } from "./types";

export async function buildBackup(): Promise<BackupFile> {
  await ensureInit();
  const [days, tags, settings] = await Promise.all([
    readDays(),
    db.tags.toArray(),
    db.settings.get("main"),
  ]);
  return {
    app: "energy-ledger",
    version: 1,
    exportedAt: new Date().toISOString(),
    days,
    tags,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

export async function exportBackup(): Promise<string> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `能量记录备份-${stamp}.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  await updateSettings({ lastBackupAt: Date.now() });
  return filename;
}

export interface ParsedBackup {
  days: DayRecord[];
  tags: Tag[];
  settings: Settings;
}

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("文件不是有效的 JSON。");
  }
  const obj = raw as Partial<BackupFile>;
  if (!obj || obj.app !== "energy-ledger" || !Array.isArray(obj.days)) {
    throw new Error("这不是能量记录的备份文件。");
  }
  const days = obj.days
    .filter((d): d is DayRecord => !!d && typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .map((d) => normalizeDay(d));
  const tags = Array.isArray(obj.tags) ? obj.tags.filter((t) => t && typeof t.id === "string") : [];
  return { days, tags, settings: { ...DEFAULT_SETTINGS, ...obj.settings, key: "main" } };
}

export async function importBackup(parsed: ParsedBackup, mode: "merge" | "replace") {
  await ensureInit();
  await db.transaction("rw", db.days, db.tags, db.settings, async () => {
    if (mode === "replace") {
      await db.days.clear();
      if (parsed.tags.length) await db.tags.clear();
    }
    await db.days.bulkPut(parsed.days);
    if (parsed.tags.length) await db.tags.bulkPut(parsed.tags);
    if (mode === "replace") await db.settings.put(parsed.settings);
  });
}

export async function clearAllData() {
  await db.transaction("rw", db.days, db.tags, db.settings, async () => {
    await db.days.clear();
    await db.tags.clear();
    await db.settings.clear();
    await db.tags.bulkAdd(DEFAULT_TAGS);
    await db.settings.put({ ...DEFAULT_SETTINGS, demoOffered: true });
  });
  location.reload();
}
