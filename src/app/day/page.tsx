"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CheckInForm } from "@/components/energy/check-in-form";
import { LoadingBlocks, PageShell } from "@/components/energy/page-shell";
import { lastReference } from "@/lib/account";
import { addDaysKey, dateKey, longLabel } from "@/lib/dates";
import { emptyDay } from "@/lib/defaults";
import { useAppData } from "@/lib/hooks";
import { seasonOf } from "@/lib/solar-terms";

function DayView() {
  const params = useSearchParams();
  const data = useAppData();
  const raw = params.get("d");
  const key = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : dateKey(new Date());
  if (!data) return <LoadingBlocks />;

  const record = data.records[key] ?? emptyDay(key);
  const last = lastReference(data.records, key);
  const season = seasonOf(key);
  const isToday = key === dateKey(new Date());

  return (
    <PageShell
      title={longLabel(key)}
      subtitle={`${season.label}${record.demo ? " · 示例数据" : ""}${data.records[key] ? "" : " · 这一天还没有记录"}。可以在这里补填或修改。`}
    >
      <div className="-mt-2 flex items-center justify-between px-1 text-sm text-primary">
        <Link href={isToday ? "/" : "/account/"} className="flex items-center gap-0.5">
          <ChevronLeft className="size-4" />
          返回
        </Link>
        <span className="flex gap-4">
          <Link href={`/day/?d=${addDaysKey(key, -1)}`}>前一天</Link>
          {key < dateKey(new Date()) && <Link href={`/day/?d=${addDaysKey(key, 1)}`}>后一天</Link>}
        </span>
      </div>
      <CheckInForm record={record} last={last} data={data} title="当天记录" />
    </PageShell>
  );
}

export default function DayPage() {
  return (
    <Suspense fallback={<LoadingBlocks />}>
      <DayView />
    </Suspense>
  );
}
