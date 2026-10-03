"use client";

import { useState } from "react";
import { Check, ChevronDown, History, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddChip, Chip, Section } from "@/components/energy/ui-bits";
import {
  addBodyTagOption,
  addDietTag,
  addMoment,
  applyLastRatings,
  removeMoment,
  saveDay,
  setCycle,
  setColdHot,
  setEventOutcome,
  setEventPoints,
  setExercise,
  setMetric,
  setNote,
  setSleepHours,
  setStomach,
  toggleBodyTag,
  toggleDiet,
  toggleDryWet,
  toggleEvent,
  toggleField,
} from "@/lib/actions";
import { COLD_HOT, CYCLE_PHASES, METRICS, OUTCOME_LABEL, SLEEP_OPTIONS, type MetricKey } from "@/lib/defaults";
import { shortLabel } from "@/lib/dates";
import type { AppData, DayRecord, Outcome, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

const METRIC_STYLE: Record<MetricKey, { on: string; text: string; ring: string }> = {
  energy: { on: "bg-teal-600 text-white shadow-teal-600/30", text: "text-teal-700", ring: "ring-teal-600/40" },
  mood: { on: "bg-amber-500 text-white shadow-amber-500/30", text: "text-amber-700", ring: "ring-amber-500/40" },
  stress: { on: "bg-violet-500 text-white shadow-violet-500/30", text: "text-violet-700", ring: "ring-violet-500/40" },
};

function ScaleRow({
  label,
  hint,
  words,
  value,
  last,
  styleKey,
  onPick,
}: {
  label: string;
  hint: string;
  words: string[];
  value: number | null;
  last: number | null;
  styleKey: MetricKey;
  onPick: (n: number) => void;
}) {
  const style = METRIC_STYLE[styleKey];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        </div>
        <span className={cn("text-xs font-medium", style.text)}>{value ? words[value - 1] : "点选 1 到 5"}</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          const isLast = last === n && !active;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(n)}
              className={cn(
                "h-11 rounded-2xl text-base font-semibold tabular-nums transition-all active:scale-95",
                active ? cn(style.on, "shadow-lg") : "bg-muted text-muted-foreground hover:bg-accent",
                isLast && cn("ring-2 ring-dashed", style.ring),
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagChip({ tag, points, onToggle }: { tag: Tag; points?: number; onToggle: () => void }) {
  const selected = points !== undefined;
  const gain = tag.kind === "gain";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-all active:scale-95",
        selected
          ? gain
            ? "border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/25"
            : "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/25"
          : "border-border bg-card text-foreground/80 hover:bg-accent",
      )}
    >
      <span className="text-base leading-none">{tag.emoji}</span>
      {tag.name}
      {selected && (
        <span className="rounded-full bg-white/25 px-1.5 text-[11px] tabular-nums">
          {gain ? "+" : "−"}
          {points}
        </span>
      )}
    </button>
  );
}

function PointsRow({ date, tag, points }: { date: string; tag: Tag; points: number }) {
  const gain = tag.kind === "gain";
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-muted/70 py-1.5 pl-3 pr-1.5">
      <span className="text-base leading-none">{tag.emoji}</span>
      <span className="flex-1 truncate text-[13px] font-medium">{tag.name}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={`${tag.name}的分值`}>
        {([1, 2, 3] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={points === p}
            onClick={() => setEventPoints(date, tag.id, p)}
            className={cn(
              "h-8 w-10 rounded-xl text-xs font-semibold tabular-nums transition-all active:scale-95",
              points === p ? (gain ? "bg-teal-600 text-white" : "bg-orange-500 text-white") : "bg-card text-muted-foreground",
            )}
          >
            {gain ? "+" : "−"}
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function FreeText({
  value,
  placeholder,
  rows,
  label,
  onSave,
  resetKey,
}: {
  value: string | null;
  placeholder: string;
  rows: number;
  label: string;
  onSave: (text: string) => void;
  resetKey: string;
}) {
  const [text, setText] = useState(value ?? "");
  return (
    <textarea
      key={resetKey}
      aria-label={label}
      value={text}
      rows={rows}
      maxLength={300}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== (value ?? "") && onSave(text)}
      className="w-full resize-none rounded-2xl border border-border bg-card px-3.5 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-ring/40"
    />
  );
}

function BodySection({ record, data }: { record: DayRecord; data: AppData }) {
  const date = record.date;
  const bodyOptions = [...new Set([...data.settings.bodyTags, ...(record.bodyTags ?? [])])];
  const dryWet = record.dryWet;
  const noneActive = dryWet !== null && dryWet.length === 0;
  return (
    <div className="space-y-5">
      <Section title="冷热体感" hint="你自己觉得冷还是热,不填就不计">
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="冷热体感">
          {COLD_HOT.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={record.coldHot === o.value}
              onClick={() => setColdHot(date, o.value)}
              className={cn(
                "h-10 rounded-2xl text-[13px] font-medium transition-all active:scale-95",
                record.coldHot === o.value
                  ? o.value < 3
                    ? "bg-sky-500 text-white"
                    : o.value === 3
                      ? "bg-teal-600 text-white"
                      : "bg-orange-500 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="燥湿体感" hint="可以同时选燥和湿">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!!dryWet?.includes("dry")} onClick={() => toggleDryWet(date, "dry")}>
            燥
          </Chip>
          <Chip active={!!dryWet?.includes("damp")} onClick={() => toggleDryWet(date, "damp")}>
            湿
          </Chip>
          <Chip active={noneActive} onClick={() => toggleDryWet(date, "none")}>
            都不明显
          </Chip>
        </div>
      </Section>

      <Section title="身体状况" hint="用自己的话写下此刻的感受,写这个动作本身就是一次觉察">
        <FreeText
          label="胃部感受"
          value={record.stomach}
          resetKey={date}
          rows={2}
          placeholder="胃部此刻是什么感觉?没有标准答案,想到什么写什么"
          onSave={(t) => setStomach(date, t)}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bodyOptions.map((t) => (
            <Chip key={t} active={!!record.bodyTags?.includes(t)} onClick={() => toggleBodyTag(date, t)}>
              {t}
            </Chip>
          ))}
          <AddChip
            placeholder="身体标签"
            onAdd={async (name) => {
              await addBodyTagOption(name);
              await toggleBodyTag(date, name);
            }}
          />
        </div>
      </Section>


      <Section title="生理周期" hint="可不填;未选就是未记录">
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="生理周期">
          {CYCLE_PHASES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={record.cycle === c.value}
              onClick={() => setCycle(date, c.value)}
              className={cn(
                "h-10 rounded-2xl text-[13px] font-medium transition-all active:scale-95",
                record.cycle === c.value ? "bg-rose-400 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function MoreSection({ record, last, data }: { record: DayRecord; last: DayRecord | undefined; data: AppData }) {
  const date = record.date;
  const gainEvents = record.events.filter((e) => data.tagMap[e.tagId]?.kind === "gain");
  const dietOptions = [...new Set([...data.settings.dietTags, ...(record.diet ?? [])])];
  const canApplyLast = !!last && METRICS.some((m) => record[m.key] === null && last[m.key] !== null);
  return (
    <div className="space-y-5 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
      {last && (
        <div className="flex items-center gap-2 rounded-2xl bg-muted/70 py-2 pl-3 pr-2 text-xs">
          <History className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-muted-foreground">
            上次({shortLabel(last.date)}):
            {METRICS.filter((m) => last[m.key] !== null)
              .map((m) => ` ${m.label} ${last[m.key]}`)
              .join(" ·")}
          </span>
          <button
            type="button"
            disabled={!canApplyLast}
            onClick={() => applyLastRatings(date, last)}
            className="h-8 shrink-0 rounded-full bg-card px-3 text-xs font-medium text-primary shadow-sm transition-all active:scale-95 disabled:text-muted-foreground disabled:opacity-60"
          >
            沿用上次评分
          </button>
        </div>
      )}
      {METRICS.filter((m) => m.key !== "energy").map((m) => (
        <ScaleRow
          key={m.key}
          label={m.label}
          hint={m.hint}
          words={m.words}
          value={record[m.key]}
          last={last?.[m.key] ?? null}
          styleKey={m.key}
          onPick={(n) => setMetric(date, m.key, n)}
        />
      ))}
      {last && <p className="-mt-2 text-[11px] text-muted-foreground">虚线圈是上次的评分,只作参考,点选后才会记入。</p>}

      <Section title="睡眠" hint="睡了多久,不填就不计">
        <div className="flex flex-wrap gap-1.5">
          {SLEEP_OPTIONS.map((o) => (
            <Chip key={o.value} active={record.sleepHours === o.value} onClick={() => setSleepHours(date, o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          睡得好不好
          <div className="grid flex-1 grid-cols-5 gap-1.5" role="radiogroup" aria-label="睡眠质量">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={record.sleepQuality === n}
                onClick={() => toggleField(date, "sleepQuality", n)}
                className={cn(
                  "h-8 rounded-xl text-xs font-semibold tabular-nums transition-all active:scale-95",
                  record.sleepQuality === n ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="锻炼" hint="没点选就是没记录,不会当成没锻炼">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={record.exercise === "yes"} onClick={() => setExercise(date, "yes")}>
            今天锻炼了
          </Chip>
          <Chip active={record.exercise === "no"} onClick={() => setExercise(date, "no")}>
            今天没锻炼
          </Chip>
          {record.exercise === "yes" &&
            ([1, 2, 3] as const).map((l) => (
              <Chip key={l} active={record.exerciseLevel === l} onClick={() => toggleField(date, "exerciseLevel", l)}>
                {["轻度", "中度", "高强度"][l - 1]}
              </Chip>
            ))}
        </div>
      </Section>

      <Section title="饮食" hint="可多选,也可以自定义">
        <div className="flex flex-wrap gap-1.5">
          {dietOptions.map((t) => (
            <Chip key={t} active={!!record.diet?.includes(t)} onClick={() => toggleDiet(date, t)}>
              {t}
            </Chip>
          ))}
          <AddChip
            placeholder="饮食标签"
            onAdd={async (name) => {
              await addDietTag(name);
              await toggleDiet(date, name);
            }}
          />
        </div>
      </Section>

      <Section title="今天的调整" hint="和上面“让我充电的事”共用标签,不用重复填">
        {gainEvents.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            先在上面选一件让你充电的事(例如早点休息、保暖),这里就能记下它帮没帮到你。
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              试过之后感觉如何?可以晚点再补。原本想充电却没有帮助的时候,选“差不多”或“更不舒服”也很有价值。
            </p>
            {gainEvents.map((e) => {
              const tag = data.tagMap[e.tagId];
              return (
                <div key={e.tagId} className="rounded-2xl bg-muted/70 px-3 py-2">
                  <div className="text-[13px] font-medium">
                    {tag.emoji} {tag.name}
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={e.outcome === o}
                        onClick={() => setEventOutcome(date, e.tagId, o)}
                        className={cn(
                          "h-8 flex-1 rounded-xl text-xs font-medium transition-all active:scale-95",
                          e.outcome === o
                            ? o === "better"
                              ? "bg-teal-600 text-white"
                              : o === "same"
                                ? "bg-slate-500 text-white"
                                : "bg-orange-500 text-white"
                            : "bg-card text-muted-foreground",
                        )}
                      >
                        {OUTCOME_LABEL[o]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="随手记当下精力" hint="一天里可以多次,不强制">
        <div className="flex flex-wrap items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`此刻精力 ${n}`}
              onClick={() => addMoment(date, n)}
              className="size-9 rounded-full bg-muted text-sm font-semibold tabular-nums text-muted-foreground transition-all active:scale-90"
            >
              {n}
            </button>
          ))}
        </div>
        {record.moments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {record.moments.map((m) => (
              <button
                key={m.ts}
                type="button"
                onClick={() => removeMoment(date, m.ts)}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                title="点一下删除"
              >
                {new Date(m.ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} · {m.energy}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="备注">
        <FreeText
          label="备注"
          value={record.note}
          resetKey={date}
          rows={2}
          placeholder="想说的一句话,可以不写"
          onSave={(t) => setNote(date, t)}
        />
      </Section>
    </div>
  );
}

const FEEDBACK = [
  "记下来了。看见自己,本身就是在照顾自己。",
  "谢谢你停下来看看自己。今天先到这里就好。",
  "已经足够了,剩下的时间留给自己。",
];

export function CheckInForm({
  record,
  last,
  data,
  title = "今日打卡",
}: {
  record: DayRecord;
  last: DayRecord | undefined;
  data: AppData;
  title?: string;
}) {
  const date = record.date;
  const [open, setOpen] = useState(false);
  const active = data.tags.filter((t) => !t.archived || record.events.some((e) => e.tagId === t.id));
  const gains = active.filter((t) => t.kind === "gain");
  const drains = active.filter((t) => t.kind === "drain");
  const pointsOf = (id: string) => record.events.find((e) => e.tagId === id)?.points;
  const chosen = record.events.filter((e) => data.tagMap[e.tagId]);
  const energyMeta = METRICS[0];

  const moreCount = [
    record.mood,
    record.stress,
    record.sleepHours,
    record.sleepQuality,
    record.exercise,
    record.diet,
    record.note,
    record.moments.length ? 1 : null,
    record.events.some((e) => e.outcome !== null) ? 1 : null,
  ].filter((v) => v !== null).length;
  const hasAny =
    record.energy !== null ||
    record.mood !== null ||
    record.stress !== null ||
    record.events.length > 0 ||
    moreCount > 0 ||
    record.coldHot !== null ||
    record.dryWet !== null ||
    record.stomach !== null ||
    record.bodyTags !== null ||
    record.cycle !== null;
  const saved = record.savedAt !== null;
  const dirty = !saved || (record.updatedAt ?? 0) > (record.savedAt ?? 0);
  const savedGains = record.events.filter((e) => data.tagMap[e.tagId]?.kind === "gain");
  const feedback = FEEDBACK[Number(date.slice(-2)) % FEEDBACK.length];

  return (
    <Card className="rounded-[24px] border-0 bg-card/90 shadow-[0_10px_30px_-18px_oklch(0.4_0.06_180/0.5)] ring-0">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-semibold">{title}</CardTitle>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              saved && !dirty ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {saved && !dirty && <Check className="size-3" />}
            {saved && !dirty ? "已保存" : "每一项都可以跳过"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h2 className="mb-3 text-sm font-semibold">身体觉察</h2>
          <BodySection record={record} data={data} />
        </div>

        <div className="border-t border-dashed border-border pt-4">
          <ScaleRow
            label={energyMeta.label}
            hint={energyMeta.hint}
            words={energyMeta.words}
            value={record.energy}
            last={null}
            styleKey="energy"
            onPick={(n) => setMetric(date, "energy", n)}
          />
        </div>

        <div className="space-y-4 border-t border-dashed border-border pt-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <span className="flex size-5 items-center justify-center rounded-full bg-teal-600/12 text-teal-700">
                <Plus className="size-3.5" strokeWidth={3} />
              </span>
              赋能事件
              <span className="text-[11px] font-normal text-muted-foreground">让我充电的事 · 存入</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gains.map((t) => (
                <TagChip key={t.id} tag={t} points={pointsOf(t.id)} onToggle={() => toggleEvent(date, t)} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <span className="flex size-5 items-center justify-center rounded-full bg-orange-500/12 text-orange-600">
                <span className="mb-0.5 text-base font-bold leading-none">−</span>
              </span>
              耗能事件
              <span className="text-[11px] font-normal text-muted-foreground">消耗我的事 · 支出</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {drains.map((t) => (
                <TagChip key={t.id} tag={t} points={pointsOf(t.id)} onToggle={() => toggleEvent(date, t)} />
              ))}
            </div>
          </div>

          {chosen.length > 0 && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-[11px] text-muted-foreground">默认记 1 分,觉得影响更大可以调到 2 或 3 分。标签每天重新选择。</p>
              {chosen.map((e) => (
                <PointsRow key={e.tagId} date={date} tag={data.tagMap[e.tagId]} points={e.points} />
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            disabled={!hasAny || !dirty}
            onClick={() => saveDay(date)}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98]",
              hasAny && dirty ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-muted text-muted-foreground",
            )}
          >
            {saved && !dirty ? (
              <>
                <Check className="size-4" />
                已保存
              </>
            ) : saved ? (
              "保存修改"
            ) : (
              "保存记录"
            )}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {hasAny ? "填写时已自动暂存在本机" : "只记一个分数也可以,不用填完"}
          </p>
          {saved && !dirty && (
            <div className="mt-3 rounded-2xl bg-secondary/70 px-3.5 py-3 animate-in fade-in slide-in-from-top-1">
              <p className="text-[13px] leading-relaxed text-secondary-foreground">{feedback}</p>
              {savedGains.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {savedGains.map((e) => (
                    <span key={e.tagId} className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-teal-700">
                      {data.tagMap[e.tagId].emoji} {data.tagMap[e.tagId].name} +{e.points}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-border pt-1">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-2 py-1 text-left text-sm font-medium"
          >
            <span>
              更多
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                情绪、压力、睡眠、锻炼、饮食、调整、随手记、备注 · 选填
                {moreCount > 0 && ` · 已填 ${moreCount} 项`}
              </span>
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
          {open && <MoreSection record={record} last={last} data={data} />}
        </div>
      </CardContent>
    </Card>
  );
}
