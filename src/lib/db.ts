import Dexie, { type Table } from "dexie";
import { DEFAULT_SETTINGS, DEFAULT_TAGS, normalizeDay } from "./defaults";
import type { DayRecord, Settings, Tag } from "./types";

class EnergyDB extends Dexie {
  days!: Table<DayRecord, string>;
  tags!: Table<Tag, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("energy-ledger");
    this.version(1).stores({
      days: "date",
      tags: "id",
      settings: "key",
    });
  }
}

export const db = new EnergyDB();

let initPromise: Promise<void> | null = null;

/** 首次打开时写入默认标签和设置;每次读取都补齐结构。 */
export function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = db
      .transaction("rw", db.tags, db.settings, async () => {
        if ((await db.tags.count()) === 0) await db.tags.bulkAdd(DEFAULT_TAGS);
        const existing = await db.settings.get("main");
        if (!existing) await db.settings.put({ ...DEFAULT_SETTINGS });
        else await db.settings.put({ ...DEFAULT_SETTINGS, ...existing });
      })
      .catch((err) => {
        initPromise = null;
        throw err;
      });
  }
  return initPromise;
}

export async function readDays(): Promise<DayRecord[]> {
  const rows = await db.days.toArray();
  return rows.map((r) => normalizeDay(r));
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    // 不支持时忽略
  }
  return false;
}

let failed = false;
const failListeners = new Set<() => void>();

export function markStorageFailed() {
  failed = true;
  failListeners.forEach((l) => l());
}

export function subscribeStorageFailed(listener: () => void) {
  failListeners.add(listener);
  return () => {
    failListeners.delete(listener);
  };
}

export function storageFailedSnapshot() {
  return failed;
}
