'use client';

import {
  formatMoney,
  formatPercent,
  hasCapability,
  ROOM_STATUS_LABELS,
  RoomStatus,
  type ReservationDto,
} from '@guryeeye/shared';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, PageHeader, Spinner, Stat } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useHotel, useHotelEvents } from '@/lib/hotel';
import { ROOM_STATUS_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';

export default function OverviewPage() {
  const { hotel } = useHotel();
  const { user } = useAuth();
  const toast = useToast();
  const hotelId = hotel!.id;
  const { data, error, loading, reload } = useAsync(() => api.hotels.overview(hotelId), [hotelId]);
  const [busy, setBusy] = useState<string | null>(null);

  useHotelEvents((e) => {
    if (e.type === 'room.updated' || e.type === 'reservation.updated' || e.type === 'order.updated') void reload();
  });

  const canFrontDesk = !!user && hasCapability(user.role, 'frontDesk');

  async function act(r: ReservationDto, action: 'checkIn' | 'checkOut') {
    setBusy(r.id);
    try {
      await (action === 'checkIn' ? api.reservations.checkIn(hotelId, r.id) : api.reservations.checkOut(hotelId, r.id));
      toast(action === 'checkIn' ? `${r.guest.name} checked in` : `${r.guest.name} checked out — cleaning task created`);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24 text-brand-700">
        <Spinner />
      </div>
    );
  }
  if (!data) return <ErrorBanner error={error} onRetry={reload} />;

  const total = hotel!.roomCount || 1;
  const sellable = total - data.roomStatus.OUT_OF_ORDER - data.roomStatus.MAINTENANCE;
  const occupancy = sellable > 0 ? data.roomStatus.OCCUPIED / sellable : 0;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader
        title={`${greeting}, ${user?.name.split(' ')[0]}`}
        subtitle={`Business date ${new Date(`${data.today}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <Link href="/workspace/rooms">
            <Button>Open room grid</Button>
          </Link>
        }
      />
      <ErrorBanner error={error} onRetry={reload} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat tone="brand" label="Occupancy tonight" value={formatPercent(occupancy)} hint={`${data.roomStatus.OCCUPIED} of ${sellable} sellable rooms`} />
        <Stat label="In-house guests" value={data.inHouse} hint={`${data.arrivals.length} arriving · ${data.departures.length} departing`} />
        <Stat label="Open housekeeping" value={data.openTasks} hint={`${data.cleanliness.DIRTY} dirty · ${data.cleanliness.CLEANING} in progress`} />
        <Stat tone="sand" label="Revenue today" value={formatMoney(data.todayRevenueCents, hotel!.currency)} hint={`${data.openOrders} open POS tickets`} />
      </div>

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Room status</h3>
          <span className="text-xs text-ink-subtle">{hotel!.roomCount} rooms</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
          {Object.values(RoomStatus).map((s) => (
            <div
              key={s}
              className={ROOM_STATUS_STYLE[s].dot}
              style={{ width: `${(data.roomStatus[s] / total) * 100}%` }}
              title={`${ROOM_STATUS_LABELS[s]}: ${data.roomStatus[s]}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {Object.values(RoomStatus).map((s) => (
            <span key={s} className="inline-flex items-center gap-2 text-xs text-ink-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${ROOM_STATUS_STYLE[s].dot}`} />
              {ROOM_STATUS_LABELS[s]} <span className="font-semibold text-ink tabular-nums">{data.roomStatus[s]}</span>
            </span>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {(
          [
            ['Arrivals today', data.arrivals, 'checkIn', 'Check in'],
            ['Departures due', data.departures, 'checkOut', 'Check out'],
          ] as const
        ).map(([title, list, action, label]) => (
          <Card key={title}>
            <CardHeader title={title} subtitle={`${list.length} reservation${list.length === 1 ? '' : 's'}`} />
            <div className="divide-y divide-slate-100">
              {list.length === 0 && (
                <div className="p-5">
                  <EmptyState title="Nothing pending" />
                </div>
              )}
              {list.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.guest.name}</p>
                    <p className="text-xs text-ink-subtle">
                      {r.roomType.name} · {r.checkIn} → {r.checkOut} · {r.adults} guest{r.adults === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{r.room ? `Room ${r.room.number}` : 'Unassigned'}</Badge>
                    {canFrontDesk && (
                      <Button size="sm" variant={action === 'checkIn' ? 'primary' : 'secondary'} disabled={!r.room} loading={busy === r.id} onClick={() => act(r, action)}>
                        {label}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
