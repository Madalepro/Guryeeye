'use client';

import { formatMoney, formatPercent, type CreateHotelRequest, type PlatformOverview } from '@guryeeye/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, TOKEN_KEY } from '@/lib/api';

const EMPTY_HOTEL: CreateHotelRequest = {
  name: '',
  slug: '',
  city: '',
  country: '',
  currency: 'USD',
  timezone: 'Africa/Mogadishu',
  taxRateBps: 1000,
};

type Tab = 'overview' | 'hotels' | 'rentals' | 'sales';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Platform overview' },
  { id: 'hotels', label: 'Hotel management' },
  { id: 'rentals', label: 'Rentals · Guryaha Kirada' },
  { id: 'sales', label: 'Sales · Iibka' },
];

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

function Table({ head, rows }: { head: { label: string; right?: boolean }[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            {head.map((h) => (
              <th key={h.label} className={`px-5 py-3 font-medium ${h.right ? 'text-right' : ''}`}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-slate-50/60">
              {r.cells.map((c, i) => (
                <td key={i} className={`px-5 py-3 ${head[i]?.right ? 'text-right tabular-nums' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateHotelRequest>(EMPTY_HOTEL);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    try {
      setData(await api.admin.overview());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    if (!window.localStorage.getItem(TOKEN_KEY)) {
      router.replace('/login');
      return;
    }
    void load();
  }, [load, router]);

  async function createHotel(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.hotels.create(form);
      setForm(EMPTY_HOTEL);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account');
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof CreateHotelRequest>(k: K, v: CreateHotelRequest[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen">
      <header className="bg-brand-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <p className="font-display text-lg font-bold">
            Guryeeye <span className="font-medium text-sand-300">Admin</span>
          </p>
          <button
            className="rounded-lg px-3 py-1.5 text-sm text-brand-100 hover:bg-white/10"
            onClick={() => {
              window.localStorage.removeItem(TOKEN_KEY);
              router.replace('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Platform admin</h1>
            <p className="mt-1 text-sm text-ink-muted">Hotels, rentals and sales across every Guryeeye account · trailing 30 days</p>
          </div>
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-sand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sand-600">
            {showForm ? 'Cancel' : 'Onboard account'}
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showForm && (
          <form onSubmit={createHotel} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Account / hotel name</label>
              <input id="name" className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="slug">Slug</label>
              <input id="slug" className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="garowe-plaza" />
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" className="input" required value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="country">Country</label>
              <input id="country" className="input" required value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="currency">Currency</label>
              <input id="currency" className="input" required maxLength={3} minLength={3} value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label" htmlFor="tax">Tax rate %</label>
              <input id="tax" type="number" step="0.01" min={0} max={50} className="input" value={form.taxRateBps / 100} onChange={(e) => set('taxRateBps', Math.round(Number(e.target.value) * 100))} />
            </div>
            <div className="sm:col-span-3">
              <label className="label" htmlFor="tz">Timezone (IANA)</label>
              <input id="tz" className="input" required value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                {saving ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        )}

        {data && (
          <>
            <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Admin sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:bg-slate-50 hover:text-ink'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === 'overview' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi
                    label="Combined revenue (30d)"
                    value={formatMoney(data.revenueLast30DaysCents + data.rentals.collectedLast30DaysCents + data.sales.commissionLast30DaysCents)}
                    hint="Hotels + rent collected + sales commission"
                  />
                  <Kpi label="Hotels" value={formatMoney(data.revenueLast30DaysCents)} hint={`${data.hotels} properties · ${data.rooms} rooms`} />
                  <Kpi label="Rentals" value={formatMoney(data.rentals.collectedLast30DaysCents)} hint={`${data.rentals.occupiedUnits}/${data.rentals.units} units let`} />
                  <Kpi label="Sales commission" value={formatMoney(data.sales.commissionLast30DaysCents)} hint={`${data.sales.soldLast30Days} sold · ${data.sales.activeListings} on market`} />
                </div>
                <Table
                  head={[
                    { label: 'Account' },
                    { label: 'Hotel revenue', right: true },
                    { label: 'Rental units', right: true },
                    { label: 'Rent collected', right: true },
                    { label: 'Listings', right: true },
                    { label: 'Sales commission', right: true },
                  ]}
                  rows={data.accountStats.map((a) => ({
                    key: a.id,
                    cells: [
                      <div key="n"><p className="font-medium">{a.name}</p><p className="text-xs text-ink-subtle">{a.city}</p></div>,
                      formatMoney(a.hotelRevenueCents, a.currency),
                      a.rentalUnits,
                      formatMoney(a.rentCollectedCents, a.currency),
                      a.activeListings,
                      formatMoney(a.salesCommissionCents, a.currency),
                    ],
                  }))}
                />
                <p className="mt-3 text-xs text-ink-subtle">{data.users} active users across the platform.</p>
              </>
            )}

            {tab === 'hotels' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi label="Hotels" value={data.hotels} />
                  <Kpi label="Rooms" value={data.rooms} />
                  <Kpi label="Active bookings" value={data.activeReservations} />
                  <Kpi label="Revenue (30d)" value={formatMoney(data.revenueLast30DaysCents)} />
                </div>
                <Table
                  head={[{ label: 'Hotel' }, { label: 'Location' }, { label: 'Rooms', right: true }, { label: 'Occupancy (30d)' }, { label: 'Revenue (30d)', right: true }]}
                  rows={data.hotelStats.map((h) => ({
                    key: h.id,
                    cells: [
                      <div key="n"><p className="font-medium">{h.name}</p><p className="text-xs text-ink-subtle">{h.slug}</p></div>,
                      <span key="l" className="text-ink-muted">{h.city}, {h.country}</span>,
                      h.roomCount,
                      <div key="o" className="flex items-center gap-3">
                        <div className="h-2 w-28 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, h.occupancyRate * 100)}%` }} />
                        </div>
                        <span className="tabular-nums text-ink-muted">{formatPercent(h.occupancyRate)}</span>
                      </div>,
                      <span key="r" className="font-medium">{formatMoney(h.revenueLast30DaysCents, h.currency)}</span>,
                    ],
                  }))}
                />
              </>
            )}

            {tab === 'rentals' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi label="Properties" value={data.rentals.properties} hint={`${data.rentals.units} units`} />
                  <Kpi label="Unit occupancy" value={formatPercent(data.rentals.units ? data.rentals.occupiedUnits / data.rentals.units : 0)} hint={`${data.rentals.activeLeases} active leases`} />
                  <Kpi label="Rent collected (30d)" value={formatMoney(data.rentals.collectedLast30DaysCents)} />
                  <Kpi label="Outstanding rent" value={formatMoney(data.rentals.outstandingCents)} />
                </div>
                <Table
                  head={[{ label: 'Account' }, { label: 'Rental units', right: true }, { label: 'Rent collected (30d)', right: true }]}
                  rows={data.accountStats.map((a) => ({
                    key: a.id,
                    cells: [
                      <div key="n"><p className="font-medium">{a.name}</p><p className="text-xs text-ink-subtle">{a.city}</p></div>,
                      a.rentalUnits,
                      formatMoney(a.rentCollectedCents, a.currency),
                    ],
                  }))}
                />
              </>
            )}

            {tab === 'sales' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi label="Listings on market" value={data.sales.activeListings} />
                  <Kpi label="Open buyer leads" value={data.sales.openLeads} />
                  <Kpi label="Sales volume (30d)" value={formatMoney(data.sales.volumeLast30DaysCents)} hint={`${data.sales.soldLast30Days} properties sold`} />
                  <Kpi label="Commission (30d)" value={formatMoney(data.sales.commissionLast30DaysCents)} />
                </div>
                <Table
                  head={[{ label: 'Account' }, { label: 'Listings on market', right: true }, { label: 'Commission (30d)', right: true }]}
                  rows={data.accountStats.map((a) => ({
                    key: a.id,
                    cells: [
                      <div key="n"><p className="font-medium">{a.name}</p><p className="text-xs text-ink-subtle">{a.city}</p></div>,
                      a.activeListings,
                      formatMoney(a.salesCommissionCents, a.currency),
                    ],
                  }))}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
