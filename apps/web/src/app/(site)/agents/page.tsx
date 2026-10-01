'use client';

import Link from 'next/link';
import { PageIntro } from '@/components/site';
import { EmptyState, ErrorBanner, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/use-async';

export default function AgentsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(() => api.marketplace.agents(), []);
  const isAgent = user?.role === 'SALES_AGENT' || user?.role === 'PROPERTY_MANAGER';

  return (
    <>
      <PageIntro eyebrow="Agents · Dalaaliin" title="Work with a trusted agent">
        Brokers and property managers who list, let and sell homes on Guryeeye. Every enquiry you send reaches them directly.
      </PageIntro>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-sand-200 bg-gradient-to-br from-sand-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold">Agent portal</p>
            <p className="text-sm text-ink-muted">Your leads, listings, tenants and commission in one desk.</p>
          </div>
          {isAgent ? (
            <Link href={user.role === 'SALES_AGENT' ? '/workspace/agent' : '/workspace/rentals'} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              Open my agent desk
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ink ring-1 ring-slate-200 hover:bg-slate-50">Agent sign in</Link>
              <Link href="/get-started" className="rounded-lg bg-sand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sand-600">Join as an agency</Link>
            </div>
          )}
        </div>

        <ErrorBanner error={error} onRetry={reload} />
        {loading && !data ? (
          <div className="flex justify-center py-20 text-brand-700"><Spinner /></div>
        ) : data?.length === 0 ? (
          <EmptyState title="No agents listed yet" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data?.map((a) => (
              <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-card">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 font-display text-xl font-semibold text-white">
                  {a.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <h2 className="mt-3 font-display font-semibold">{a.name}</h2>
                <p className="text-xs font-medium text-brand-700">{a.role === 'SALES_AGENT' ? 'Sales agent · Dilaal' : 'Property manager'}</p>
                <p className="mt-1 text-xs text-ink-subtle">{a.agency.name} · {a.agency.city}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs">
                  {a.role === 'SALES_AGENT' ? (
                    <>
                      <div><dt className="text-ink-subtle">Listings</dt><dd className="font-display text-base font-semibold">{a.activeListings}</dd></div>
                      <div><dt className="text-ink-subtle">Sold</dt><dd className="font-display text-base font-semibold">{a.propertiesSold}</dd></div>
                    </>
                  ) : (
                    <div className="col-span-2"><dt className="text-ink-subtle">Units managed</dt><dd className="font-display text-base font-semibold">{a.managedUnits}</dd></div>
                  )}
                </dl>
                <Link href={a.role === 'SALES_AGENT' ? '/sale' : '/rent'} className="mt-4 inline-block text-xs font-semibold text-brand-700 hover:underline">
                  See their {a.role === 'SALES_AGENT' ? 'listings' : 'rentals'} →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
