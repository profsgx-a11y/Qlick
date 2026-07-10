"use client";

import { useState } from "react";

// Minimal single-series weekly bar chart for the admin overview.
// One hue per chart (identity lives in the card title), thin rounded bars
// anchored to a baseline, hover reveals the exact value.

export interface WeekPoint {
  /** ISO date (Monday) of the week. */
  week: string;
  value: number;
}

const BAR_W = 14;
const GAP = 6;
const PLOT_H = 72;
const LABEL_H = 14;

export function WeeklyBars({
  title,
  points,
  locale,
}: {
  title: string;
  points: WeekPoint[];
  locale: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const n = points.length;
  const width = n * (BAR_W + GAP) - GAP;
  const height = PLOT_H + LABEL_H;
  const max = Math.max(1, ...points.map((p) => p.value));
  const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);

  const fmtWeek = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "el" ? "el-GR" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
    });

  // Value label above a bar: hovered one wins; otherwise peak + latest week.
  const showLabel = (i: number) =>
    hover !== null ? hover === i : i === peak || i === n - 1;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-medium text-muted">{title}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={title}
        onMouseLeave={() => setHover(null)}
      >
        {points.map((p, i) => {
          const h = Math.max(p.value > 0 ? 3 : 1.5, (p.value / max) * (PLOT_H - 14));
          const x = i * (BAR_W + GAP);
          const y = PLOT_H - h;
          return (
            <g key={p.week} onMouseEnter={() => setHover(i)}>
              {/* Oversized invisible hit target */}
              <rect x={x - GAP / 2} y={0} width={BAR_W + GAP} height={PLOT_H} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={h}
                rx={3}
                className={
                  p.value === 0
                    ? "fill-surface-3"
                    : hover === i
                      ? "fill-gold-bright"
                      : "fill-gold"
                }
              >
                <title>{`${fmtWeek(p.week)} · ${p.value}`}</title>
              </rect>
              {showLabel(i) && p.value > 0 && (
                <text
                  x={x + BAR_W / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-muted"
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {p.value}
                </text>
              )}
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={0} y1={PLOT_H + 0.5} x2={width} y2={PLOT_H + 0.5} className="stroke-border" strokeWidth={1} />
        {/* First / last week ticks */}
        {n > 0 && (
          <>
            <text x={0} y={height - 2} className="fill-muted-2" style={{ fontSize: 8.5 }}>
              {fmtWeek(points[0].week)}
            </text>
            <text
              x={width}
              y={height - 2}
              textAnchor="end"
              className="fill-muted-2"
              style={{ fontSize: 8.5 }}
            >
              {fmtWeek(points[n - 1].week)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export interface SourceItem {
  key: string;
  label: string;
  last30: number;
  total: number;
  /** The brand-differentiator row (QR) gets the gold bar. */
  highlight?: boolean;
}

export function SourceBars({
  title,
  columns,
  items,
}: {
  title: string;
  columns: { last30: string; total: string };
  items: SourceItem[];
}) {
  const max = Math.max(1, ...items.map((s) => s.last30));
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted">{title}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-2">
          {columns.last30} / {columns.total}
        </p>
      </div>
      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className={s.highlight ? "font-semibold text-gold" : "text-foreground"}>
                {s.label}
              </span>
              <span className="whitespace-nowrap text-muted">
                <span className="font-semibold text-foreground">{s.last30}</span>
                <span className="text-muted-2"> / {s.total}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className={`h-full rounded-full ${s.highlight ? "bg-gold" : "bg-muted-2/60"}`}
                style={{ width: `${Math.round((s.last30 / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
