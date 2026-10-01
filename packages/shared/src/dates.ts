import type { IsoDate } from './contracts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && toIsoDate(d) === value;
}

/** Formats a Date as YYYY-MM-DD using its UTC calendar day. */
export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value: IsoDate): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/** Inclusive list of dates from `from` to `to`. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return Math.round((parseIsoDate(checkOut).getTime() - parseIsoDate(checkIn).getTime()) / 86_400_000);
}

/** Current calendar date in a given IANA timezone. */
export function todayInTimezone(timezone: string, now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
