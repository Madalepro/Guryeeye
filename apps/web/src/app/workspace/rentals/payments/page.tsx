'use client';

import { formatMoney, PAYMENT_METHOD_LABELS, type PayRentRequest, type RentPaymentDto, type RentPaymentStatus } from '@guryeeye/shared';
import { useState } from 'react';
import { Badge, Button, Card, EmptyState, ErrorBanner, Modal, PageHeader, Segmented, Spinner, Stat } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

const METHODS: PayRentRequest['method'][] = ['MOBILE_MONEY', 'CASH', 'CARD'];

function periodLabel(period: string): string {
  return new Date(`${period}T12:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function RentCollectionPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const toast = useToast();
  const [status, setStatus] = useState<RentPaymentStatus>('PENDING');
  const { data, error, loading, reload } = useAsync(() => api.rentals.payments(hotelId, { status }), [hotelId, status]);
  const [paying, setPaying] = useState<RentPaymentDto | null>(null);
  const [method, setMethod] = useState<PayRentRequest['method']>('MOBILE_MONEY');
  const [busy, setBusy] = useState(false);
  const money = (c: number) => formatMoney(c, hotel!.currency);

  async function pay() {
    if (!paying) return;
    setBusy(true);
    try {
      await api.rentals.pay(hotelId, paying.id, { method });
      toast(`${money(paying.amountCents)} received from ${paying.tenantName}`);
      setPaying(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not record payment', 'error');
    } finally {
      setBusy(false);
    }
  }

  const rows = data ?? [];
  const overdue = rows.filter((p) => p.overdue);

  return (
    <>
      <PageHeader
        title="Rent collection"
        subtitle="Monthly invoices are issued on the 1st and fall due on the 5th"
        actions={
          <Segmented<RentPaymentStatus>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PENDING', label: 'Outstanding' },
              { value: 'PAID', label: 'Paid' },
            ]}
          />
        }
      />
      <ErrorBanner error={error} onRetry={reload} />

      {status === 'PENDING' && data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat tone="sand" label="Outstanding" value={money(rows.reduce((s, p) => s + p.amountCents, 0))} hint={`${rows.length} open invoice${rows.length === 1 ? '' : 's'}`} />
          <Stat label="Overdue" value={money(overdue.reduce((s, p) => s + p.amountCents, 0))} hint={`${overdue.length} past the due date`} />
          <Stat label="Due soon" value={money(rows.filter((p) => !p.overdue).reduce((s, p) => s + p.amountCents, 0))} hint="Not yet past due" />
        </div>
      )}

      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-16 text-brand-700"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><EmptyState title={status === 'PENDING' ? 'Everyone is paid up' : 'No payments recorded yet'} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Tenant</th>
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">{status === 'PENDING' ? 'Due' : 'Paid'}</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium">{p.tenantName}</td>
                    <td className="px-5 py-3">
                      <p>{p.propertyName}</p>
                      <p className="text-xs text-ink-subtle">{p.unitLabel}</p>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{periodLabel(p.period)}</td>
                    <td className="px-5 py-3 tabular-nums">
                      {status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-2">
                          {p.dueDate}
                          {p.overdue && <Badge className="bg-red-50 text-red-700 ring-red-600/20">Overdue</Badge>}
                        </span>
                      ) : (
                        <span className="text-ink-muted">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'} · {p.method ? PAYMENT_METHOD_LABELS[p.method] : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{money(p.amountCents)}</td>
                    <td className="px-5 py-3 text-right">
                      {status === 'PENDING' && (
                        <Button size="sm" onClick={() => setPaying(p)}>Record payment</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Record rent payment">
        {paying && (
          <>
            <p className="text-sm text-ink-muted">
              {paying.tenantName} · {paying.propertyName} {paying.unitLabel} · {periodLabel(paying.period)}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{money(paying.amountCents)}</p>
            <p className="label mt-5">Payment method</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <Button key={m} type="button" variant={method === m ? 'primary' : 'secondary'} onClick={() => setMethod(m)}>
                  {PAYMENT_METHOD_LABELS[m]}
                </Button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPaying(null)}>Cancel</Button>
              <Button loading={busy} onClick={pay}>Confirm payment</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
