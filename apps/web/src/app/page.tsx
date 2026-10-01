import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { Logo } from '@/components/brand';
import { IconBriefcase, IconHome, IconHotel, IconTrend } from '@/components/icons';

const SERVICES: { title: string; tag: string; body: string; points: string[]; icon: ComponentType<SVGProps<SVGSVGElement>>; accent: string }[] = [
  {
    title: 'Hotel Management',
    tag: 'HMS',
    body: 'Run every room, shift and sale from one live workspace.',
    points: ['Live colour-coded room grid', 'Housekeeping board with inspection', 'Restaurant, bar & spa POS', 'Bookings, check-in and folios'],
    icon: IconHotel,
    accent: 'bg-brand-600',
  },
  {
    title: 'Property Rentals',
    tag: 'Guryaha Kirada',
    body: 'Let apartments, houses and shops — and know who owes what.',
    points: ['Unit-by-unit portfolio view', 'Tenant directory and leases', 'Monthly rent invoicing', 'Overdue tracking and receipts'],
    icon: IconHome,
    accent: 'bg-emerald-600',
  },
  {
    title: 'Real Estate Sales',
    tag: 'Iibka',
    body: 'Move properties from listing to signed sale, with commission tracked.',
    points: ['Listings with asking prices', 'Buyer lead pipeline', 'Offers and negotiation stages', 'Closed transactions ledger'],
    icon: IconBriefcase,
    accent: 'bg-sand-500',
  },
  {
    title: 'Platform Analytics',
    tag: 'All services',
    body: 'One revenue picture across hotels, rentals and sales.',
    points: ['Combined daily revenue', 'Revenue mix by service', 'Occupancy for rooms and units', 'Platform-wide admin console'],
    icon: IconTrend,
    accent: 'bg-sky-600',
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-950 text-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full bg-sand-500/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Logo inverted />
          <Link href="/login" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-white/20">
            Sign in
          </Link>
        </header>

        <section className="max-w-3xl py-20">
          <p className="mb-4 inline-flex rounded-full bg-sand-500/15 px-3 py-1 text-xs font-medium text-sand-300 ring-1 ring-sand-400/30">
            Real estate & property platform
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Hotels, rentals and sales — <span className="text-sand-300">one Guryeeye.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-100/80">
            Guryeeye brings hotel operations, rental housing, property sales and platform-wide analytics into a single workspace,
            so every team and every property works from the same live picture.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-lg bg-sand-500 px-5 py-3 text-sm font-semibold shadow-lg hover:bg-sand-600">
              Open your workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.title} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-300">{s.tag}</p>
              <h3 className="font-display font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-brand-100/70">{s.body}</p>
              <ul className="mt-4 space-y-1.5 text-xs text-brand-100/80">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-sand-300" aria-hidden>•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
