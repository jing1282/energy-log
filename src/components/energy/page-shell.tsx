"use client";

import { useStorageFailed } from "@/lib/hooks";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="space-y-4 px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </main>
  );
}

export function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] bg-card/90 p-5 shadow-[0_10px_30px_-18px_oklch(0.4_0.06_180/0.5)]">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function LoadingBlocks() {
  const failed = useStorageFailed();
  if (failed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-8 pb-24 text-center">
        <h1 className="text-lg font-semibold">没有办法使用本机存储</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          这个应用把数据保存在浏览器的本地数据库里。当前环境(可能是隐私浏览模式)不允许写入。请换成普通浏览模式,或者把它添加到主屏幕后再打开。
        </p>
      </main>
    );
  }
  return (
    <main className="space-y-4 px-4 pb-28 pt-6" aria-busy="true" aria-label="正在载入">
      <div className="h-24 animate-pulse rounded-[24px] bg-card/70" />
      <div className="h-64 animate-pulse rounded-[24px] bg-card/70" />
    </main>
  );
}
