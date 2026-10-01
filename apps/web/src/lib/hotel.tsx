'use client';

import type { HotelEvent, HotelSummary } from '@guryeeye/shared';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from './api';

export type LiveStatus = 'connecting' | 'live' | 'offline';

type Listener = (event: HotelEvent) => void;

interface HotelState {
  hotels: HotelSummary[];
  hotel: HotelSummary | null;
  selectHotel: (id: string) => void;
  live: LiveStatus;
  subscribe: (listener: Listener) => () => void;
}

const HotelContext = createContext<HotelState | null>(null);
const SELECTED_KEY = 'guryeeye.hotel';

/** `realtime` opens the hotel event stream; roles without hotel access (rentals, sales) skip it. */
export function HotelProvider({ children, realtime = true }: { children: ReactNode; realtime?: boolean }) {
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [live, setLive] = useState<LiveStatus>('connecting');
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    api.hotels.list().then((list) => {
      setHotels(list);
      const stored = window.localStorage.getItem(SELECTED_KEY);
      setSelectedId(list.find((h) => h.id === stored)?.id ?? list[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!selectedId || !realtime) return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      setLive('connecting');
      source = new EventSource(api.eventsUrl(selectedId));
      source.onopen = () => {
        attempt = 0;
        setLive('live');
      };
      source.onmessage = (msg) => {
        if (!msg.data) return;
        try {
          const event = JSON.parse(msg.data as string) as HotelEvent;
          listeners.current.forEach((l) => l(event));
        } catch {
          // ignore malformed frames
        }
      };
      source.onerror = () => {
        source?.close();
        if (disposed) return;
        setLive('offline');
        // Exponential backoff capped at 30s.
        retry = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** attempt++));
      };
    };
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      source?.close();
    };
  }, [selectedId, realtime]);

  const value = useMemo<HotelState>(
    () => ({
      hotels,
      hotel: hotels.find((h) => h.id === selectedId) ?? null,
      selectHotel: (id) => {
        window.localStorage.setItem(SELECTED_KEY, id);
        setSelectedId(id);
      },
      live,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [hotels, selectedId, live],
  );

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotel(): HotelState {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error('useHotel must be used inside <HotelProvider>');
  return ctx;
}

/** Subscribe to real-time hotel events for the lifetime of the component. */
export function useHotelEvents(handler: Listener): void {
  const { subscribe } = useHotel();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
