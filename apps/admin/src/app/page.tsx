'use client';

import { formatMoney, formatPercent, type CreateHotelRequest, type PlatformOverview } from '@guryeeye/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
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

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
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
      setError(err instanceof Error ? err.message : 'Could not create hotel');
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
            <h1 className="font-display text-2xl font-semibold">Platform overview</h1>
            <p className="mt-1 text-sm text-ink-muted">All properties on Guryeeye · trailing 30 days</p>
          </div>
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-sand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sand-600">
            {showForm ? 'Cancel' : 'Onboard hotel'}
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showForm && (
          <form onSubmit={createHotel} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Hotel name</label>
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
                {saving ? 'Creating…' : 'Create hotel'}
              </button>
            </div>
          </form>
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi label="Hotels" value={data.hotels} />
              <Kpi label="Rooms" value={data.rooms} />
              <Kpi label="Active users" value={data.users} />
              <Kpi label="Active bookings" value={data.activeReservations} />
              <Kpi label="Revenue (30d)" value={formatMoney(data.revenueLast30DaysCents)} />
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Hotel</th>
                    <th className="px-5 py-3 font-medium">Location</th>
                    <th className="px-5 py-3 text-right font-medium">Rooms</th>
                    <th className="px-5 py-3 font-medium">Occupancy (30d)</th>
                    <th className="px-5 py-3 text-right font-medium">Revenue (30d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.hotelStats.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium">{h.name}</p>
                        <p className="text-xs text-ink-subtle">{h.slug}</p>
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{h.city}, {h.country}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{h.roomCount}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.min(100, h.occupancyRate * 100)}%` }} />
                          </div>
                          <span className="tabular-nums text-ink-muted">{formatPercent(h.occupancyRate)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">{formatMoney(h.revenueLast30DaysCents, h.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
