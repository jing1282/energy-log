"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  ensureInit,
  markStorageFailed,
  readDays,
  storageFailedSnapshot,
  subscribeStorageFailed,
} from "./db";
import { normalizeDay } from "./defaults";
import { maybeSeedDemo } from "./demo";
import type { AppData, Records } from "./types";

export function useAppData(): AppData | null {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    ensureInit()
      .then(() => maybeSeedDemo())
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        markStorageFailed();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const days = useLiveQuery(async () => (ready ? await readDays() : undefined), [ready]);
  const tags = useLiveQuery(async () => (ready ? await db.tags.toArray() : undefined), [ready]);
  const settings = useLiveQuery(async () => (ready ? await db.settings.get("main") : undefined), [ready]);

  return useMemo(() => {
    if (!days || !tags || !settings) return null;
    const records: Records = {};
    for (const d of days) records[d.date] = normalizeDay(d);
    const sorted = [...tags].sort((a, b) => a.order - b.order);
    return {
      records,
      tags: sorted,
      tagMap: Object.fromEntries(sorted.map((t) => [t.id, t])),
      settings,
    };
  }, [days, tags, settings]);
}

export function useStorageFailed() {
  return useSyncExternalStore(subscribeStorageFailed, storageFailedSnapshot, () => false);
}
