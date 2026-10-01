'use client';

import clsx from 'clsx';
import { useState, type ReactNode } from 'react';

/** Bar chart for a daily series; the line overlay plots a second metric scaled to its own max. */
export function BarLineChart({
  points,
  barLabel,
  lineLabel,
  formatBar,
  formatLine,
}: {
  points: { label: string; bar: number; line: number }[];
  barLabel: string;
  lineLabel: string;
  formatBar: (v: number) => string;
  formatLine: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { t: 12, r: 8, b: 24, l: 8 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const maxBar = Math.max(1e-9, ...points.map((p) => p.bar));
  const maxLine = Math.max(1, ...points.map((p) => p.line));
  const step = innerW / Math.max(1, points.length);
  const barW = Math.max(2, step * 0.62);
  const x = (i: number) => pad.l + i * step + step / 2;
  const yBar = (v: number) => pad.t + innerH - (v / maxBar) * innerH;
  const yLine = (v: number) => pad.t + innerH - (v / maxLine) * innerH;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yLine(p.line).toFixed(1)}`).join(' ');
  const labelEvery = Math.ceil(points.length / 10);
  const hovered = hover !== null ? points[hover] : undefined;

  return (
    <div className="relative">
      <div className="mb-3 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />{barLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-sand-500" />{lineLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none" onMouseLeave={() => setHover(null)} role="img" aria-label={`${barLabel} and ${lineLabel} by day`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + innerH * (1 - f)} y2={pad.t + innerH * (1 - f)} className="stroke-slate-100" />
        ))}
        {points.map((p, i) => (
          <g key={p.label} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - step / 2} y={pad.t} width={step} height={innerH} fill="transparent" />
            <rect
              x={x(i) - barW / 2}
              y={yBar(p.bar)}
              width={barW}
              height={Math.max(0, pad.t + innerH - yBar(p.bar))}
              rx={2}
              className={clsx('transition-colors', hover === i ? 'fill-brand-700' : 'fill-brand-400')}
            />
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-subtle text-[10px]">{p.label.slice(5)}</text>
            )}
          </g>
        ))}
        <path d={path} fill="none" className="stroke-sand-500" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-pop"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="font-semibold">{hovered.label}</p>
          <p>{barLabel}: {formatBar(hovered.bar)}</p>
          <p>{lineLabel}: {formatLine(hovered.line)}</p>
        </div>
      )}
    </div>
  );
}

/** Stacked daily bars, one segment per series, with a hover tooltip. */
export function StackedBarChart({
  points,
  series,
  format,
}: {
  points: { label: string; values: number[] }[];
  series: { label: string; className: string; swatch: string }[];
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { t: 12, r: 8, b: 24, l: 8 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const totals = points.map((p) => p.values.reduce((s, v) => s + v, 0));
  const max = Math.max(1e-9, ...totals);
  const step = innerW / Math.max(1, points.length);
  const barW = Math.max(2, step * 0.62);
  const x = (i: number) => pad.l + i * step + step / 2;
  const labelEvery = Math.ceil(points.length / 10);
  const hovered = hover !== null ? points[hover] : undefined;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-muted">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={clsx('h-2.5 w-2.5 rounded-sm', s.swatch)} />
            {s.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none" onMouseLeave={() => setHover(null)} role="img" aria-label="Revenue by service per day">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + innerH * (1 - f)} y2={pad.t + innerH * (1 - f)} className="stroke-slate-100" />
        ))}
        {points.map((p, i) => {
          let y = pad.t + innerH;
          return (
            <g key={p.label} onMouseEnter={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.55}>
              <rect x={x(i) - step / 2} y={pad.t} width={step} height={innerH} fill="transparent" />
              {p.values.map((v, k) => {
                const h = (v / max) * innerH;
                y -= h;
                return <rect key={series[k]!.label} x={x(i) - barW / 2} y={y} width={barW} height={Math.max(0, h)} className={series[k]!.className} />;
              })}
              {i % labelEvery === 0 && (
                <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-subtle text-[10px]">{p.label.slice(5)}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-pop"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <p className="font-semibold">{hovered.label}</p>
          {series.map((s, k) => (
            <p key={s.label}>{s.label}: {format(hovered.values[k] ?? 0)}</p>
          ))}
          <p className="mt-1 border-t border-white/20 pt-1 font-semibold">Total: {format(totals[hover] ?? 0)}</p>
        </div>
      )}
    </div>
  );
}

export function Donut({ segments, size = 140, center }: { segments: { value: number; className: string; label: string }[]; size?: number; center?: ReactNode }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="-rotate-90" width={size} height={size} role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="14" className="stroke-slate-100" />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.label} cx="60" cy="60" r={r} fill="none" strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} className={s.className} />;
          offset += len;
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}
