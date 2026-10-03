"use client";
import { useState } from "react";
import { updateSettings } from "@/lib/actions";
import type { Settings } from "@/lib/types";

export function PlantSettings({ settings }: { settings: Settings }) {
  const [error, setError] = useState("");
  async function save(patch: Partial<Settings>) {
    try { await updateSettings(patch); setError(""); }
    catch { setError("设置未保存，请重试。"); }
  }
  const style = "mt-1 block h-11 w-full rounded-xl border bg-card px-3 text-sm";
  return <div className="space-y-4 text-sm">
    <label className="block">日夜展示<select className={style} value={settings.plantMode ?? "auto"} onChange={(e) => save({ plantMode: e.target.value as Settings["plantMode"] })}>
      <option value="auto">跟随本机时间</option><option value="day">一直是白天</option><option value="night">一直是夜晚</option>
    </select></label>
    {(settings.plantMode ?? "auto") === "auto" && <div className="grid grid-cols-2 gap-3">{(["plantDayStart", "plantDayEnd"] as const).map((key, i) => <label key={key}>{i === 0 ? "白天开始" : "夜晚开始"}<select className={style} value={settings[key] ?? (i === 0 ? 7 : 21)} onChange={(e) => save({ [key]: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}</select></label>)}</div>}
    <label className="block">动态效果<select className={style} value={settings.plantMotion ?? "system"} onChange={(e) => save({ plantMotion: e.target.value as Settings["plantMotion"] })}><option value="system">轻柔动画 · 遵循系统减少动态设置</option><option value="off">关闭动画</option></select></label>
    <p className="text-xs leading-relaxed text-muted-foreground">日夜只是小苗的陪伴方式，不判断你的睡眠。相同起止时间表示全天白天。漏记、疲惫或消耗都不会让它枯萎。示例记录不计入成长。</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
}
