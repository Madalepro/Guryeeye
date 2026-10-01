'use client';

import { formatMoney, type LeaseDto, type LeaseStatus } from '@guryeeye/shared';
import { useState } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, Modal, PageHeader, Segmented, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

export default function LeasesPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const toast = useToast();
  const [status, setStatus] = useState<LeaseStatus>('ACTIVE');
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.rentals.leases(hotelId, { status }), api.rentals.tenants(hotelId)]),
    [hotelId, status],
  );
  const [ending, setEnding] = useState<LeaseDto | null>(null);
  const [busy, setBusy] = useState(false);
  const money = (c: number) => formatMoney(c, hotel!.currency);

  async function endLease() {
    if (!ending) return;
    setBusy(true);
    try {
      await api.rentals.endLease(hotelId, ending.id);
      toast(`Lease ended — ${ending.property.name} ${ending.unit.label} is now vacant`);
      setEnding(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not end lease', 'error');
    } finally {
      setBusy(false);
    }
  }

  const [leases, tenants] = data ?? [[], []];

  return (
    <>
      <PageHeader
        title="Leases & tenants"
        subtitle="Who lives where, on what terms, and what they owe"
        actions={
          <Segmented<LeaseStatus>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ENDED', label: 'Ended' },
            ]}
          />
        }
      />
      <ErrorBanner error={error} onRetry={reload} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={status === 'ACTIVE' ? 'Active leases' : 'Ended leases'} subtitle={`${leases.length} lease${leases.length === 1 ? '' : 's'}`} />
          {loading && !data ? (
            <div className="flex justify-center py-16 text-brand-700"><Spinner /></div>
          ) : leases.length === 0 ? (
            <div className="p-5"><EmptyState title="No leases here" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Tenant</th>
                    <th className="px-5 py-3 font-medium">Unit</th>
                    <th className="px-5 py-3 font-medium">Term</th>
                    <th className="px-5 py-3 text-right font-medium">Rent</th>
                    <th className="px-5 py-3 text-right font-medium">Balance due</th>
                    {status === 'ACTIVE' && <th className="px-5 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leases.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium">{l.tenant.name}</p>
                        <p className="text-xs text-ink-subtle">{l.tenant.phone ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p>{l.property.name}</p>
                        <p className="text-xs text-ink-subtle">{l.unit.label}</p>
                      </td>
                      <td className="px-5 py-3 text-xs text-ink-muted tabular-nums">{l.startDate} → {l.endDate}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{money(l.monthlyRentCents)}</td>
                      <td className="px-5 py-3 text-right">
                        {l.balanceDueCents > 0 ? (
                          <Badge className="bg-red-50 text-red-700 ring-red-600/20">{money(l.balanceDueCents)}</Badge>
                        ) : (
                          <span className="text-xs text-emerald-700">Paid up</span>
                        )}
                      </td>
                      {status === 'ACTIVE' && (
                        <td className="px-5 py-3 text-right">
                          <Button size="sm" variant="secondary" onClick={() => setEnding(l)}>End lease</Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Tenant directory" subtitle={`${tenants.length} tenant${tenants.length === 1 ? '' : 's'}`} />
          <div className="max-h-[36rem] divide-y divide-slate-100 overflow-y-auto scrollbar-thin">
            {tenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-ink-subtle">{[t.phone, t.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                </div>
                <Badge className={t.activeLeases ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : undefined}>
                  {t.activeLeases ? `${t.activeLeases} active` : 'Former'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={!!ending} onClose={() => setEnding(null)} title="End this lease?">
        {ending && (
          <>
            <p className="text-sm text-ink-muted">
              {ending.tenant.name} will move out of {ending.property.name} {ending.unit.label}, and the unit becomes vacant and lettable.
              {ending.balanceDueCents > 0 && ` They still owe ${money(ending.balanceDueCents)}; outstanding invoices stay on record.`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEnding(null)}>Keep lease</Button>
              <Button variant="danger" loading={busy} onClick={endLease}>End lease</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
