'use client';

import {
  addDays,
  formatMoney,
  formatPercent,
  ROOM_STATUS_LABELS,
  RoomStatus,
  todayInTimezone,
  type IsoDate,
  type ReportSummary,
} from '@guryeeye/shared';
import { useMemo, useState } from 'react';
import { BarLineChart, Donut } from '@/components/charts';
import { IconDownload } from '@/components/icons';
import { Button, Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Segmented, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

type Preset = '7' | '30' | '90' | 'mtd' | 'next14' | 'custom';

const DONUT_STROKE: Record<RoomStatus, string> = {
  AVAILABLE: 'stroke-status-available',
  OCCUPIED: 'stroke-status-occupied',
  RESERVED: 'stroke-status-reserved',
  OUT_OF_ORDER: 'stroke-status-ooo',
  MAINTENANCE: 'stroke-status-maintenance',
};
const DOT: Record<RoomStatus, string> = {
  AVAILABLE: 'bg-status-available',
  OCCUPIED: 'bg-status-occupied',
  RESERVED: 'bg-status-reserved',
  OUT_OF_ORDER: 'bg-status-ooo',
  MAINTENANCE: 'bg-status-maintenance',
};

function rangeFor(preset: Preset, today: IsoDate): { from: IsoDate; to: IsoDate } {
  switch (preset) {
    case '7':
      return { from: addDays(today, -6), to: today };
    case '90':
      return { from: addDays(today, -89), to: today };
    case 'mtd':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'next14':
      return { from: today, to: addDays(today, 13) };
    default:
      return { from: addDays(today, -29), to: today };
  }
}

function downloadCsv(report: ReportSummary, hotelName: string) {
  const rows = [
    ['date', 'occupied_rooms', 'available_rooms', 'occupancy_rate', 'room_revenue'],
    ...report.occupancy.map((d) => [d.date, d.occupiedRooms, d.availableRooms, d.occupancyRate.toFixed(4), (d.roomRevenueCents / 100).toFixed(2)]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${hotelName.replace(/\s+/g, '-').toLowerCase()}-${report.range.from}-to-${report.range.to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const today = todayInTimezone(hotel!.timezone);
  const [preset, setPreset] = useState<Preset>('30');
  const [custom, setCustom] = useState(rangeFor('30', today));
  const range = preset === 'custom' ? custom : rangeFor(preset, today);
  const validCustom = custom.from <= custom.to;

  const { data, error, loading, reload } = useAsync(
    () => (preset === 'custom' && !validCustom ? Promise.resolve(undefined) : api.reports.summary(hotelId, range)),
    [hotelId, range.from, range.to],
  );
  const money = (c: number) => formatMoney(c, hotel!.currency);

  const revenueMix = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Rooms', value: data.kpis.roomRevenueCents, className: 'stroke-brand-600' },
      ...data.outlets.map((o, i) => ({ label: o.outletName, value: o.revenueCents, className: ['stroke-sand-500', 'stroke-sand-300', 'stroke-brand-300', 'stroke-sand-700'][i % 4]! })),
    ];
  }, [data]);

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle={`${range.from} → ${range.to}`}
        actions={
          <>
            <Segmented<Preset>
              value={preset}
              onChange={setPreset}
              options={[
                { value: '7', label: '7D' },
                { value: '30', label: '30D' },
                { value: '90', label: '90D' },
                { value: 'mtd', label: 'MTD' },
                { value: 'next14', label: 'Next 14D' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <Button variant="secondary" disabled={!data} onClick={() => data && downloadCsv(data, hotel!.name)}>
              <IconDownload className="h-4 w-4" />
              CSV
            </Button>
          </>
        }
      />

      {preset === 'custom' && (
        <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="label" htmlFor="from">From</label>
            <input id="from" type="date" className="input" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="to">To</label>
            <input id="to" type="date" className="input" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
          {!validCustom && <p className="text-xs text-red-600">“From” must be on or before “To”.</p>}
        </Card>
      )}

      <ErrorBanner error={error} onRetry={reload} />

      {loading && !data ? (
        <div className="flex justify-center py-24 text-brand-700"><Spinner /></div>
      ) : data ? (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat tone="brand" label="Occupancy" value={formatPercent(data.kpis.occupancyRate)} hint={`${data.kpis.roomNightsSold} room nights`} />
            <Stat label="ADR" value={money(data.kpis.adrCents)} hint="Average daily rate" />
            <Stat label="RevPAR" value={money(data.kpis.revparCents)} hint="Revenue per available room" />
            <Stat label="Room revenue" value={money(data.kpis.roomRevenueCents)} />
            <Stat tone="sand" label="Total revenue" value={money(data.kpis.totalRevenueCents)} hint={`${money(data.kpis.posRevenueCents)} from POS`} />
          </div>

          <Card className="mt-6">
            <CardHeader title="Occupancy & room revenue" subtitle="Per night, on the books (confirmed, in-house and departed stays)" />
            <div className="p-5">
              <BarLineChart
                points={data.occupancy.map((d) => ({ label: d.date, bar: d.occupancyRate, line: d.roomRevenueCents }))}
                barLabel="Occupancy"
                lineLabel="Room revenue"
                formatBar={(v) => formatPercent(v)}
                formatLine={money}
              />
            </div>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Revenue mix" />
              <div className="flex flex-col items-center gap-4 p-5">
                <Donut
                  segments={revenueMix}
                  center={<><span className="text-[10px] uppercase tracking-wide text-ink-subtle">Total</span><span className="font-display text-sm font-semibold">{money(data.kpis.totalRevenueCents)}</span></>}
                />
                <div className="w-full space-y-1.5">
                  {revenueMix.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-ink-muted"><svg width="10" height="10"><circle cx="5" cy="5" r="5" className={s.className.replace('stroke-', 'fill-')} /></svg>{s.label}</span>
                      <span className="tabular-nums">{money(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Outlet performance" subtitle="Settled POS sales" />
              <div className="space-y-4 p-5">
                {data.outlets.length === 0 && <EmptyState title="No POS sales in this period" />}
                {data.outlets.map((o) => {
                  const max = Math.max(1, ...data.outlets.map((x) => x.revenueCents));
                  return (
                    <div key={o.outletId}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{o.outletName}</span>
                        <span className="tabular-nums">{money(o.revenueCents)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-sand-500" style={{ width: `${(o.revenueCents / max) * 100}%` }} /></div>
                      <p className="mt-1 text-xs text-ink-subtle">{o.orders} orders · avg {money(Math.round(o.revenueCents / Math.max(1, o.orders)))}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader title="Housekeeping productivity" />
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="font-display text-xl font-semibold">{data.housekeeping.completed}</p><p className="text-[11px] text-ink-subtle">Completed</p></div>
                  <div><p className="font-display text-xl font-semibold">{data.housekeeping.avgCompletionMinutes ?? '—'}</p><p className="text-[11px] text-ink-subtle">Avg minutes</p></div>
                  <div><p className="font-display text-xl font-semibold">{data.housekeeping.pending}</p><p className="text-[11px] text-ink-subtle">Open now</p></div>
                </div>
                <div className="mt-5 space-y-2">
                  {data.housekeeping.byAssignee.map((a) => (
                    <div key={a.assigneeId ?? 'none'} className="flex justify-between text-sm">
                      <span className="text-ink-muted">{a.name}</span>
                      <span className="font-medium tabular-nums">{a.completed}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Current room status" subtitle="Live snapshot" />
            <div className="flex flex-wrap items-center gap-8 p-5">
              <Donut
                size={120}
                segments={Object.values(RoomStatus).map((s) => ({ label: ROOM_STATUS_LABELS[s], value: data.roomStatus[s], className: DONUT_STROKE[s] }))}
                center={<span className="font-display text-lg font-semibold">{hotel!.roomCount}</span>}
              />
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
                {Object.values(RoomStatus).map((s) => (
                  <div key={s} className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1.5 text-xs text-ink-muted"><span className={`h-2 w-2 rounded-full ${DOT[s]}`} />{ROOM_STATUS_LABELS[s]}</p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums">{data.roomStatus[s]}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
