"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/actions";

function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export function InstallHint({ dismissed }: { dismissed: boolean }) {
  const [ios] = useState(isIosBrowser);
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
      <p>
        用 Safari 打开后点底部的分享按钮,选“添加到主屏幕”,之后从主屏幕图标打开会全屏运行。只有这样,iPhone 才会比较稳定地保留网页数据。
      </p>
      {ios && !dismissed && (
        <button
          type="button"
          className="h-9 rounded-full bg-muted px-4 text-xs font-medium text-foreground"
          onClick={() => updateSettings({ installHintDismissed: true })}
        >
          我知道了
        </button>
      )}
      {ios && <p className="text-primary">你现在是在 Safari 里打开的,还没有添加到主屏幕。</p>}
    </div>
  );
}
