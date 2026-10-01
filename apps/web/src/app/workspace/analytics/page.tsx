'use client';

import { addDays, formatMoney, formatPercent, todayInTimezone, type IsoDate } from '@guryeeye/shared';
import Link from 'next/link';
import { useState } from 'react';
import { Donut, StackedBarChart } from '@/components/charts';
import { IconBriefcase, IconHome, IconHotel } from '@/components/icons';
import { Card, CardHeader, ErrorBanner, PageHeader, Segmented, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

type Preset = '7' | '30' | '90';

const SERIES = [
  { key: 'hotelCents', label: 'Hotels', className: 'fill-brand-500', swatch: 'bg-brand-500', stroke: 'stroke-brand-500' },
  { key: 'rentalsCents', label: 'Rentals', className: 'fill-emerald-400', swatch: 'bg-emerald-400', stroke: 'stroke-emerald-400' },
  { key: 'salesCents', label: 'Sales commission', className: 'fill-sand-500', swatch: 'bg-sand-500', stroke: 'stroke-sand-500' },
] as const;

function rangeFor(preset: Preset, today: IsoDate) {
  return { from: addDays(today, -(Number(preset) - 1)), to: today };
}

export default function AnalyticsPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const [preset, setPreset] = useState<Preset>('30');
  const range = rangeFor(preset, todayInTimezone(hotel!.timezone));
  const { data, error, loading, reload } = useAsync(() => api.analytics.summary(hotelId, range), [hotelId, range.from, range.to]);
  const money = (c: number) => formatMoney(c, hotel!.currency);

  return (
    <>
      <PageHeader
        title="Platform analytics"
        subtitle={`Revenue and performance across every service · ${range.from} → ${range.to}`}
        actions={
          <Segmented<Preset>
            value={preset}
            onChange={setPreset}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
          />
        }
      />
      <ErrorBanner error={error} onRetry={reload} />

      {loading && !data ? (
        <div className="flex justify-center py-24 text-brand-700"><Spinner /></div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat tone="brand" label="Total revenue" value={money(data.revenue.total)} hint="Hotels + rent collected + sales commission" />
            <Stat label="Hotels" value={money(data.revenue.hotel)} hint={`${formatPercent(data.hotel.occupancyRate)} occupancy · ADR ${money(data.hotel.adrCents)}`} />
            <Stat label="Rentals" value={money(data.revenue.rentals)} hint={`${formatPercent(data.rentals.occupancyRate)} of ${data.rentals.units} units let`} />
            <Stat tone="sand" label="Sales commission" value={money(data.revenue.sales)} hint={`${money(data.sales.volumeCents)} sales volume`} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Daily revenue by service" subtitle="Hover a day for the breakdown" />
              <div className="p-5">
                <StackedBarChart
                  points={data.series.map((p) => ({ label: p.date, values: SERIES.map((s) => p[s.key]) }))}
                  series={SERIES.map((s) => ({ label: s.label, className: s.className, swatch: s.swatch }))}
                  format={money}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Revenue mix" />
              <div className="flex flex-col items-center gap-5 p-5">
                <Donut
                  size={170}
                  segments={[
                    { label: 'Hotels', value: data.revenue.hotel, className: SERIES[0].stroke },
                    { label: 'Rentals', value: data.revenue.rentals, className: SERIES[1].stroke },
                    { label: 'Sales', value: data.revenue.sales, className: SERIES[2].stroke },
                  ]}
                  center={
                    <>
                      <p className="text-[11px] uppercase tracking-wide text-ink-muted">Total</p>
                      <p className="font-display text-sm font-semibold">{money(data.revenue.total)}</p>
                    </>
                  }
                />
                <div className="w-full space-y-2">
                  {(
                    [
                      ['Hotels', data.revenue.hotel, SERIES[0].swatch],
                      ['Rentals', data.revenue.rentals, SERIES[1].swatch],
                      ['Sales commission', data.revenue.sales, SERIES[2].swatch],
                    ] as const
                  ).map(([label, v, swatch]) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-ink-muted">
                        <span className={`h-2.5 w-2.5 rounded-sm ${swatch}`} />
                        {label}
                      </span>
                      <span className="tabular-nums">
                        {money(v)} <span className="text-xs text-ink-subtle">({formatPercent(data.revenue.total ? v / data.revenue.total : 0, 0)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {(
              [
                [IconHotel, 'Hotel management', '/workspace/reports', 'Hotel reports', [
                  ['Rooms', data.hotel.rooms],
                  ['Occupancy', formatPercent(data.hotel.occupancyRate)],
                  ['Average daily rate', money(data.hotel.adrCents)],
                ]],
                [IconHome, 'Property rentals', '/workspace/rentals/payments', 'Rent collection', [
                  ['Units', data.rentals.units],
                  ['Occupancy', formatPercent(data.rentals.occupancyRate)],
                  ['Outstanding rent', money(data.rentals.outstandingCents)],
                ]],
                [IconBriefcase, 'Real estate sales', '/workspace/sales/leads', 'Lead pipeline', [
                  ['Listings on market', data.sales.activeListings],
                  ['Open leads', data.sales.openLeads],
                  ['Sales volume', money(data.sales.volumeCents)],
                ]],
              ] as const
            ).map(([Icon, title, href, linkLabel, rows]) => (
              <Card key={title} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-display text-sm font-semibold">
                    <Icon className="h-5 w-5 text-brand-700" /> {title}
                  </span>
                  <Link href={href} className="text-xs font-medium text-brand-700 hover:underline">{linkLabel} →</Link>
                </div>
                <dl className="space-y-2 text-sm">
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
