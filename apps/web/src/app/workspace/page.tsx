'use client';

import {
  addDays,
  formatMoney,
  formatPercent,
  hasCapability,
  todayInTimezone,
  type PlatformAnalytics,
  type RentalsOverview,
  type SalesOverview,
  type WorkspaceOverview,
} from '@guryeeye/shared';
import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { IconBriefcase, IconHome, IconHotel, IconTrend } from '@/components/icons';
import { Card, ErrorBanner, PageHeader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

interface HubData {
  hotel?: WorkspaceOverview;
  rentals?: RentalsOverview;
  sales?: SalesOverview;
  analytics?: PlatformAnalytics;
}

function ServiceCard({
  title,
  subtitle,
  href,
  icon: Icon,
  accent,
  metrics,
  links,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
  metrics: [string, ReactNode][] | null;
  links: [string, string][];
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Link href={href} className="group flex items-start gap-4 border-b border-slate-100 p-5 hover:bg-slate-50/60">
        <span className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm', accent)}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-ink group-hover:text-brand-800">{title}</h2>
          <p className="text-xs text-ink-subtle">{subtitle}</p>
        </div>
        <span className="text-sm text-ink-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden>
          →
        </span>
      </Link>
      <div className="grid flex-1 grid-cols-2 gap-px bg-slate-100">
        {metrics === null ? (
          <div className="col-span-2 flex justify-center bg-white py-8 text-brand-700">
            <Spinner />
          </div>
        ) : (
          metrics.map(([label, value]) => (
            <div key={label} className="bg-white px-5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3">
        {links.map(([label, to]) => (
          <Link key={to} href={to} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-800">
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default function HubPage() {
  const { hotel } = useHotel();
  const { user } = useAuth();
  const hotelId = hotel!.id;
  const can = (c: Parameters<typeof hasCapability>[1]) => !!user && hasCapability(user.role, c);
  const today = todayInTimezone(hotel!.timezone);

  const { data, error, reload } = useAsync<HubData>(async () => {
    const [h, r, s, a] = await Promise.all([
      can('hotel') ? api.hotels.overview(hotelId) : undefined,
      can('rentals') ? api.rentals.overview(hotelId) : undefined,
      can('sales') ? api.sales.overview(hotelId) : undefined,
      can('analytics') ? api.analytics.summary(hotelId, { from: addDays(today, -29), to: today }) : undefined,
    ]);
    return { hotel: h, rentals: r, sales: s, analytics: a };
  }, [hotelId, user?.role]);

  const money = (c: number) => formatMoney(c, hotel!.currency);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const hotelMetrics = (o: WorkspaceOverview): [string, ReactNode][] => {
    const sellable = hotel!.roomCount - o.roomStatus.OUT_OF_ORDER - o.roomStatus.MAINTENANCE;
    return [
      ['Occupancy tonight', formatPercent(sellable > 0 ? o.roomStatus.OCCUPIED / sellable : 0)],
      ['In-house guests', o.inHouse],
      ['Arrivals today', o.arrivals.length],
      ['Revenue today', money(o.todayRevenueCents)],
    ];
  };

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0]}`}
        subtitle={`${hotel!.name} — every Guryeeye service in one place`}
      />
      <ErrorBanner error={error} onRetry={reload} />

      {data?.analytics && (
        <Card className="mb-6 overflow-hidden border-brand-800 bg-gradient-to-br from-brand-800 to-brand-950 text-white">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-200">Combined revenue · last 30 days</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{money(data.analytics.revenue.total)}</p>
              <Link href="/workspace/analytics" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sand-300 hover:text-sand-200">
                <IconTrend className="h-4 w-4" /> Open platform analytics
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-6 text-sm">
              {(
                [
                  ['Hotels', data.analytics.revenue.hotel],
                  ['Rentals', data.analytics.revenue.rentals],
                  ['Sales commission', data.analytics.revenue.sales],
                ] as const
              ).map(([label, cents]) => (
                <div key={label}>
                  <p className="text-xs text-brand-200">{label}</p>
                  <p className="font-display text-lg font-semibold tabular-nums">{money(cents)}</p>
                  <p className="text-xs text-brand-200/80">
                    {formatPercent(data.analytics!.revenue.total ? cents / data.analytics!.revenue.total : 0, 0)} of total
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        {can('hotel') && (
          <ServiceCard
            title="Hotel management"
            subtitle="Room grid, housekeeping, point of sale and bookings"
            href="/workspace/hotel"
            icon={IconHotel}
            accent="bg-brand-700"
            metrics={data?.hotel ? hotelMetrics(data.hotel) : data ? [] : null}
            links={[
              ['Room grid', '/workspace/rooms'],
              ...(can('housekeeping') ? ([['Housekeeping', '/workspace/housekeeping']] as [string, string][]) : []),
              ...(can('pos') ? ([['Point of sale', '/workspace/pos']] as [string, string][]) : []),
              ...(can('reports') ? ([['Reports', '/workspace/reports']] as [string, string][]) : []),
            ]}
          />
        )}
        {can('rentals') && (
          <ServiceCard
            title="Property rentals · Guryaha Kirada"
            subtitle="Tenants, leases, listings and rent collection"
            href="/workspace/rentals"
            icon={IconHome}
            accent="bg-emerald-600"
            metrics={
              data?.rentals
                ? [
                    ['Units let', `${data.rentals.unitStatus.OCCUPIED} / ${data.rentals.units}`],
                    ['Occupancy', formatPercent(data.rentals.occupancyRate)],
                    ['Collected this month', money(data.rentals.collectedThisMonthCents)],
                    ['Overdue invoices', data.rentals.overdueCount],
                  ]
                : data
                  ? []
                  : null
            }
            links={[
              ['Properties', '/workspace/rentals'],
              ['Leases & tenants', '/workspace/rentals/leases'],
              ['Rent collection', '/workspace/rentals/payments'],
              ['Maintenance (RPM)', '/workspace/rpm/maintenance'],
              ['Enquiries', '/workspace/rpm/inquiries'],
            ]}
          />
        )}
        {can('sales') && (
          <ServiceCard
            title="Real estate sales · Iibka"
            subtitle="Listings, buyer leads and closed transactions"
            href="/workspace/sales"
            icon={IconBriefcase}
            accent="bg-sand-500"
            metrics={
              data?.sales
                ? [
                    ['On the market', data.sales.activeListings + data.sales.underOffer],
                    ['Pipeline value', money(data.sales.pipelineValueCents)],
                    ['Sold (30d)', data.sales.soldLast30Days],
                    ['Commission (30d)', money(data.sales.commissionLast30DaysCents)],
                  ]
                : data
                  ? []
                  : null
            }
            links={[
              ['Listings', '/workspace/sales'],
              ['Lead pipeline', '/workspace/sales/leads'],
              ['Transactions', '/workspace/sales/transactions'],
              ['Agent desk', '/workspace/agent'],
            ]}
          />
        )}
      </div>
    </>
  );
}
