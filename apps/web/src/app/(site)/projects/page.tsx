'use client';

import { formatMoney, PROJECT_STATUS_LABELS, type ProjectStatus } from '@guryeeye/shared';
import clsx from 'clsx';
import Link from 'next/link';
import { PageIntro } from '@/components/site';
import { EmptyState, ErrorBanner, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const STATUS_STYLE: Record<ProjectStatus, string> = {
  PLANNING: 'bg-sky-100 text-sky-800',
  UNDER_CONSTRUCTION: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

export default function ProjectsPage() {
  const { data, error, loading, reload } = useAsync(() => api.marketplace.projects(), []);

  return (
    <>
      <PageIntro eyebrow="Projects" title="New developments">
        Off-plan and newly completed apartments, townhouses, villas and offices from Guryeeye developers.
      </PageIntro>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ErrorBanner error={error} onRetry={reload} />
        {loading && !data ? (
          <div className="flex justify-center py-20 text-brand-700"><Spinner /></div>
        ) : data?.length === 0 ? (
          <EmptyState title="No projects listed yet" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {data?.map((p) => {
              const sold = p.totalUnits - p.unitsAvailable;
              return (
                <article key={p.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                      <p className="text-xs text-ink-subtle">{p.city} · by {p.developer}</p>
                    </div>
                    <span className={clsx('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', STATUS_STYLE[p.status])}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink-muted">{p.description}</p>
                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-ink-muted">
                      <span>{sold} of {p.totalUnits} units reserved</span>
                      <span>{p.unitsAvailable} available</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(sold / Math.max(1, p.totalUnits)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-ink-subtle">Units from</p>
                      <p className="font-display text-lg font-semibold">{formatMoney(p.priceFromCents, p.currency)}</p>
                    </div>
                    <p className="text-right text-xs text-ink-subtle">
                      {p.expectedCompletion ? <>Completion<br /><span className="font-medium text-ink">{new Date(`${p.expectedCompletion}T12:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span></> : 'Ready now'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="mt-10 rounded-2xl bg-brand-50 p-6 text-sm">
          <p className="font-medium">Are you a developer?</p>
          <p className="mt-1 text-ink-muted">Open a Guryeeye account to market your project and manage sales and rentals once it completes.</p>
          <Link href="/get-started" className="mt-3 inline-block font-semibold text-brand-700 hover:underline">Get started →</Link>
        </div>
      </div>
    </>
  );
}
