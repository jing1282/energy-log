"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { coldHotLabel } from "@/lib/analysis";
import { longLabel } from "@/lib/dates";
import type { Records } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RawRecords({
  dates,
  records,
  label,
}: {
  dates: string[];
  records: Records;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (dates.length === 0) return null;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-8 items-center gap-1 text-xs text-primary"
      >
        {label ?? "查看原始记录"}({dates.length} 条)
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mt-1 space-y-1 animate-in fade-in">
          {[...dates].reverse().map((d) => {
            const r = records[d];
            const bits = [
              r?.energy !== null && r?.energy !== undefined ? `精力 ${r.energy}` : null,
              coldHotLabel(r?.coldHot ?? null),
              r?.dryWet ? (r.dryWet.length ? r.dryWet.map((x) => (x === "dry" ? "燥" : "湿")).join("、") : "燥湿不明显") : null,
              r?.sleepHours != null ? `睡 ${r.sleepHours} 小时` : null,
            ].filter(Boolean);
            return (
              <li key={d}>
                <Link href={`/day/?d=${d}`} className="block rounded-xl bg-muted/60 px-3 py-2 text-xs active:bg-muted">
                  <span className="font-medium">{longLabel(d)}</span>
                  <span className="ml-2 text-muted-foreground">{bits.join(" · ")}</span>
                  {r?.stomach && <span className="mt-0.5 block text-muted-foreground">胃部:{r.stomach}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
