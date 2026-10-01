'use client';

import { formatMoney, type PublicListing } from '@guryeeye/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ComponentType, type FormEvent, type SVGProps } from 'react';
import { IconBriefcase, IconChart, IconHome, IconHotel, IconKey, IconLayers, IconSearch, IconUser } from '@/components/icons';
import { InquiryModal, ListingCard } from '@/components/site';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/use-async';

const SERVICES: { title: string; body: string; href: string; cta: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { title: 'Homes for rent', body: 'Apartments, houses and shops from verified landlords — Guryaha Kirada.', href: '/rent', cta: 'Browse rentals', icon: IconKey },
  { title: 'Properties for sale', body: 'Villas, family houses, plots and offices — Iibka.', href: '/sale', cta: 'Browse sales', icon: IconHome },
  { title: 'New projects', body: 'Off-plan and newly built developments, with units still available.', href: '/projects', cta: 'See projects', icon: IconLayers },
  { title: 'Hotels', body: 'Stay somewhere trusted while you search, with live availability.', href: '/hotels', cta: 'Find a hotel', icon: IconHotel },
  { title: 'Agents · Dalaaliin', body: 'Work with brokers and property managers who know the neighbourhood.', href: '/agents', cta: 'Meet the agents', icon: IconUser },
  { title: 'Property management', body: 'Leases, rent collection, maintenance and sales pipelines for owners.', href: '/get-started', cta: 'List your property', icon: IconChart },
];

const STEPS = [
  ['Search', 'Filter verified homes for rent or sale by city, type, bedrooms and budget.'],
  ['Enquire', 'Send an enquiry in one tap — it goes straight to the agent or landlord.'],
  ['Move in', 'Sign your lease or close your purchase, with every payment on record.'],
] as const;

export default function HomePage() {
  const router = useRouter();
  const [kind, setKind] = useState<'rent' | 'sale'>('rent');
  const [q, setQ] = useState('');
  const [inquiring, setInquiring] = useState<PublicListing | null>(null);
  const stats = useAsync(() => api.marketplace.stats(), []);
  const rentals = useAsync(() => api.marketplace.listings({ kind: 'rent' }), []);
  const sales = useAsync(() => api.marketplace.listings({ kind: 'sale' }), []);
  const hotels = useAsync(() => api.marketplace.hotels(), []);

  function search(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ kind });
    if (q.trim()) params.set('q', q.trim());
    router.push(`/find?${params.toString()}`);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-sand-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <p className="mb-4 inline-flex rounded-full bg-sand-500/15 px-3 py-1 text-xs font-medium text-sand-300 ring-1 ring-sand-400/30">
            Rent · Buy · Stay · Manage
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Find a home you can trust</h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-100/80">
            Verified apartments, houses and offices for rent and sale across the Horn of Africa — listed by trusted agents and
            landlords, with hotels to stay in while you search.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/find" className="rounded-lg bg-sand-500 px-5 py-3 text-sm font-semibold shadow-lg hover:bg-sand-600">
              Browse properties
            </Link>
            <Link href="/get-started" className="rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/20 backdrop-blur hover:bg-white/20">
              List your property
            </Link>
          </div>

          <form onSubmit={search} className="mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 text-ink shadow-pop sm:flex-row">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['rent', 'sale'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${kind === k ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'}`}
                >
                  {k === 'rent' ? 'Rent' : 'Buy'}
                </button>
              ))}
            </div>
            <input
              name="heroSearch"
              aria-label="Search location"
              className="min-w-0 flex-1 rounded-xl px-4 py-2 text-sm outline-none"
              placeholder="Search Hodan, Lido, Jigjiga Yar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              <IconSearch className="h-4 w-4" /> Search
            </button>
          </form>

          {stats.data && (
            <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {(
                [
                  ['Homes for rent', stats.data.forRent],
                  ['For sale', stats.data.forSale],
                  ['Hotels', stats.data.hotels],
                  ['Agents', stats.data.agents],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-brand-200">{k}</dt>
                  <dd className="font-display text-2xl font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-16">
        <h2 className="font-display text-2xl font-semibold">Everything property, in one place</h2>
        <p className="mt-1 text-ink-muted">One Guryeeye account for renters, buyers, travellers, agents and owners.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.title} href={s.href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-brand-700 group-hover:text-white">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{s.body}</p>
              <p className="mt-4 text-sm font-semibold text-brand-700">{s.cta} →</p>
            </Link>
          ))}
        </div>
      </section>

      {(
        [
          ['Latest homes for rent', '/rent', rentals.data],
          ['Properties for sale', '/sale', sales.data],
        ] as const
      ).map(([title, href, list]) => (
        <section key={title} className="mx-auto max-w-7xl px-6 pt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            <Link href={href} className="text-sm font-semibold text-brand-700 hover:underline">View all →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list?.slice(0, 4).map((l) => <ListingCard key={l.id} listing={l} onInquire={setInquiring} />)}
          </div>
        </section>
      ))}

      {hotels.data && hotels.data.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">Hotels</h2>
            <Link href="/hotels" className="text-sm font-semibold text-brand-700 hover:underline">All hotels →</Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {hotels.data.map((h) => (
              <Link key={h.id} href="/hotels" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card hover:border-brand-300">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white"><IconHotel className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{h.name}</p>
                  <p className="text-xs text-ink-subtle">{h.city}, {h.country} · {h.availableTonight} rooms free tonight</p>
                </div>
                {h.fromRateCents !== null && (
                  <p className="text-right text-sm">
                    <span className="text-xs text-ink-subtle">from</span>
                    <br />
                    <span className="font-semibold">{formatMoney(h.fromRateCents, h.currency)}</span>
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="rounded-3xl bg-brand-50 p-8 sm:p-10">
          <h2 className="font-display text-2xl font-semibold">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-3 font-display font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/how-it-works" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-100">Learn more</Link>
            <Link href="/get-started" className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              <IconBriefcase className="h-4 w-4" /> Get started free
            </Link>
          </div>
        </div>
      </section>

      <InquiryModal listing={inquiring} onClose={() => setInquiring(null)} />
    </>
  );
}
