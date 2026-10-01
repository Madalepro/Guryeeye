'use client';

import {
  formatMoney,
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  type SaleListingDto,
  type UpdateSaleListingRequest,
} from '@guryeeye/shared';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, Modal, PageHeader, Spinner, Stat } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { LISTING_STATUS_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';

const EDITABLE_STATUSES: NonNullable<UpdateSaleListingRequest['status']>[] = ['ACTIVE', 'UNDER_OFFER', 'WITHDRAWN'];

function ListingModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { hotel } = useHotel();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', type: 'HOUSE' as PropertyType, address: '', city: hotel!.city, bedrooms: '3', area: '', price: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const noBedrooms = form.type === 'LAND' || form.type === 'COMMERCIAL';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.sales.createListing(hotel!.id, {
        title: form.title,
        type: form.type,
        address: form.address,
        city: form.city,
        bedrooms: noBedrooms || form.bedrooms === '' ? undefined : Number(form.bedrooms),
        areaSqm: form.area ? Number(form.area) : undefined,
        askingPriceCents: Math.round(Number(form.price) * 100),
      });
      toast(`${form.title} is now on the market`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create listing', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New sale listing">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="listingTitle">Title</label>
          <input id="listingTitle" name="listingTitle" className="input" required minLength={2} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="4-bed villa with garden" />
        </div>
        <div>
          <label className="label" htmlFor="listingType">Type</label>
          <select id="listingType" name="listingType" className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {Object.values(PropertyType).map((t) => (
              <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="listingCity">City</label>
          <input id="listingCity" name="listingCity" className="input" required value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="listingAddress">Address</label>
          <input id="listingAddress" name="listingAddress" className="input" required minLength={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        {!noBedrooms && (
          <div>
            <label className="label" htmlFor="listingBeds">Bedrooms</label>
            <input id="listingBeds" name="listingBeds" type="number" min={0} max={50} className="input" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="listingArea">Area (m²)</label>
          <input id="listingArea" name="listingArea" type="number" min={1} className="input" value={form.area} onChange={(e) => set('area', e.target.value)} />
        </div>
        <div className={noBedrooms ? '' : 'sm:col-span-2'}>
          <label className="label" htmlFor="listingPrice">Asking price ({hotel!.currency})</label>
          <input id="listingPrice" name="listingPrice" type="number" min={1} step="1" className="input" required value={form.price} onChange={(e) => set('price', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Publish listing</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SalesListingsPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.sales.overview(hotelId), api.sales.listings(hotelId)]),
    [hotelId],
  );
  const [adding, setAdding] = useState(false);
  const money = (c: number) => formatMoney(c, hotel!.currency);

  async function setStatus(l: SaleListingDto, status: NonNullable<UpdateSaleListingRequest['status']>) {
    try {
      await api.sales.updateListing(hotelId, l.id, { status });
      toast(`${l.title} marked ${LISTING_STATUS_LABELS[status].toLowerCase()}`);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update listing', 'error');
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24 text-brand-700">
        <Spinner />
      </div>
    );
  }
  if (!data) return <ErrorBanner error={error} onRetry={reload} />;
  const [overview, listings] = data;

  return (
    <>
      <PageHeader
        title="Real estate sales"
        subtitle="Iibka — properties on the market and how they are moving"
        actions={
          <>
            <Link href="/workspace/sales/leads"><Button variant="secondary">Lead pipeline</Button></Link>
            <Button onClick={() => setAdding(true)}>New listing</Button>
          </>
        }
      />
      <ErrorBanner error={error} onRetry={reload} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="brand" label="On the market" value={overview.activeListings + overview.underOffer} hint={`${overview.underOffer} under offer · ${money(overview.inventoryValueCents)} asking`} />
        <Stat label="Pipeline value" value={money(overview.pipelineValueCents)} hint="Listings with open buyer interest" />
        <Stat label="Sold (30 days)" value={overview.soldLast30Days} hint={`${money(overview.volumeLast30DaysCents)} sales volume`} />
        <Stat tone="sand" label="Commission (30 days)" value={money(overview.commissionLast30DaysCents)} hint={<Link className="underline-offset-2 hover:underline" href="/workspace/sales/transactions">View transactions</Link>} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Listings" subtitle={`${listings.length} propert${listings.length === 1 ? 'y' : 'ies'}`} />
        {listings.length === 0 ? (
          <div className="p-5"><EmptyState title="No listings yet" description="Publish a property to start collecting buyer leads." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                  <th className="px-5 py-3 text-right font-medium">Asking price</th>
                  <th className="px-5 py-3 text-right font-medium">Leads</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-medium">{l.title}</p>
                      <p className="text-xs text-ink-subtle">{l.address}, {l.city}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-muted">
                      {[PROPERTY_TYPE_LABELS[l.type], l.bedrooms !== null ? `${l.bedrooms} bd` : null, l.areaSqm ? `${l.areaSqm} m²` : null].filter(Boolean).join(' · ')}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">{money(l.askingPriceCents)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{l.leadCount}</td>
                    <td className="px-5 py-3">
                      {l.status === 'SOLD' ? (
                        <Badge className={LISTING_STATUS_STYLE.SOLD}>{LISTING_STATUS_LABELS.SOLD}</Badge>
                      ) : (
                        <select
                          name={`status-${l.id}`}
                          aria-label={`Status of ${l.title}`}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                          value={l.status}
                          onChange={(e) => setStatus(l, e.target.value as NonNullable<UpdateSaleListingRequest['status']>)}
                        >
                          {EDITABLE_STATUSES.map((s) => (
                            <option key={s} value={s}>{LISTING_STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && (
        <ListingModal
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            void reload();
          }}
        />
      )}
    </>
  );
}
