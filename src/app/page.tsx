"use client";

import { CheckInForm } from "@/components/energy/check-in-form";
import { LoadingBlocks } from "@/components/energy/page-shell";
import { lastReference } from "@/lib/account";
import { dateKey, longLabel } from "@/lib/dates";
import { emptyDay } from "@/lib/defaults";
import { useAppData, useStorageFailed } from "@/lib/hooks";
import { seasonOf } from "@/lib/solar-terms";

function HomeSkeleton() {
  const failed = useStorageFailed();
  if (failed) return <LoadingBlocks />;
  return (
    <main className="space-y-4 px-4 pb-28 pt-6" aria-busy="true" aria-label="正在载入">
      <div className="h-12 w-48 animate-pulse rounded-xl bg-card/70" />
      <div className="h-[640px] animate-pulse rounded-[24px] bg-card/70" />
    </main>
  );
}

export default function HomePage() {
  const data = useAppData();
  if (!data) return <HomeSkeleton />;

  const key = dateKey(new Date());
  const record = data.records[key] ?? emptyDay(key);
  const last = lastReference(data.records, key);

  return (
    <main className="space-y-4 px-4 pb-28 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">今天，过得怎么样？</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {longLabel(key)} · {seasonOf(key).label}
        </p>
      </header>
      <CheckInForm record={record} last={last} data={data} />
    </main>
  );
}
