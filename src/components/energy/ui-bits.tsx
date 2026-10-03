"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({
  active,
  onClick,
  children,
  tone = "teal",
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "teal" | "orange" | "violet";
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-3 text-[13px] font-medium transition-all active:scale-95",
        active
          ? tone === "teal"
            ? "border-teal-600 bg-teal-600 text-white"
            : tone === "orange"
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-violet-500 bg-violet-500 text-white"
          : "border-border bg-card text-foreground/80 hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-sm font-semibold">{title}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function AddChip({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const commit = () => {
    if (text.trim()) onAdd(text.trim());
    setText("");
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1 rounded-full border border-dashed border-border px-3 text-[13px] text-muted-foreground"
      >
        <Plus className="size-3.5" />
        自定义
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={text}
      maxLength={12}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setText("");
          setOpen(false);
        }
      }}
      className="h-9 w-32 rounded-full border border-border bg-card px-3 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    />
  );
}
