'use client';

import { formatMoney, PROPERTY_TYPE_LABELS, type PublicListing } from '@guryeeye/shared';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Logo } from '@/components/brand';
import { IconMenu } from '@/components/icons';
import { useToast } from '@/components/toast';
import { Button, Modal } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export const SITE_NAV = [
  { href: '/rent', label: 'For Rent' },
  { href: '/sale', label: 'For Sale' },
  { href: '/projects', label: 'Projects' },
  { href: '/agents', label: 'Agents' },
  { href: '/find', label: 'Find a Home' },
  { href: '/hotels', label: 'Hotels' },
  { href: '/how-it-works', label: 'How it works' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const links = SITE_NAV.map((n) => {
    const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
    return (
      <Link
        key={n.href}
        href={n.href}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'rounded-lg px-3 py-2 text-sm font-medium transition',
          active ? 'bg-brand-50 text-brand-800' : 'text-ink-muted hover:bg-slate-100 hover:text-ink',
        )}
      >
        {n.label}
      </Link>
    );
  });

  const actions = user ? (
    <Link href="/workspace" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800">
      My workspace
    </Link>
  ) : (
    <>
      <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-slate-100">
        Sign in
      </Link>
      <Link href="/get-started" className="rounded-lg bg-sand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sand-600">
        Get started
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Guryeeye home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {links}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">{actions}</div>
        <button className="rounded-lg p-2 text-ink-muted hover:bg-slate-100 xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="Open menu" aria-expanded={open}>
          <IconMenu />
        </button>
      </div>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 xl:hidden">
          <nav className="flex flex-col py-2" aria-label="Main mobile">
            {links}
          </nav>
          <div className="flex gap-2">{actions}</div>
        </div>
      )}
    </header>
  );
}

const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Find a home', links: [['Homes for rent', '/rent'], ['Properties for sale', '/sale'], ['New projects', '/projects'], ['Search all homes', '/find']] },
  { title: 'Hotels', links: [['Browse hotels', '/hotels'], ['Hotel management (HMS)', '/workspace/hotel']] },
  { title: 'For professionals', links: [['Agents · Dalaaliin', '/agents'], ['List your property', '/get-started'], ['Property management', '/workspace/rentals'], ['Sign in', '/login']] },
  { title: 'Guryeeye', links: [['How it works', '/how-it-works'], ['Get started', '/get-started']] },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-brand-950 text-brand-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Logo inverted />
          <p className="mt-4 text-sm text-brand-100/70">
            Verified homes, offices and hotels across the Horn of Africa — and the tools to manage them.
          </p>
        </div>
        {FOOTER.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-sand-300">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-brand-100/80 hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-6 py-5 text-xs text-brand-200/60">© {new Date().getFullYear()} Guryeeye. Mogadishu · Hargeisa.</p>
      </div>
    </footer>
  );
}

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="border-b border-slate-200/70 bg-gradient-to-b from-brand-50/60 to-transparent">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-ink-muted">{children}</div>}
      </div>
    </section>
  );
}

const TYPE_TINT: Record<string, string> = {
  APARTMENT: 'from-sky-100 to-sky-50 text-sky-700',
  HOUSE: 'from-emerald-100 to-emerald-50 text-emerald-700',
  VILLA: 'from-amber-100 to-amber-50 text-amber-700',
  COMMERCIAL: 'from-violet-100 to-violet-50 text-violet-700',
  LAND: 'from-lime-100 to-lime-50 text-lime-700',
};

export function ListingCard({ listing, onInquire }: { listing: PublicListing; onInquire: (l: PublicListing) => void }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className={clsx('relative flex h-32 items-end bg-gradient-to-br p-4', TYPE_TINT[listing.type])}>
        <span className="font-display text-sm font-semibold">{PROPERTY_TYPE_LABELS[listing.type]}</span>
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink shadow-sm">
          {listing.kind === 'rent' ? 'For rent' : 'For sale'}
        </span>
        {listing.verified && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            ✓ Verified
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-display text-lg font-semibold tabular-nums">
          {formatMoney(listing.priceCents, listing.currency)}
          {listing.kind === 'rent' && <span className="text-sm font-normal text-ink-subtle"> / month</span>}
        </p>
        <h3 className="mt-1 line-clamp-1 text-sm font-medium">{listing.title}</h3>
        <p className="text-xs text-ink-subtle">{listing.address}, {listing.city}</p>
        <p className="mt-2 text-xs text-ink-muted">
          {[listing.bedrooms !== null ? `${listing.bedrooms} bed${listing.bedrooms === 1 ? '' : 's'}` : null, listing.areaSqm ? `${listing.areaSqm} m²` : null, listing.status === 'UNDER_OFFER' ? 'Under offer' : null]
            .filter(Boolean)
            .join(' · ') || '\u00a0'}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="truncate text-xs text-ink-subtle">by {listing.listedBy.name}</span>
          <Button size="sm" onClick={() => onInquire(listing)}>Enquire</Button>
        </div>
      </div>
    </article>
  );
}

export function InquiryModal({ listing, onClose }: { listing: PublicListing | null; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!listing) return;
    setSending(true);
    try {
      await api.marketplace.inquire({
        listingId: listing.id,
        kind: listing.kind,
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        message: form.message || undefined,
      });
      toast(`Sent! ${listing.listedBy.name} will contact you shortly.`);
      setForm({ name: '', phone: '', email: '', message: '' });
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send your enquiry', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={!!listing} onClose={onClose} title="Contact the agent">
      {listing && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-muted">
            {listing.title} · <span className="font-medium text-ink">{formatMoney(listing.priceCents, listing.currency)}{listing.kind === 'rent' ? '/mo' : ''}</span>
          </p>
          <div>
            <label className="label" htmlFor="inqName">Your name</label>
            <input id="inqName" name="inqName" className="input" required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="inqPhone">Phone</label>
              <input id="inqPhone" name="inqPhone" className="input" required minLength={5} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+252 61 …" />
            </div>
            <div>
              <label className="label" htmlFor="inqEmail">Email (optional)</label>
              <input id="inqEmail" name="inqEmail" type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="inqMessage">Message</label>
            <textarea id="inqMessage" name="inqMessage" rows={3} className="input" value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="When can I view it?" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={sending}>Send enquiry</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
