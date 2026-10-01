'use client';

import { formatMoney, hasCapability } from '@guryeeye/shared';
import Link from 'next/link';
import { IconHotel } from '@/components/icons';
import { PageIntro } from '@/components/site';
import { EmptyState, ErrorBanner, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/use-async';

export default function HotelsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(() => api.marketplace.hotels(), []);
  const staff = !!user && hasCapability(user.role, 'hotel');

  return (
    <>
      <PageIntro eyebrow="Hotels" title="Stay with Guryeeye hotels">
        Trusted hotels with live room availability — and, for hotel teams, the Guryeeye Hotel Management System behind them.
      </PageIntro>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ErrorBanner error={error} onRetry={reload} />
        {loading && !data ? (
          <div className="flex justify-center py-20 text-brand-700"><Spinner /></div>
        ) : data?.length === 0 ? (
          <EmptyState title="No hotels listed yet" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {data?.map((h) => (
              <article key={h.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                <div className="flex items-center gap-4 bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-white">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10"><IconHotel className="h-6 w-6" /></span>
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-semibold">{h.name}</h2>
                    <p className="text-xs text-brand-200">{h.city}, {h.country} · {h.rooms} rooms</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                    {h.availableTonight} free tonight
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {h.roomTypes.map((t) => (
                    <li key={t.name} className="flex items-center justify-between px-6 py-3 text-sm">
                      <span>{t.name} <span className="text-xs text-ink-subtle">· up to {t.capacity} guests</span></span>
                      <span className="font-semibold tabular-nums">{formatMoney(t.baseRateCents, h.currency)}<span className="text-xs font-normal text-ink-subtle"> / night</span></span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">Hotel Management System (HMS)</p>
            <p className="text-sm text-ink-muted">Room grid, housekeeping, point of sale and bookings for hotel teams.</p>
          </div>
          <Link href={staff ? '/workspace/hotel' : '/login'} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
            {staff ? 'Open Hotel Management' : 'Hotel staff sign in'}
          </Link>
        </div>
      </div>
    </>
  );
}
