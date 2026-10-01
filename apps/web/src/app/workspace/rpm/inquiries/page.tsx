'use client';

import { UNIT_STATUS_LABELS } from '@guryeeye/shared';
import Link from 'next/link';
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

export default function InquiriesPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(() => api.rpm.inquiries(hotelId), [hotelId]);

  async function handle(id: string) {
    try {
      const updated = await api.rpm.handleInquiry(hotelId, id);
      setData((rows) => rows?.map((r) => (r.id === id ? updated : r)));
      toast(`Marked as handled — ${updated.name}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update enquiry', 'error');
    }
  }

  const rows = data ?? [];
  const waiting = rows.filter((r) => !r.handled).length;

  return (
    <>
      <PageHeader
        title="Rental enquiries"
        subtitle={`Messages from the public For Rent page · ${waiting} waiting for a reply`}
        actions={<Link href="/rent" target="_blank"><Button variant="secondary">View public listings</Button></Link>}
      />
      <ErrorBanner error={error} onRetry={reload} />
      <Card>
        {loading && !data ? (
          <div className="flex justify-center py-16 text-brand-700"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><EmptyState title="No enquiries yet" description="Vacant units appear on the public For Rent page; enquiries show up here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${r.handled ? 'opacity-60' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.name}</p>
                    <a href={`tel:${r.phone.replace(/\s+/g, '')}`} className="text-sm text-brand-700 hover:underline">{r.phone}</a>
                    {r.email && <span className="text-xs text-ink-subtle">{r.email}</span>}
                  </div>
                  <p className="text-xs text-ink-subtle">
                    {r.property.name} · {r.unit.label} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.message && <p className="mt-1 text-sm text-ink-muted">“{r.message}”</p>}
                </div>
                <div className="flex items-center gap-2">
                  {r.unit.status !== 'VACANT' && <Badge>{UNIT_STATUS_LABELS[r.unit.status]}</Badge>}
                  {r.handled ? (
                    <span className="text-xs text-emerald-700">Handled</span>
                  ) : (
                    <>
                      {r.unit.status === 'VACANT' && (
                        <Link href="/workspace/rentals"><Button size="sm" variant="secondary">Sign lease</Button></Link>
                      )}
                      <Button size="sm" onClick={() => handle(r.id)}>Mark handled</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
