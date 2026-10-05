"use client";

import { useState } from "react";
import { Plus, Star, Trash2, X } from "lucide-react";
import { createTag, removeBodyOption, removeDietOption, saveTag } from "@/lib/actions";
import type { Points, Settings, Tag, TagKind } from "@/lib/types";
import { cn } from "@/lib/utils";

function TagRow({ tag }: { tag: Tag }) {
  const [name, setName] = useState(tag.name);
  const [emoji, setEmoji] = useState(tag.emoji);
  return (
    <li className="space-y-2 rounded-2xl bg-muted/60 p-2.5">
      <div className="flex items-center gap-2">
        <input
          aria-label="图标"
          value={emoji}
          maxLength={4}
          onChange={(e) => setEmoji(e.target.value)}
          onBlur={() => emoji !== tag.emoji && saveTag({ ...tag, emoji: emoji || "•" })}
          className="size-10 shrink-0 rounded-xl bg-card text-center text-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        <input
          aria-label="标签名"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== tag.name && saveTag({ ...tag, name: name.trim() })}
          className="h-10 min-w-0 flex-1 rounded-xl bg-card px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
        {tag.kind === "gain" && (
          <button
            type="button"
            aria-label={tag.favorite ? "取消收藏" : "收藏"}
            aria-pressed={tag.favorite}
            onClick={() => saveTag({ ...tag, favorite: !tag.favorite })}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card"
          >
            <Star className={cn("size-4", tag.favorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
          </button>
        )}
        <button
          type="button"
          aria-label={`删除${tag.name}`}
          onClick={() => saveTag({ ...tag, archived: true })}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
        默认分值
        <div className="flex gap-1" role="radiogroup" aria-label="默认分值">
          {([1, 2, 3] as Points[]).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={tag.points === p}
              onClick={() => saveTag({ ...tag, points: p })}
              className={cn(
                "h-7 w-9 rounded-lg text-xs font-semibold tabular-nums",
                tag.points === p ? (tag.kind === "gain" ? "bg-teal-600 text-white" : "bg-orange-500 text-white") : "bg-card",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

function NewTag({ kind }: { kind: TagKind }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const submit = async () => {
    if (!name.trim()) return;
    await createTag({ name: name.trim(), emoji: emoji.trim() || (kind === "gain" ? "✨" : "•"), kind, points: 1 });
    setName("");
    setEmoji("");
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center justify-center gap-1 rounded-2xl border border-dashed border-border text-sm text-muted-foreground"
      >
        <Plus className="size-4" />
        新增{kind === "gain" ? "赋能" : "耗能"}标签
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 animate-in fade-in">
      <input
        aria-label="新标签图标"
        placeholder="🙂"
        value={emoji}
        maxLength={4}
        onChange={(e) => setEmoji(e.target.value)}
        className="size-10 shrink-0 rounded-xl bg-muted text-center text-lg outline-none"
      />
      <input
        autoFocus
        aria-label="新标签名"
        placeholder="标签名称"
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="h-10 min-w-0 flex-1 rounded-xl bg-muted px-3 text-sm outline-none"
      />
      <button type="button" onClick={submit} className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
        添加
      </button>
    </div>
  );
}

export function TagManager({ tags }: { tags: Tag[] }) {
  const groups: { kind: TagKind; title: string }[] = [
    { kind: "gain", title: "赋能(让我充电)" },
    { kind: "drain", title: "耗能(消耗我)" },
  ];
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        赋能标签同时用于“今天的调整”(比如早点休息、保暖)。删除只是不再出现在选项里,以前的记录不受影响。
      </p>
      {groups.map((g) => (
        <div key={g.kind} className="space-y-2">
          <h3 className="text-sm font-semibold">{g.title}</h3>
          <ul className="space-y-2">
            {tags
              .filter((t) => t.kind === g.kind && !t.archived)
              .map((t) => (
                <TagRow key={t.id} tag={t} />
              ))}
          </ul>
          <NewTag kind={g.kind} />
        </div>
      ))}
    </div>
  );
}

export function OptionLists({ settings }: { settings: Settings }) {
  const lists = [
    { title: "饮食标签", items: settings.dietTags, remove: removeDietOption },
    { title: "身体标签", items: settings.bodyTags, remove: removeBodyOption },
  ];
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">在打卡的“更多细节”里点“自定义”添加,这里可以删除不再用的。</p>
      {lists.map((l) => (
        <div key={l.title}>
          <h3 className="mb-2 text-sm font-semibold">{l.title}</h3>
          {l.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">还没有自定义的。</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {l.items.map((item) => (
                <span key={item} className="flex h-8 items-center gap-1 rounded-full bg-muted pl-3 pr-1.5 text-[13px]">
                  {item}
                  <button type="button" aria-label={`删除${item}`} onClick={() => l.remove(item)} className="rounded-full p-1 text-muted-foreground">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
