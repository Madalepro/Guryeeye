'use client';

import {
  formatMoney,
  LEAD_STAGE_LABELS,
  OPEN_LEAD_STAGES,
  type SaleLeadDto,
  type SaleListingDto,
  type UpdateSaleLeadRequest,
} from '@guryeeye/shared';
import clsx from 'clsx';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, ErrorBanner, Modal, PageHeader, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { LEAD_STAGE_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';

type MovableStage = NonNullable<UpdateSaleLeadRequest['stage']>;
const MOVE_TARGETS: MovableStage[] = [...OPEN_LEAD_STAGES, 'LOST'];

function onMarket(l: Pick<SaleListingDto, 'status'>) {
  return l.status === 'ACTIVE' || l.status === 'UNDER_OFFER';
}

function LeadModal({ listings, onClose, onDone }: { listings: SaleListingDto[]; onClose: () => void; onDone: () => void }) {
  const { hotel } = useHotel();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '', listingId: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.sales.createLead(hotel!.id, {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        listingId: form.listingId || undefined,
        notes: form.notes || undefined,
      });
      toast(`${form.name} added to the pipeline`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add lead', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New buyer lead">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="leadName">Buyer name</label>
          <input id="leadName" name="leadName" className="input" required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="leadPhone">Phone</label>
          <input id="leadPhone" name="leadPhone" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="leadEmail">Email</label>
          <input id="leadEmail" name="leadEmail" type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="leadListing">Interested in</label>
          <select id="leadListing" name="leadListing" className="input" value={form.listingId} onChange={(e) => set('listingId', e.target.value)}>
            <option value="">Not decided yet</option>
            {listings.filter(onMarket).map((l) => (
              <option key={l.id} value={l.id}>{l.title} — {formatMoney(l.askingPriceCents, hotel!.currency)}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="leadNotes">Notes</label>
          <textarea id="leadNotes" name="leadNotes" rows={2} className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add lead</Button>
        </div>
      </form>
    </Modal>
  );
}

function CloseSaleModal({ lead, onClose, onDone }: { lead: SaleLeadDto; onClose: () => void; onDone: () => void }) {
  const { hotel } = useHotel();
  const toast = useToast();
  const [price, setPrice] = useState(String((lead.offerCents ?? lead.listing!.askingPriceCents) / 100));
  const [commission, setCommission] = useState('3');
  const [saving, setSaving] = useState(false);
  const priceCents = Math.round(Number(price) * 100);
  const bps = Math.round(Number(commission) * 100);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.sales.closeSale(hotel!.id, lead.id, { priceCents, commissionBps: bps });
      toast(`Sold! ${lead.listing!.title} to ${lead.name}`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not close the sale', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Close the sale">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-muted">
          {lead.listing!.title} to <span className="font-medium text-ink">{lead.name}</span>. The listing is marked sold and other buyers on it are closed out.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="salePrice">Sale price ({hotel!.currency})</label>
            <input id="salePrice" name="salePrice" type="number" min={1} className="input" required value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="saleCommission">Commission %</label>
            <input id="saleCommission" name="saleCommission" type="number" min={0} max={20} step="0.1" className="input" required value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
        </div>
        <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink-muted">
          Commission earned: <span className="font-semibold text-ink">{formatMoney(Math.round((priceCents * bps) / 10_000), hotel!.currency)}</span>
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="accent" loading={saving}>Record sale</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function LeadPipelinePage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(
    () => Promise.all([api.sales.leads(hotelId), api.sales.listings(hotelId)]),
    [hotelId],
  );
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState<SaleLeadDto | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const money = (c: number) => formatMoney(c, hotel!.currency);

  async function move(lead: SaleLeadDto, stage: MovableStage) {
    try {
      const updated = await api.sales.updateLead(hotelId, lead.id, { stage });
      setData((d) => d && [d[0].map((l) => (l.id === updated.id ? updated : l)), d[1]]);
      toast(`${lead.name} moved to ${LEAD_STAGE_LABELS[stage]}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not move lead', 'error');
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
  const [leads, listings] = data;
  const columns = showClosed ? (['WON', 'LOST'] as const) : OPEN_LEAD_STAGES;

  return (
    <>
      <PageHeader
        title="Lead pipeline"
        subtitle="Buyers from first contact to signed sale"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowClosed((s) => !s)}>
              {showClosed ? 'Show open leads' : `Show closed (${leads.filter((l) => l.stage === 'WON' || l.stage === 'LOST').length})`}
            </Button>
            <Button onClick={() => setAdding(true)}>New lead</Button>
          </>
        }
      />
      <ErrorBanner error={error} onRetry={reload} />

      <div className={clsx('grid gap-4', showClosed ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4')}>
        {columns.map((stage) => {
          const items = leads.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="flex flex-col rounded-2xl bg-slate-100/70 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-display text-sm font-semibold">{LEAD_STAGE_LABELS[stage]}</h3>
                <Badge>{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-ink-subtle">No leads</p>}
                {items.map((l) => {
                  const closable = !!l.listing && onMarket(l.listing) && stage !== 'WON' && stage !== 'LOST';
                  return (
                    <Card key={l.id} className={clsx('border-t-4 p-4', LEAD_STAGE_STYLE[l.stage])}>
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="text-xs text-ink-subtle">{[l.phone, l.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
                      <p className="mt-2 text-xs text-ink-muted">
                        {l.listing ? (
                          <>
                            {l.listing.title}
                            <span className="text-ink-subtle"> · asking {money(l.listing.askingPriceCents)}</span>
                          </>
                        ) : (
                          'No property chosen yet'
                        )}
                      </p>
                      {l.offerCents !== null && (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          {stage === 'WON' ? 'Sold for' : 'Offer'} {money(l.offerCents)}
                        </p>
                      )}
                      {l.notes && <p className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-ink-muted">{l.notes}</p>}
                      {stage !== 'WON' && (
                        <div className="mt-3 flex items-center gap-2">
                          <select
                            name={`stage-${l.id}`}
                            aria-label={`Move ${l.name}`}
                            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                            value={l.stage}
                            onChange={(e) => move(l, e.target.value as MovableStage)}
                          >
                            {MOVE_TARGETS.map((s) => (
                              <option key={s} value={s}>{LEAD_STAGE_LABELS[s]}</option>
                            ))}
                          </select>
                          {closable && (
                            <Button size="sm" variant="accent" onClick={() => setClosing(l)}>Close sale</Button>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {adding && (
        <LeadModal
          listings={listings}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            void reload();
          }}
        />
      )}
      {closing && (
        <CloseSaleModal
          lead={closing}
          onClose={() => setClosing(null)}
          onDone={() => {
            setClosing(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
