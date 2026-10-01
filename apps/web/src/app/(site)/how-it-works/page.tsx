import Link from 'next/link';
import { PageIntro } from '@/components/site';

export const metadata = { title: 'How it works' };

const AUDIENCES: { title: string; steps: string[]; cta: [string, string] }[] = [
  {
    title: 'Renting a home',
    steps: [
      'Search homes for rent by city, type, bedrooms and monthly budget.',
      'Send an enquiry — it lands in the landlord’s Guryeeye inbox instantly.',
      'Sign your lease; every monthly invoice and payment is tracked for you and the landlord.',
    ],
    cta: ['Browse rentals', '/rent'],
  },
  {
    title: 'Buying a property',
    steps: [
      'Browse villas, houses, plots and offices for sale, or new projects off-plan.',
      'Enquire and the listing agent adds you to their pipeline and books a viewing.',
      'Make an offer, negotiate and close — the agreed price is recorded on the deal.',
    ],
    cta: ['Browse sales', '/sale'],
  },
  {
    title: 'Owners, agents and hotels',
    steps: [
      'Create a free business account with Get started.',
      'Add rental properties, sale listings or hotel rooms — each service has its own workspace.',
      'Collect rent, track maintenance, work your sales pipeline or run hotel operations, with one combined analytics view.',
    ],
    cta: ['Get started', '/get-started'],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro eyebrow="How it works" title="Trusted property, end to end">
        Guryeeye connects renters, buyers and travellers with the agents, landlords and hotels who manage their properties on the same platform.
      </PageIntro>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-3">
        {AUDIENCES.map((a) => (
          <section key={a.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">{a.title}</h2>
            <ol className="mt-4 flex-1 space-y-4">
              {a.steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-ink-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <Link href={a.cta[1]} className="mt-6 text-sm font-semibold text-brand-700 hover:underline">{a.cta[0]} →</Link>
          </section>
        ))}
      </div>
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-2xl bg-brand-50 p-6 text-sm text-ink-muted">
          <p className="font-medium text-ink">What does “Verified” mean?</p>
          <p className="mt-1">
            Listings carry the Verified badge when the business that published them has been checked and approved by the Guryeeye platform team.
            New self-registered accounts can list straight away and are badged once verification is complete.
          </p>
        </div>
      </div>
    </>
  );
}
