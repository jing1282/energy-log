"use client";

import { DataBackup } from "@/components/energy/data-backup";
import { LoadingBlocks, PageShell, SectionCard } from "@/components/energy/page-shell";
import { InstallHint } from "@/components/energy/install-hint";
import { OptionLists, TagManager } from "@/components/energy/tag-manager";
import { ThresholdSettings } from "@/components/energy/threshold-settings";
import { useAppData } from "@/lib/hooks";

export default function SettingsPage() {
  const data = useAppData();
  if (!data) return <LoadingBlocks />;
  return (
    <PageShell title="设置" subtitle="规则、标签、备份与示例数据。">
      <SectionCard title="近期收支与提示规则" hint="算法简单透明,阈值可调">
        <ThresholdSettings settings={data.settings} />
      </SectionCard>
      <SectionCard title="事件标签">
        <TagManager tags={data.tags} />
      </SectionCard>
      <SectionCard title="饮食与身体标签">
        <OptionLists settings={data.settings} />
      </SectionCard>
      <SectionCard title="添加到主屏幕">
        <InstallHint dismissed={data.settings.installHintDismissed} />
      </SectionCard>
      <SectionCard title="数据与备份">
        <DataBackup settings={data.settings} demoPresent={Object.values(data.records).some((d) => d.demo)} />
      </SectionCard>
      <SectionCard title="每晚提醒" hint="第一版不做推送">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          iPhone 对网页应用的推送限制很多,所以这里不做通知。可以用 iOS 的“快捷指令”新建一个“打开 URL”动作,地址填这个应用的网址,再在“个人自动化”里设置每晚固定时间运行;或者在“日历”里加一个每天重复的提醒。
        </p>
      </SectionCard>
      <SectionCard title="关于">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          这是一个自我觉察工具,用来看见自己的波动、找到适合自己的节奏,不替代体检和就医。所有分析只说明“在你的记录中”的情况,不代表因果。数据只保存在这台设备上。
        </p>
      </SectionCard>
    </PageShell>
  );
}
