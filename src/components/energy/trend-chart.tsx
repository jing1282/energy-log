"use client";

import { useId } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { CYCLE_COLOR } from "@/lib/defaults";
import { SEASON_COLOR } from "@/lib/solar-terms";
import { cycleSegments, seasonSegments, type SeriesPoint, type TrendMetric } from "@/lib/trend";

const HIGH = "oklch(0.62 0.11 170)";
const LOW = "oklch(0.74 0.12 50)";

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number | null;
}

export function TrendChart({
  series,
  metric,
  background,
  height = 190,
}: {
  series: SeriesPoint[];
  metric: TrendMetric;
  background: "season" | "cycle" | "none";
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, "");
  const values = series.map((p) => p.value).filter((v): v is number => v !== null);
  const max = values.length ? Math.max(...values) : null;
  const min = values.length ? Math.min(...values) : null;
  const dense = series.length > 40;
  const fixedDomain: [number, number] | null =
    metric === "sleep" ? [3.5, 9.5] : metric === "balance" ? null : [0.5, 5.5];
  const segments =
    background === "season" ? seasonSegments(series) : background === "cycle" ? cycleSegments(series) : [];
  const colors: Record<string, string> = background === "cycle" ? CYCLE_COLOR : SEASON_COLOR;

  const renderDot = (props: DotProps) => {
    const { cx, cy, index, value } = props;
    if (cx === undefined || cy === undefined || value == null) return <g key={`d-${index}`} />;
    const extreme = max !== min && (value === max || value === min);
    if (dense && !extreme) return <g key={`d-${index}`} />;
    const isHigh = extreme && value === max;
    return (
      <circle
        key={`d-${index}`}
        cx={cx}
        cy={cy}
        r={extreme ? 4.5 : 2.8}
        fill={extreme ? (isHigh ? HIGH : LOW) : "white"}
        stroke={extreme ? "white" : HIGH}
        strokeWidth={extreme ? 2 : 1.4}
      />
    );
  };

  const interval = Math.max(0, Math.ceil(series.length / 5) - 1);

  return (
    <div style={{ height }} className="-mx-1">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 340, height }}>
        <ComposedChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: 12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HIGH} stopOpacity={0.28} />
              <stop offset="100%" stopColor={HIGH} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {segments.map((s) => (
            <ReferenceArea
              key={`${s.season}-${s.from}`}
              x1={s.from}
              x2={s.to}
              fill={colors[s.season]}
              fillOpacity={0.55}
              ifOverflow="visible"
            />
          ))}
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            interval={interval}
            tickFormatter={(d: string) => series.find((p) => p.date === d)?.label ?? d}
            tick={{ fontSize: 10, fill: "oklch(0.58 0.03 190)" }}
            padding={{ left: 4, right: 4 }}
          />
          <YAxis hide domain={fixedDomain ?? ["dataMin - 1", "dataMax + 1"]} />
          {metric === "balance" && <ReferenceLine y={0} stroke="oklch(0.8 0.02 170)" strokeDasharray="3 4" />}
          {metric !== "balance" && metric !== "sleep" && (
            <ReferenceLine y={3} stroke="oklch(0.85 0.02 170)" strokeDasharray="3 4" />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={HIGH}
            strokeWidth={2.2}
            fill={`url(#${gradientId})`}
            dot={renderDot}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ma"
            stroke="oklch(0.5 0.07 260)"
            strokeWidth={1.8}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
