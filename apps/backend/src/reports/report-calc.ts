import { eachDay, type DailyOccupancyPoint, type IsoDate } from '@guryeeye/shared';

export interface StayInput {
  checkIn: IsoDate;
  /** Departure date — the guest does not occupy the room that night. */
  checkOut: IsoDate;
  rateCents: number;
}

/** Nightly occupancy for each date in [from, to]. A stay occupies nights checkIn..checkOut-1. */
export function buildOccupancySeries(
  from: IsoDate,
  to: IsoDate,
  roomCount: number,
  stays: StayInput[],
): DailyOccupancyPoint[] {
  return eachDay(from, to).map((date) => {
    let occupiedRooms = 0;
    let roomRevenueCents = 0;
    for (const s of stays) {
      if (s.checkIn <= date && date < s.checkOut) {
        occupiedRooms += 1;
        roomRevenueCents += s.rateCents;
      }
    }
    return {
      date,
      occupiedRooms,
      availableRooms: roomCount,
      occupancyRate: roomCount > 0 ? occupiedRooms / roomCount : 0,
      roomRevenueCents,
    };
  });
}

export interface Kpis {
  occupancyRate: number;
  adrCents: number;
  revparCents: number;
  roomRevenueCents: number;
  posRevenueCents: number;
  totalRevenueCents: number;
  roomNightsSold: number;
}

/**
 * Standard hotel KPIs:
 *  - Occupancy = room nights sold / room nights available
 *  - ADR       = room revenue / room nights sold
 *  - RevPAR    = room revenue / room nights available
 */
export function computeKpis(series: DailyOccupancyPoint[], posRevenueCents: number): Kpis {
  const roomNightsSold = series.reduce((s, d) => s + d.occupiedRooms, 0);
  const roomNightsAvailable = series.reduce((s, d) => s + d.availableRooms, 0);
  const roomRevenueCents = series.reduce((s, d) => s + d.roomRevenueCents, 0);
  return {
    occupancyRate: roomNightsAvailable > 0 ? roomNightsSold / roomNightsAvailable : 0,
    adrCents: roomNightsSold > 0 ? Math.round(roomRevenueCents / roomNightsSold) : 0,
    revparCents: roomNightsAvailable > 0 ? Math.round(roomRevenueCents / roomNightsAvailable) : 0,
    roomRevenueCents,
    posRevenueCents,
    totalRevenueCents: roomRevenueCents + posRevenueCents,
    roomNightsSold,
  };
}

export function averageMinutes(durations: { startedAt: Date | null; completedAt: Date | null }[]): number | null {
  const mins = durations
    .filter((d): d is { startedAt: Date; completedAt: Date } => !!d.startedAt && !!d.completedAt)
    .map((d) => (d.completedAt.getTime() - d.startedAt.getTime()) / 60_000)
    .filter((m) => m >= 0);
  if (mins.length === 0) return null;
  return Math.round(mins.reduce((a, b) => a + b, 0) / mins.length);
}
