'use client';

import { formatMoney } from '@guryeeye/shared';
import { Card, EmptyState, ErrorBanner, PageHeader, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

export default function TransactionsPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const { data, error, loading, reload } = useAsync(() => api.sales.transactions(hotelId), [hotelId]);
  const money = (c: number) => formatMoney(c, hotel!.currency);
  const rows = data ?? [];
  const volume = rows.reduce((s, t) => s + t.priceCents, 0);
  const commission = rows.reduce((s, t) => s + t.commissionCents, 0);

  return (
    <>
      <PageHeader title="Sales transactions" subtitle="Every closed sale, its price and the commission earned" />
      <ErrorBanner error={error} onRetry={reload} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat tone="brand" label="Properties sold" value={rows.length} />
        <Stat label="Sales volume" value={money(volume)} />
        <Stat tone="sand" label="Commission earned" value={money(commission)} hint={volume ? `${((commission / volume) * 100).toFixed(1)}% average` : undefined} />
      </div>

      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-16 text-brand-700"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><EmptyState title="No sales closed yet" description="Close a lead from the pipeline to record a transaction." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Closed</th>
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Buyer</th>
                  <th className="px-5 py-3 font-medium">Agent</th>
                  <th className="px-5 py-3 text-right font-medium">Price</th>
                  <th className="px-5 py-3 text-right font-medium">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 tabular-nums text-ink-muted">{new Date(t.closedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{t.listing.title}</p>
                      <p className="text-xs text-ink-subtle">{t.listing.city}</p>
                    </td>
                    <td className="px-5 py-3">{t.buyer.name}</td>
                    <td className="px-5 py-3 text-ink-muted">{t.agent?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{money(t.priceCents)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {money(t.commissionCents)} <span className="text-xs text-ink-subtle">({(t.commissionBps / 100).toFixed(1)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
