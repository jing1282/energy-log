"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { careTags, growthStage, isPlantNight } from "@/lib/growth";
import type { AppData } from "@/lib/types";

export function GrowthPlant({ data, watering }: { data: AppData; watering: { tick: number; count: number } }) {
  const [clock, setClock] = useState<Date | null>(null);
  const [visible, setVisible] = useState(true);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    const update = () => { setClock(new Date()); setVisible(!document.hidden); };
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => { clearTimeout(initial); clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  const history = Object.values(data.records).flatMap((day) => careTags(day, data.tagMap).map((tagId) => ({ date: day.date, tagId, name: data.tagMap[tagId]?.name ?? "照顾自己的事" }))).sort((a, b) => b.date.localeCompare(a.date));
  const count = history.length;
  const stage = growthStage(count);
  const night = clock ? isPlantNight(clock.getHours(), data.settings) : false;
  const muted = data.settings.plantMotion === "off" || !visible;
  const names = ["萌芽", "初叶", "舒展", "丰盈"];
  return <section className={`plant-card ${night ? "plant-night" : ""} ${muted ? "plant-still" : ""}`} aria-label="我的小苗">
    <div className="plant-heading"><div><p className="plant-eyebrow">一点一点，照顾自己</p><h2>我的小苗 <span>· {names[stage]}</span></h2></div><span className="plant-phase">{clock ? night ? "☾ 休息时光" : "☀ 日光时光" : "慢慢生长"}</span></div>
    <div className="plant-scene" aria-hidden="true">
      <svg viewBox="0 0 360 210" role="presentation">
        <defs><linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a6ce83"/><stop offset="1" stopColor="#468c67"/></linearGradient><linearGradient id={`${id}-pot`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#edd7b7"/><stop offset="1" stopColor="#cfa57e"/></linearGradient></defs>
        {night ? <g fill="#f0dfae"><path d="M290 24a19 19 0 1 0 19 27 17 17 0 0 1-19-27"/><circle cx="72" cy="37" r="1.8"/><circle cx="123" cy="24" r="1.3"/><circle cx="246" cy="60" r="1.5"/><circle cx="312" cy="79" r="1.2"/></g> : <g><circle cx="283" cy="38" r="30" fill="#f7e7ac" opacity=".35"/><circle cx="283" cy="38" r="20" fill="#f1d78c"/><path d="M40 59 Q57 38 73 57 Q91 46 104 63" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".55"/></g>}
        <ellipse cx="181" cy="190" rx="91" ry="9" fill={night ? "#132d34" : "#779d79"} opacity=".16"/>
        <g key={watering.tick} className={watering.tick ? "plant-grow" : ""}>
          <path d={`M180 155 Q174 125 182 ${stage >= 2 ? 59 : stage === 1 ? 88 : 119}`} fill="none" stroke="#4e8b65" strokeWidth="4" strokeLinecap="round"/>
          <g className="plant-leaf plant-left"><path d="M180 132 Q139 132 137 104 Q169 98 180 132" fill={`url(#${id}-leaf)`}/><path d="M177 129L148 111" stroke="#dae4b7" strokeWidth="1" opacity=".7"/></g>
          <g className="plant-leaf plant-right"><path d="M180 121 Q218 121 222 91 Q190 88 180 121" fill={`url(#${id}-leaf)`}/><path d="M183 118L211 101" stroke="#dae4b7" strokeWidth="1" opacity=".7"/></g>
          {stage >= 1 && <g className="plant-leaf plant-left"><path d="M180 104 Q145 98 151 75 Q178 75 180 104" fill={`url(#${id}-leaf)`}/></g>}
          {stage >= 2 && <g className="plant-leaf plant-right"><path d="M181 85 Q213 84 212 60 Q187 59 181 85" fill={`url(#${id}-leaf)`}/><path d="M182 66 Q163 51 176 36 Q192 46 182 66" fill="#96bb78"/></g>}
          {stage >= 3 && <g className="plant-leaf plant-left"><path d="M180 84 Q136 77 133 54 Q163 48 180 84" fill={`url(#${id}-leaf)`}/><path d="M190 112 Q227 114 239 133 Q209 141 190 112" fill="#89b47c"/></g>}
        </g>
        <ellipse cx="180" cy="155" rx="39" ry="8" fill="#ad8969"/>
        <path d="M143 155 L151 186 Q180 199 209 186 L217 155 Q180 168 143 155" fill={`url(#${id}-pot)`}/>
        <path d="M155 166 Q158 179 158 183" stroke="#fff" strokeWidth="3" opacity=".25" strokeLinecap="round"/>
        <path d="M177 181 Q170 174 174 172 Q178 170 180 175 Q184 170 187 173 Q189 177 180 182Z" fill="#fff5e2" opacity=".8"/>
        {watering.tick > 0 && <g key={`water-${watering.tick}`} className="plant-water"><path d="M180 26 Q165 47 180 49 Q195 47 180 26" fill="#80c8d5"/><path d="M163 17 Q155 30 163 31 Q171 30 163 17" fill="#acdce0"/></g>}
      </svg>
    </div>
    <div className="plant-caption"><p>{night ? "小苗在休息，你也可以慢一点。" : count ? "你给自己的照顾，正在慢慢长成叶子。" : "从一件照顾自己的小事开始。"}</p><span>累计 {count} 次照顾 · 不需要连续打卡</span></div>
    <p role="status" className="plant-feedback">{watering.tick > 0 ? `已浇水 · 新增 ${watering.count} 次照顾，今天也照顾了自己一点。` : "保存赋能事件后，为小苗添一滴水。"}</p>
    <details className="plant-history"><summary>看看我做过的充电小事 <span>↗</span></summary><p className="mb-3 text-xs opacity-70">只计算已保存的个人赋能事件，不计示例。成长不是身体电量；不舒服或没有帮助的反馈不扣成长。</p>{history.length ? <ul className="max-h-48 space-y-2 overflow-auto">{history.map((item) => <li key={`${item.date}-${item.tagId}`}><Link className="flex min-h-9 items-center justify-between gap-3 text-sm underline-offset-4 hover:underline" href={`/day/?d=${item.date}`}><span>{item.name}</span><span className="shrink-0 text-xs opacity-60">{item.date}</span></Link></li>)}</ul> : <p className="text-sm opacity-70">这里会留下你的照顾记录。</p>}</details>
  </section>;
}
