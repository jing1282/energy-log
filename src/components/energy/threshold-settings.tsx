"use client";

import { Minus, Plus } from "lucide-react";
import { updateSettings } from "@/lib/actions";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import type { Settings } from "@/lib/types";

function Stepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`${label}减一`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-9 items-center justify-center rounded-xl bg-muted disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-9 text-center text-base font-semibold tabular-nums" aria-label={label}>
          {value}
        </span>
        <button
          type="button"
          aria-label={`${label}加一`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-9 items-center justify-center rounded-xl bg-muted disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function ThresholdSettings({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        近期收支 = 最近 7 个自然日的赋能总分 − 耗能总分。下面的阈值只决定提示的档位和文案,可以按你的体感调整,三档不是评分。
      </p>
      <Stepper
        label="充足线"
        hint={`近 7 天收支大于等于 ${settings.plentyMin} 时提示“充足”`}
        value={settings.plentyMin}
        min={settings.overdrawnMax + 1}
        max={20}
        onChange={(v) => updateSettings({ plentyMin: v })}
      />
      <Stepper
        label="透支线"
        hint={`近 7 天收支小于等于 ${settings.overdrawnMax} 时提示“透支”,其间为“偏低”`}
        value={settings.overdrawnMax}
        min={-20}
        max={settings.plentyMin - 1}
        onChange={(v) => updateSettings({ overdrawnMax: v })}
      />
      <Stepper
        label="精力偏低线"
        hint={`自评精力小于等于 ${settings.lowEnergyMax} 时,即使收支为正也会提示休息,也用于趋势和线索中的“低谷”`}
        value={settings.lowEnergyMax}
        min={1}
        max={3}
        onChange={(v) => updateSettings({ lowEnergyMax: v })}
      />
      <button
        type="button"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        onClick={() =>
          updateSettings({
            plentyMin: DEFAULT_SETTINGS.plentyMin,
            overdrawnMax: DEFAULT_SETTINGS.overdrawnMax,
            lowEnergyMax: DEFAULT_SETTINGS.lowEnergyMax,
          })
        }
      >
        恢复默认阈值
      </button>
    </div>
  );
}
