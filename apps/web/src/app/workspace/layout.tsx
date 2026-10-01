'use client';

import { hasCapability, type Capability } from '@guryeeye/shared';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Logo } from '@/components/brand';
import {
  IconBriefcase,
  IconBroom,
  IconChart,
  IconFunnel,
  IconGrid,
  IconHandshake,
  IconHome,
  IconHotel,
  IconKey,
  IconLayers,
  IconLogout,
  IconMenu,
  IconReceipt,
  IconTrend,
  IconWallet,
} from '@/components/icons';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { HotelProvider, useHotel, type LiveStatus } from '@/lib/hotel';

type NavItem = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; capability?: Capability };

const NAV: { section: string; capability?: Capability; items: NavItem[] }[] = [
  {
    section: 'Platform',
    items: [
      { href: '/workspace', label: 'Hub', icon: IconLayers },
      { href: '/workspace/analytics', label: 'Analytics', icon: IconTrend, capability: 'analytics' },
    ],
  },
  {
    section: 'Hotel management',
    capability: 'hotel',
    items: [
      { href: '/workspace/hotel', label: 'Hotel overview', icon: IconHotel },
      { href: '/workspace/rooms', label: 'Room grid', icon: IconGrid },
      { href: '/workspace/housekeeping', label: 'Housekeeping', icon: IconBroom, capability: 'housekeeping' },
      { href: '/workspace/pos', label: 'Point of sale', icon: IconReceipt, capability: 'pos' },
      { href: '/workspace/reports', label: 'Hotel reports', icon: IconChart, capability: 'reports' },
    ],
  },
  {
    section: 'Rentals · Guryaha Kirada',
    capability: 'rentals',
    items: [
      { href: '/workspace/rentals', label: 'Properties', icon: IconHome },
      { href: '/workspace/rentals/leases', label: 'Leases & tenants', icon: IconKey },
      { href: '/workspace/rentals/payments', label: 'Rent collection', icon: IconWallet },
    ],
  },
  {
    section: 'Sales · Iibka',
    capability: 'sales',
    items: [
      { href: '/workspace/sales', label: 'Listings', icon: IconBriefcase },
      { href: '/workspace/sales/leads', label: 'Lead pipeline', icon: IconFunnel },
      { href: '/workspace/sales/transactions', label: 'Transactions', icon: IconHandshake },
    ],
  },
];

/** Routes whose nav item should only match exactly, because child routes have their own item. */
const EXACT = new Set(['/workspace', '/workspace/rentals', '/workspace/sales']);

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_ADMIN: 'Platform admin',
  HOTEL_OWNER: 'Owner',
  MANAGER: 'Manager',
  FRONT_DESK: 'Front desk',
  HOUSEKEEPER: 'Housekeeping',
  POS_CASHIER: 'Cashier',
  PROPERTY_MANAGER: 'Property manager',
  SALES_AGENT: 'Sales agent',
};

function LiveIndicator({ status }: { status: LiveStatus }) {
  const map = {
    live: ['bg-emerald-500', 'Live'],
    connecting: ['bg-amber-400', 'Connecting'],
    offline: ['bg-red-500', 'Reconnecting'],
  } as const;
  const [dot, label] = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-slate-200">
      <span className="relative flex h-2 w-2">
        {status === 'live' && <span className={clsx('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', dot)} />}
        <span className={clsx('relative inline-flex h-2 w-2 rounded-full', dot)} />
      </span>
      {label}
    </span>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { hotels, hotel, selectHotel, live } = useHotel();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (!user) return null;
  const can = (c?: Capability) => !c || hasCapability(user.role, c);
  const sections = NAV.filter((s) => can(s.capability))
    .map((s) => ({ ...s, items: s.items.filter((i) => can(i.capability)) }))
    .filter((s) => s.items.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col bg-brand-950 text-brand-100">
      <div className="px-5 py-5">
        <Logo inverted />
      </div>
      {hotels.length > 1 ? (
        <div className="px-4 pb-4">
          <select
            name="accountSelect"
            aria-label="Select business account"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-400"
            value={hotel?.id ?? ''}
            onChange={(e) => selectHotel(e.target.value)}
          >
            {hotels.map((h) => (
              <option key={h.id} value={h.id} className="text-ink">
                {h.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        hotel && (
          <div className="mx-4 mb-4 rounded-lg bg-white/5 px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{hotel.name}</p>
            <p className="text-xs text-brand-200/70">{hotel.city}, {hotel.country}</p>
          </div>
        )
      )}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {sections.map((s) => (
          <div key={s.section}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-200/50">{s.section}</p>
            <div className="space-y-0.5">
              {s.items.map((n) => {
                const active = EXACT.has(n.href) ? pathname === n.href : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                      active ? 'bg-brand-700 text-white shadow-sm' : 'text-brand-100/80 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <n.icon />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-500 text-sm font-semibold text-white">
            {user.name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-brand-200/70">{ROLE_LABEL[user.role]}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-brand-200 hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out">
            <IconLogout />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[#f6f8f7]/85 px-4 py-3 backdrop-blur sm:px-8">
        <button className="rounded-lg p-2 text-ink-muted hover:bg-white lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <IconMenu />
        </button>
        <p className="hidden text-sm text-ink-muted sm:block">
          {hotel ? (
            <>
              <span className="font-medium text-ink">{hotel.name}</span> · {hotel.city}, {hotel.country}
            </>
          ) : (
            'Loading account…'
          )}
        </p>
        {can('hotel') ? <LiveIndicator status={live} /> : <span />}
      </header>
      <main className="px-4 py-6 sm:px-8 sm:py-8">
        {hotel ? (
          children
        ) : (
          <div className="flex justify-center py-24 text-brand-700">
            <Spinner />
          </div>
        )}
      </main>
    </div>
  );
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-700">
        <Spinner />
      </div>
    );
  }

  return (
    <HotelProvider realtime={hasCapability(user.role, 'hotel')}>
      <Shell>{children}</Shell>
    </HotelProvider>
  );
}
