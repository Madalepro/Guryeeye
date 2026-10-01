'use client';

import {
  Cleanliness,
  CLEANLINESS_LABELS,
  ROOM_STATUS_LABELS,
  RoomStatus,
  type RoomDto,
} from '@guryeeye/shared';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconUser } from '@/components/icons';
import { ErrorBanner, PageHeader, Segmented, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useHotel, useHotelEvents } from '@/lib/hotel';
import { CLEANLINESS_STYLE, ROOM_STATUS_STYLE } from '@/lib/status';
import { useAsync } from '@/lib/use-async';
import { RoomDrawer } from './room-drawer';

type Density = 'comfortable' | 'compact';

export default function RoomGridPage() {
  const { hotel } = useHotel();
  const hotelId = hotel!.id;
  const { data: rooms, error, loading, reload, setData } = useAsync(() => api.rooms.list(hotelId), [hotelId]);

  const [statusFilter, setStatusFilter] = useState<Set<RoomStatus>>(new Set());
  const [cleanFilter, setCleanFilter] = useState<Cleanliness | 'ALL'>('ALL');
  const [floor, setFloor] = useState<number | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [density, setDensity] = useState<Density>('comfortable');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const flashTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const flash = useCallback((id: string) => {
    setFlashing((s) => new Set(s).add(id));
    clearTimeout(flashTimers.current.get(id));
    flashTimers.current.set(
      id,
      setTimeout(() => setFlashing((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      }), 1600),
    );
  }, []);

  const upsert = useCallback(
    (room: RoomDto) => setData((list) => list?.map((r) => (r.id === room.id ? room : r))),
    [setData],
  );

  useHotelEvents((e) => {
    if (e.type === 'room.updated') {
      upsert(e.room);
      flash(e.room.id);
    }
  });

  const floors = useMemo(() => [...new Set((rooms ?? []).map((r) => r.floor))].sort((a, b) => b - a), [rooms]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(Object.values(RoomStatus).map((s) => [s, 0])) as Record<RoomStatus, number>;
    for (const r of rooms ?? []) c[r.status] += 1;
    return c;
  }, [rooms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rooms ?? []).filter(
      (r) =>
        (statusFilter.size === 0 || statusFilter.has(r.status)) &&
        (cleanFilter === 'ALL' || r.cleanliness === cleanFilter) &&
        (floor === 'ALL' || r.floor === floor) &&
        (!q || r.number.includes(q) || r.currentStay?.guestName.toLowerCase().includes(q) || r.roomType.name.toLowerCase().includes(q)),
    );
  }, [rooms, statusFilter, cleanFilter, floor, query]);

  const byFloor = useMemo(() => {
    const m = new Map<number, RoomDto[]>();
    for (const r of filtered) m.set(r.floor, [...(m.get(r.floor) ?? []), r]);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  const selected = rooms?.find((r) => r.id === selectedId) ?? null;

  const toggleStatus = (s: RoomStatus) =>
    setStatusFilter((cur) => {
      const n = new Set(cur);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  return (
    <>
      <PageHeader
        title="Room grid"
        subtitle="Live view of every room. Click a room to check guests in or out, change status or dispatch housekeeping."
        actions={
          <Segmented<Density>
            value={density}
            onChange={setDensity}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {Object.values(RoomStatus).map((s) => {
          const active = statusFilter.has(s);
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              aria-pressed={active}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                active ? 'border-transparent ring-2 ring-offset-1 ' + ROOM_STATUS_STYLE[s].chip : 'border-slate-200 bg-white text-ink-muted hover:border-slate-300',
              )}
            >
              <span className={clsx('h-2.5 w-2.5 rounded-full', ROOM_STATUS_STYLE[s].dot)} />
              {ROOM_STATUS_LABELS[s]}
              <span className="tabular-nums text-ink">{counts[s]}</span>
            </button>
          );
        })}
        {statusFilter.size > 0 && (
          <button onClick={() => setStatusFilter(new Set())} className="px-2 text-xs font-medium text-brand-700 hover:underline">
            Clear
          </button>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle">
            <IconSearch className="h-4 w-4" />
          </span>
          <input name="roomSearch" aria-label="Search rooms" className="input pl-9" placeholder="Search room, guest or room type…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select name="cleanlinessFilter" className="input sm:w-44" aria-label="Housekeeping filter" value={cleanFilter} onChange={(e) => setCleanFilter(e.target.value as Cleanliness | 'ALL')}>
          <option value="ALL">All housekeeping</option>
          {Object.values(Cleanliness).map((c) => (
            <option key={c} value={c}>
              {CLEANLINESS_LABELS[c]}
            </option>
          ))}
        </select>
        <select name="floorFilter" className="input sm:w-36" aria-label="Floor filter" value={floor} onChange={(e) => setFloor(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
          <option value="ALL">All floors</option>
          {floors.map((f) => (
            <option key={f} value={f}>
              Floor {f}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner error={error} onRetry={reload} />

      {loading && !rooms ? (
        <div className="flex justify-center py-24 text-brand-700">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          {byFloor.length === 0 && <p className="py-16 text-center text-sm text-ink-subtle">No rooms match these filters.</p>}
          {byFloor.map(([f, list]) => (
            <section key={f}>
              <div className="mb-2 flex items-baseline gap-3">
                <h2 className="font-display text-sm font-semibold">Floor {f}</h2>
                <span className="text-xs text-ink-subtle">{list.length} rooms</span>
              </div>
              <div
                className={clsx(
                  'grid gap-2.5',
                  density === 'comfortable'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8'
                    : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-12',
                )}
              >
                {list.map((r) => (
                  <RoomTile key={r.id} room={r} compact={density === 'compact'} flashing={flashing.has(r.id)} onClick={() => setSelectedId(r.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <RoomDrawer
        hotelId={hotelId}
        currency={hotel!.currency}
        room={selected}
        onClose={() => setSelectedId(null)}
        onChanged={(room) => (room ? upsert(room) : void reload())}
      />
    </>
  );
}

function RoomTile({ room, compact, flashing, onClick }: { room: RoomDto; compact: boolean; flashing: boolean; onClick: () => void }) {
  const style = ROOM_STATUS_STYLE[room.status];
  return (
    <button
      onClick={onClick}
      title={`Room ${room.number} — ${ROOM_STATUS_LABELS[room.status]}, ${CLEANLINESS_LABELS[room.cleanliness]}`}
      className={clsx(
        'group relative flex flex-col rounded-xl border-2 text-left transition hover:-translate-y-0.5 hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        style.tile,
        compact ? 'p-2' : 'min-h-[104px] p-3',
        flashing && 'animate-pulse-ring',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={clsx('font-display font-bold tabular-nums', compact ? 'text-sm' : 'text-lg', style.text)}>{room.number}</span>
        <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white', CLEANLINESS_STYLE[room.cleanliness].split(' ')[0])} title={CLEANLINESS_LABELS[room.cleanliness]} />
      </div>
      {!compact && (
        <>
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">{room.roomType.code}</span>
          <div className="mt-auto pt-2">
            {room.currentStay ? (
              <p className="flex items-center gap-1 truncate text-xs font-medium text-ink">
                <IconUser className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />
                <span className="truncate">{room.currentStay.guestName}</span>
              </p>
            ) : (
              <p className={clsx('text-xs font-medium', style.text)}>{ROOM_STATUS_LABELS[room.status]}</p>
            )}
            <div className="mt-1 flex items-center gap-1.5">
              <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-semibold', CLEANLINESS_STYLE[room.cleanliness])}>
                {CLEANLINESS_LABELS[room.cleanliness]}
              </span>
              {room.openTaskCount > 0 && (
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted ring-1 ring-slate-200">
                  {room.openTaskCount} task{room.openTaskCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </button>
  );
}
