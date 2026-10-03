"use client";

import { useRef, useState } from "react";
import { Download, FlaskConical, Trash2, Upload } from "lucide-react";
import { clearAllData, exportBackup, importBackup, parseBackup, type ParsedBackup } from "@/lib/backup";
import { clearDemo, loadDemo } from "@/lib/demo";
import { requestPersistence } from "@/lib/db";
import type { Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

function ActionButton({
  icon: Icon,
  children,
  onClick,
  tone = "default",
  disabled,
}: {
  icon: typeof Download;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center gap-2 rounded-2xl px-4 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50",
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

export function DataBackup({ settings, demoPresent }: { settings: Settings; demoPresent: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    try {
      const text = await fn();
      if (text) setMessage({ text });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "操作失败,请再试一次。", error: true });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    await run(async () => {
      const parsed = parseBackup(await file.text());
      setPending(parsed);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        数据只保存在这台设备的浏览器里。换手机或清除网站数据会丢失,所以请定期导出备份。
        {settings.lastBackupAt
          ? ` 上次备份:${new Date(settings.lastBackupAt).toLocaleDateString("zh-CN")}。`
          : " 你还没有备份过。"}
      </p>
      {demoPresent && (
        <p className="rounded-xl bg-amber-100/80 px-3 py-2 text-[13px] leading-relaxed text-amber-900">
          当前包含示例数据(标注为示例的日子),你自己的记录会和它放在一起。想只看自己的记录,点下面的“清除示例数据”。
        </p>
      )}
      <div className="space-y-2">
        <ActionButton
          icon={Download}
          disabled={busy}
          onClick={() => run(async () => `已导出 ${await exportBackup()}`)}
        >
          导出 JSON 备份
        </ActionButton>
        <ActionButton icon={Upload} disabled={busy} onClick={() => fileRef.current?.click()}>
          导入 JSON 备份
        </ActionButton>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <ActionButton
          icon={FlaskConical}
          disabled={busy}
          onClick={() =>
            run(async () => {
              if (demoPresent) {
                await clearDemo();
                return "已清除示例数据,你自己的记录不受影响。";
              }
              await loadDemo();
              return "已载入示例数据(约 16 周),可以先体验趋势与洞察。";
            })
          }
        >
          {demoPresent ? "清除示例数据" : "载入示例数据"}
        </ActionButton>
        {demoPresent && (
          <ActionButton
            icon={FlaskConical}
            disabled={busy}
            onClick={() =>
              run(async () => {
                await clearDemo();
                await loadDemo();
                return "已重新载入最新的示例数据。";
              })
            }
          >
            重新载入示例数据
          </ActionButton>
        )}
        <ActionButton icon={Trash2} tone="danger" disabled={busy} onClick={() => setConfirmClear(true)}>
          清空全部数据
        </ActionButton>
      </div>

      {pending && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3.5 animate-in fade-in">
          <p className="text-sm font-medium">备份里有 {pending.days.length} 天的记录,怎么导入?</p>
          <p className="text-xs text-muted-foreground">
            合并:同一天以备份为准,其余保留。替换:先清空现在的全部记录再导入。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 flex-1 rounded-xl bg-primary text-sm font-medium text-primary-foreground"
              onClick={() =>
                run(async () => {
                  await importBackup(pending, "merge");
                  setPending(null);
                  return `已合并导入 ${pending.days.length} 天记录。`;
                })
              }
            >
              合并导入
            </button>
            <button
              type="button"
              className="h-10 flex-1 rounded-xl bg-muted text-sm font-medium"
              onClick={() =>
                run(async () => {
                  await importBackup(pending, "replace");
                  setPending(null);
                  return `已替换为备份中的 ${pending.days.length} 天记录。`;
                })
              }
            >
              替换全部
            </button>
            <button type="button" className="h-10 px-3 text-sm text-muted-foreground" onClick={() => setPending(null)}>
              取消
            </button>
          </div>
        </div>
      )}

      {confirmClear && (
        <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 animate-in fade-in">
          <p className="text-sm font-medium">确定清空全部记录、标签和设置吗?</p>
          <p className="text-xs text-muted-foreground">这个操作无法撤销,建议先导出备份。</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 flex-1 rounded-xl bg-destructive text-sm font-medium text-white"
              onClick={() => clearAllData()}
            >
              确定清空
            </button>
            <button type="button" className="h-10 flex-1 rounded-xl bg-muted text-sm font-medium" onClick={() => setConfirmClear(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={cn("text-[13px]", message.error ? "text-destructive" : "text-primary")}
        >
          {message.text}
        </p>
      )}
      <button
        type="button"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        onClick={() =>
          requestPersistence().then((ok) =>
            setMessage({ text: ok ? "已向浏览器申请保留数据。" : "浏览器没有给出保留承诺,请更依赖导出备份。" }),
          )
        }
      >
        请求浏览器长期保留数据
      </button>
    </div>
  );
}
