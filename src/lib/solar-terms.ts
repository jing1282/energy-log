const TERMS = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];

/** 节气 i 对应的太阳黄经(度):小寒 285°,之后每个节气加 15°。 */
const termLongitude = (i: number) => (285 + i * 15) % 360;

const rad = (d: number) => (d * Math.PI) / 180;

function julianDay(ms: number) {
  return ms / 86400000 + 2440587.5;
}

/** 太阳视黄经(度),低精度公式,误差约 0.01°,对「按天」的节气判断足够。 */
function solarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(rad(M)) +
    (0.019993 - 0.000101 * T) * Math.sin(rad(2 * M)) +
    0.000289 * Math.sin(rad(3 * M));
  const omega = 125.04 - 1934.136 * T;
  const apparent = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  return ((apparent % 360) + 360) % 360;
}

/** 找到某年内太阳黄经到达目标度数的时刻(UTC 毫秒)。 */
function momentOf(year: number, target: number): number {
  const approxMonth = Math.floor(((target + 75) % 360) / 30);
  let lo = Date.UTC(year, approxMonth - 1, 1);
  let hi = Date.UTC(year, approxMonth + 2, 1);
  const diff = (ms: number) => {
    let d = solarLongitude(julianDay(ms)) - target;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const CST_OFFSET_MS = 8 * 3600_000;

export interface SolarTerm {
  name: string;
  date: string;
}

const cache = new Map<number, SolarTerm[]>();

/** 某年的 24 个节气(按北京时间的日期),按日期先后排列。 */
export function termsOfYear(year: number): SolarTerm[] {
  const hit = cache.get(year);
  if (hit) return hit;
  const list = TERMS.map((name, i) => {
    const ms = momentOf(year, termLongitude(i)) + CST_OFFSET_MS;
    const d = new Date(ms);
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    return { name, date };
  }).sort((a, b) => (a.date < b.date ? -1 : 1));
  cache.set(year, list);
  return list;
}

export interface Season {
  season: "春" | "夏" | "秋" | "冬";
  term: string;
  termDate: string;
  label: string;
}

const SEASON_START: Record<string, Season["season"]> = {
  立春: "春",
  立夏: "夏",
  立秋: "秋",
  立冬: "冬",
};

/** 由日期计算「季节 · 当前所处节气」,不需要网络和用户填写。 */
export function seasonOf(key: string): Season {
  const year = Number(key.slice(0, 4));
  const all = [...termsOfYear(year - 1), ...termsOfYear(year), ...termsOfYear(year + 1)];
  let idx = 0;
  for (let i = 0; i < all.length; i++) {
    if (all[i].date <= key) idx = i;
    else break;
  }
  let season: Season["season"] = "冬";
  for (let i = idx; i >= 0; i--) {
    const s = SEASON_START[all[i].name];
    if (s) {
      season = s;
      break;
    }
  }
  const term = all[idx];
  return { season, term: term.name, termDate: term.date, label: `${season} · ${term.name}` };
}

export const SEASON_COLOR: Record<Season["season"], string> = {
  春: "oklch(0.9 0.06 150)",
  夏: "oklch(0.92 0.07 95)",
  秋: "oklch(0.9 0.06 55)",
  冬: "oklch(0.9 0.04 240)",
};
