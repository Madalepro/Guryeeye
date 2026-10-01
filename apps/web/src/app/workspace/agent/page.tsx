'use client';

import { formatMoney, LEAD_STAGE_LABELS, OPEN_LEAD_STAGES } from '@guryeeye/shared';
import Link from 'next/link';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useHotel } from '@/lib/hotel';
import { useAsync } from '@/lib/use-async';

export default function AgentDeskPage() {
  const { hotel } = useHotel();
  const { user } = useAuth();
  const hotelId = hotel!.id;
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.sales.leads(hotelId), api.sales.transactions(hotelId)]),
    [hotelId],
  );
  const money = (c: number) => formatMoney(c, hotel!.currency);

  if (loading && !data) return <div className="flex justify-center py-24 text-brand-700"><Spinner /></div>;
  if (!data) return <ErrorBanner error={error} onRetry={reload} />;

  const [leads, deals] = data;
  const mine = leads.filter((l) => l.agent?.id === user?.id);
  const unassigned = leads.filter((l) => !l.agent && (OPEN_LEAD_STAGES as readonly string[]).includes(l.stage));
  const myOpen = mine.filter((l) => (OPEN_LEAD_STAGES as readonly string[]).includes(l.stage));
  const myDeals = deals.filter((d) => d.agent?.id === user?.id);

  return (
    <>
      <PageHeader
        title="Agent desk"
        subtitle="Agents · Dalaaliin — your buyers, your deals and your commission"
        actions={<Link href="/workspace/sales/leads"><Button>Open full pipeline</Button></Link>}
      />
      <ErrorBanner error={error} onRetry={reload} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="brand" label="My open leads" value={myOpen.length} hint={`${myOpen.filter((l) => l.stage === 'NEGOTIATION').length} in negotiation`} />
        <Stat label="New website enquiries" value={unassigned.length} hint="Not yet picked up by an agent" />
        <Stat label="My closed deals" value={myDeals.length} hint={money(myDeals.reduce((s, d) => s + d.priceCents, 0))} />
        <Stat tone="sand" label="My commission" value={money(myDeals.reduce((s, d) => s + d.commissionCents, 0))} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {(
          [
            ['My open leads', myOpen],
            ['Website enquiries to pick up', unassigned],
          ] as const
        ).map(([title, list]) => (
          <Card key={title}>
            <CardHeader title={title} subtitle={`${list.length} buyer${list.length === 1 ? '' : 's'}`} />
            <div className="divide-y divide-slate-100">
              {list.length === 0 && <div className="p-5"><EmptyState title="Nothing here right now" /></div>}
              {list.slice(0, 10).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="truncate text-xs text-ink-subtle">{l.listing?.title ?? 'No property chosen'}{l.phone ? ` · ${l.phone}` : ''}</p>
                  </div>
                  <Badge>{LEAD_STAGE_LABELS[l.stage]}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
