import Link from 'next/link';
import { Logo } from '@/components/brand';

const FEATURES = [
  { title: 'Live room grid', body: 'Colour-coded floor plans that update the moment a guest checks in or a room is cleaned.' },
  { title: 'Housekeeping board', body: 'Auto-generated tasks, fair assignment, and supervisor inspection built in.' },
  { title: 'POS & folios', body: 'Restaurant, bar and spa sales — paid on the spot or charged straight to the room.' },
  { title: 'Analytics', body: 'Occupancy, ADR, RevPAR and outlet revenue for any date range, exportable to CSV.' },
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

        <section className="max-w-2xl py-24">
          <p className="mb-4 inline-flex rounded-full bg-sand-500/15 px-3 py-1 text-xs font-medium text-sand-300 ring-1 ring-sand-400/30">
            Hotel Management System
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your whole hotel, <span className="text-sand-300">in one live workspace.</span>
          </h1>
          <p className="mt-6 text-lg text-brand-100/80">
            Guryeeye brings front desk, housekeeping, point of sale and reporting together so every team works from the
            same real-time picture.
          </p>
          <div className="mt-10 flex gap-3">
            <Link href="/login" className="rounded-lg bg-sand-500 px-5 py-3 text-sm font-semibold shadow-lg hover:bg-sand-600">
              Open Hotel Workspace
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h3 className="font-display font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-brand-100/70">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
