'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PageIntro } from '@/components/site';
import { Button, ErrorBanner } from '@/components/ui';
import { api, TOKEN_KEY } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function GetStartedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({ businessName: '', city: '', country: 'Somalia', name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.auth.register(form);
      window.localStorage.setItem(TOKEN_KEY, res.accessToken);
      // Full navigation so the auth context re-reads the new session.
      window.location.assign('/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro eyebrow="Get started" title="List your property on Guryeeye">
        Create a free business account for your agency, rental portfolio, developments or hotel. You will be signed straight into your workspace.
      </PageIntro>
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {user ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <p className="font-medium">You are signed in as {user.name}.</p>
              <Button className="mt-4" onClick={() => router.push('/workspace')}>Go to my workspace</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:grid-cols-2">
              <ErrorBanner error={error} />
              <div className="sm:col-span-2">
                <label className="label" htmlFor="gsBusiness">Business name</label>
                <input id="gsBusiness" name="gsBusiness" className="input" required minLength={2} value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="Xamar Homes & Realty" />
              </div>
              <div>
                <label className="label" htmlFor="gsCity">City</label>
                <input id="gsCity" name="gsCity" className="input" required value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="gsCountry">Country</label>
                <input id="gsCountry" name="gsCountry" className="input" required minLength={2} value={form.country} onChange={(e) => set('country', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="gsName">Your full name</label>
                <input id="gsName" name="gsName" className="input" required minLength={2} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="gsEmail">Email</label>
                <input id="gsEmail" name="gsEmail" type="email" className="input" required autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="gsPassword">Password</label>
                <input id="gsPassword" name="gsPassword" type="password" className="input" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <p className="text-xs text-ink-subtle">Already have an account? <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link></p>
                <Button type="submit" loading={saving}>Create my account</Button>
              </div>
            </form>
          )}
        </div>
        <aside className="space-y-4 lg:col-span-2">
          {[
            ['Rentals · Guryaha Kirada', 'Add buildings and units, sign leases, issue monthly rent invoices and record payments.'],
            ['Sales · Iibka', 'Publish listings, receive buyer enquiries into a pipeline and record closed sales with commission.'],
            ['Property management', 'Track maintenance from report to resolution and answer rental enquiries.'],
            ['Hotels (HMS)', 'Room grid, housekeeping, point of sale and bookings.'],
          ].map(([t, b]) => (
            <div key={t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-display font-semibold">{t}</p>
              <p className="mt-1 text-sm text-ink-muted">{b}</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
