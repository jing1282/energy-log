"use client";
import { useRef, useState } from "react";
import { addPersonalEvent, toggleEvent } from "@/lib/actions";
import type { AppData, DayRecord, Tag, TagKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PersonalEvents({ kind, tags, record, data }: { kind: TagKind; tags: Tag[]; record: DayRecord; data: AppData }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(false);
  const locked = useRef(false);
  const gain = kind === "gain";
  const selected = new Set(record.events.map((e) => e.tagId));
  const frequency = new Map<string, number>();
  for (const day of Object.values(data.records)) {
    if (day.demo || day.date > record.date) continue;
    for (const event of day.events) frequency.set(event.tagId, (frequency.get(event.tagId) ?? 0) + 1);
  }
  const unselected = tags.filter((t) => !selected.has(t.id));
  const usual = unselected.filter((t) => frequency.has(t.id)).sort((a, b) => (frequency.get(b.id) ?? 0) - (frequency.get(a.id) ?? 0) || a.order - b.order).slice(0, 3);
  const visible = [...tags.filter((t) => selected.has(t.id)), ...(expanded ? unselected : usual)];
  const hiddenCount = unselected.length - usual.length;

  async function add() {
    if (locked.current || !text.trim()) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const name = await addPersonalEvent(record.date, text, kind);
      setText(""); setNotice(`已选入：${name}。保存记录后计入当天。`);
    } catch (e) { setError(e instanceof Error ? e.message : "添加未成功，请重试；输入内容已保留。"); }
    finally { locked.current = false; setBusy(false); }
  }
  return <div className="space-y-3">
    <p className="text-xs leading-relaxed text-muted-foreground">{gain ? "什么小事让你恢复了一点？由你来定义，不必是很大的行动。" : "写下今天消耗你的一件事，也可以留空。"}</p>
    <div className="flex items-start gap-2">
      <textarea aria-label={gain ? "赋能小事" : "消耗事件"} placeholder={gain ? "例如：累的时候，允许自己先休息十分钟" : "例如：临时多接了一件任务"} rows={2} maxLength={60} disabled={busy} value={text}
        onChange={(e) => { setText(e.target.value); setNotice(""); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); void add(); } }}
        className="min-w-0 flex-1 resize-none rounded-2xl border border-border bg-muted/50 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <button type="button" disabled={busy || !text.trim()} onClick={add} className="min-h-11 shrink-0 rounded-xl bg-primary px-3 text-sm text-primary-foreground disabled:opacity-40">{busy ? "添加中" : "添加"}</button>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    {notice && <p role="status" className="break-words text-xs text-primary">{notice}</p>}
    {visible.length > 0 && <div className="flex flex-wrap gap-2">{visible.map((tag) => {
      const picked = selected.has(tag.id);
      return <button key={tag.id} type="button" aria-pressed={picked} onClick={async () => {
        try { await toggleEvent(record.date, tag); setError(""); setNotice(""); }
        catch { setError("选择未保存，请再试一次。"); }
      }} className={cn("min-h-10 max-w-full rounded-2xl border px-3 py-2 text-left text-[13px] leading-relaxed break-words", picked ? gain ? "border-teal-600 bg-teal-600 text-white" : "border-orange-500 bg-orange-500 text-white" : "border-border bg-card text-muted-foreground")}>
        {tag.emoji} {tag.name}{picked ? " ✓" : ""}
      </button>;
    })}</div>}
    {hiddenCount > 0 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-9 text-xs text-muted-foreground underline underline-offset-4">{expanded ? "收起其他选项" : `从已有小事中选择（另 ${hiddenCount} 项）`}</button>}
    <p className="text-[11px] text-muted-foreground">自己写的小事会留下来，之后可以再次选择。</p>
  </div>;
}
