'use client';

import {
  addDays,
  formatMoney,
  formatPercent,
  PROPERTY_TYPE_LABELS,
  PropertyType,
  todayInTimezone,
  UNIT_STATUS_LABELS,
  type RentalPropertyDto,
  type RentalUnitDto,
} from '@guryeeye/shared';
import clsx from 'clsx';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, Modal, PageHeader, Spinner, Stat } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useHotel } from '@/lib/hotel';
import { UNIT_STATUS_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';

const toCents = (v: string) => Math.round(Number(v) * 100);

function LeaseModal({ unit, property, onClose, onDone }: { unit: RentalUnitDto; property: RentalPropertyDto; onClose: () => void; onDone: () => void }) {
  const { hotel } = useHotel();
  const toast = useToast();
  const today = todayInTimezone(hotel!.timezone);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    startDate: today,
    endDate: addDays(today, 364),
    rent: String(unit.monthlyRentCents / 100),
    deposit: String(unit.monthlyRentCents / 100),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.rentals.createLease(hotel!.id, {
        unitId: unit.id,
        tenant: { name: form.name, phone: form.phone || undefined, email: form.email || undefined },
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRentCents: toCents(form.rent),
        depositCents: toCents(form.deposit),
      });
      toast(`Lease signed — ${form.name} moves into ${property.name} ${unit.label}`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create lease', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`New lease · ${property.name} ${unit.label}`}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tenantName">Tenant name</label>
          <input id="tenantName" name="tenantName" className="input" required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="tenantPhone">Phone</label>
          <input id="tenantPhone" name="tenantPhone" className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+252 61 …" />
        </div>
        <div>
          <label className="label" htmlFor="tenantEmail">Email</label>
          <input id="tenantEmail" name="tenantEmail" type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="leaseStart">Start date</label>
          <input id="leaseStart" name="leaseStart" type="date" className="input" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="leaseEnd">End date</label>
          <input id="leaseEnd" name="leaseEnd" type="date" className="input" required min={form.startDate} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="leaseRent">Monthly rent ({hotel!.currency})</label>
          <input id="leaseRent" name="leaseRent" type="number" min={0} step="0.01" className="input" required value={form.rent} onChange={(e) => set('rent', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="leaseDeposit">Deposit ({hotel!.currency})</label>
          <input id="leaseDeposit" name="leaseDeposit" type="number" min={0} step="0.01" className="input" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Sign lease</Button>
        </div>
      </form>
    </Modal>
  );
}

function PropertyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { hotel } = useHotel();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', type: 'APARTMENT' as PropertyType, address: '', city: hotel!.city, units: '4', prefix: 'Unit ', bedrooms: '2', rent: '500' });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const count = Math.max(1, Math.min(200, Number(form.units)));
      await api.rentals.createProperty(hotel!.id, {
        name: form.name,
        type: form.type,
        address: form.address,
        city: form.city,
        units: Array.from({ length: count }, (_, i) => ({
          label: `${form.prefix}${i + 1}`.trim(),
          bedrooms: Number(form.bedrooms),
          monthlyRentCents: toCents(form.rent),
        })),
      });
      toast(`${form.name} added with ${count} unit${count === 1 ? '' : 's'}`);
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add property', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add rental property">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="propName">Property name</label>
          <input id="propName" name="propName" className="input" required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="propType">Type</label>
          <select id="propType" name="propType" className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {Object.values(PropertyType).map((t) => (
              <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="propCity">City</label>
          <input id="propCity" name="propCity" className="input" required value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="propAddress">Address</label>
          <input id="propAddress" name="propAddress" className="input" required minLength={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="propUnits">Number of units</label>
          <input id="propUnits" name="propUnits" type="number" min={1} max={200} className="input" required value={form.units} onChange={(e) => set('units', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="propPrefix">Unit label prefix</label>
          <input id="propPrefix" name="propPrefix" className="input" value={form.prefix} onChange={(e) => set('prefix', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="propBeds">Bedrooms per unit</label>
          <input id="propBeds" name="propBeds" type="number" min={0} max={20} className="input" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="propRent">Monthly rent ({hotel!.currency})</label>
          <input id="propRent" name="propRent" type="number" min={0} step="0.01" className="input" required value={form.rent} onChange={(e) => set('rent', e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add property</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function RentalsPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.rentals.overview(hotelId), api.rentals.properties(hotelId)]),
    [hotelId],
  );
  const [leasing, setLeasing] = useState<{ unit: RentalUnitDto; property: RentalPropertyDto } | null>(null);
  const [adding, setAdding] = useState(false);
  const money = (c: number) => formatMoney(c, hotel!.currency);

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24 text-brand-700">
        <Spinner />
      </div>
    );
  }
  if (!data) return <ErrorBanner error={error} onRetry={reload} />;
  const [overview, properties] = data;

  return (
    <>
      <PageHeader
        title="Property rentals"
        subtitle="Guryaha Kirada — your rental portfolio, unit by unit"
        actions={<Button onClick={() => setAdding(true)}>Add property</Button>}
      />
      <ErrorBanner error={error} onRetry={reload} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="brand" label="Occupancy" value={formatPercent(overview.occupancyRate)} hint={`${overview.unitStatus.OCCUPIED} of ${overview.units} units let · ${overview.properties} properties`} />
        <Stat label="Monthly rent roll" value={money(overview.monthlyRentRollCents)} hint="Across all active leases" />
        <Stat label="Collected this month" value={money(overview.collectedThisMonthCents)} hint={<Link className="underline-offset-2 hover:underline" href="/workspace/rentals/payments">View rent collection</Link>} />
        <Stat tone="sand" label="Outstanding" value={money(overview.outstandingCents)} hint={`${overview.overdueCount} overdue invoice${overview.overdueCount === 1 ? '' : 's'}`} />
      </div>

      {overview.expiringSoon.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Leases ending in the next 60 days" subtitle="Plan renewals or re-letting before units fall vacant" />
          <div className="divide-y divide-slate-100">
            {overview.expiringSoon.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.tenant.name}</p>
                  <p className="text-xs text-ink-subtle">{l.property.name} · {l.unit.label}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">Ends {l.endDate}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 space-y-6">
        {properties.length === 0 && <EmptyState title="No rental properties yet" description="Add your first property to start letting units." />}
        {properties.map((p) => {
          const occupied = p.units.filter((u) => u.status === 'OCCUPIED').length;
          return (
            <Card key={p.id}>
              <CardHeader
                title={p.name}
                subtitle={`${PROPERTY_TYPE_LABELS[p.type]} · ${p.address}, ${p.city}`}
                action={<Badge>{occupied}/{p.units.length} let</Badge>}
              />
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                {p.units.map((u) => {
                  const style = UNIT_STATUS_STYLE[u.status];
                  const vacant = u.status === 'VACANT';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={!vacant}
                      onClick={() => setLeasing({ unit: u, property: p })}
                      title={vacant ? 'Sign a new lease for this unit' : undefined}
                      className={clsx('rounded-xl border-2 p-3 text-left transition disabled:cursor-default', style.tile)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-semibold">{u.label}</span>
                        <span className={clsx('h-2.5 w-2.5 rounded-full', style.dot)} />
                      </div>
                      <p className={clsx('mt-1 text-xs font-medium', style.text)}>{UNIT_STATUS_LABELS[u.status]}</p>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {u.tenant ? u.tenant.name : vacant ? 'Click to let' : '—'}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-ink-subtle">
                        {money(u.monthlyRentCents)}/mo{u.bedrooms > 0 ? ` · ${u.bedrooms} bd` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {leasing && (
        <LeaseModal
          unit={leasing.unit}
          property={leasing.property}
          onClose={() => setLeasing(null)}
          onDone={() => {
            setLeasing(null);
            void reload();
          }}
        />
      )}
      {adding && (
        <PropertyModal
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
