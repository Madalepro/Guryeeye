import { Prisma } from '@prisma/client';
import {
  toIsoDate,
  type HotelSummary,
  type HousekeepingTaskDto,
  type PosOrderDto,
  type ReservationDto,
  type RoomDto,
} from '@guryeeye/shared';

export const OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS'] as const;

// ---------- Hotel ----------

export const hotelSummaryInclude = {
  _count: { select: { rooms: true } },
} satisfies Prisma.HotelInclude;

export type HotelWithCount = Prisma.HotelGetPayload<{ include: typeof hotelSummaryInclude }>;

export function toHotelSummary(h: HotelWithCount): HotelSummary {
  return {
    id: h.id,
    name: h.name,
    slug: h.slug,
    city: h.city,
    country: h.country,
    currency: h.currency,
    timezone: h.timezone,
    taxRateBps: h.taxRateBps,
    roomCount: h._count.rooms,
  };
}

// ---------- Room ----------

/** Include for the room grid; `today` decides which confirmed arrival counts as the current stay. */
export function roomGridInclude(today: Date) {
  return {
    roomType: { select: { id: true, name: true, code: true } },
    reservations: {
      where: {
        OR: [
          { status: 'CHECKED_IN' as const },
          { status: 'CONFIRMED' as const, checkIn: { lte: today }, checkOut: { gt: today } },
        ],
      },
      include: { guest: { select: { firstName: true, lastName: true } } },
      // Postgres orders enums by declaration (CONFIRMED, CHECKED_IN, ...): desc puts an in-house guest first.
      orderBy: { status: 'desc' as const },
      take: 1,
    },
    _count: { select: { housekeepingTasks: { where: { status: { in: [...OPEN_TASK_STATUSES] } } } } },
  } satisfies Prisma.RoomInclude;
}

export type RoomForGrid = Prisma.RoomGetPayload<{ include: ReturnType<typeof roomGridInclude> }>;

export function toRoomDto(room: RoomForGrid): RoomDto {
  const stay = room.reservations[0];
  return {
    id: room.id,
    number: room.number,
    floor: room.floor,
    status: room.status,
    cleanliness: room.cleanliness,
    notes: room.notes,
    roomType: room.roomType,
    currentStay: stay
      ? {
          reservationId: stay.id,
          guestName: `${stay.guest.firstName} ${stay.guest.lastName}`,
          checkIn: toIsoDate(stay.checkIn),
          checkOut: toIsoDate(stay.checkOut),
          status: stay.status,
        }
      : null,
    openTaskCount: room._count.housekeepingTasks,
    updatedAt: room.updatedAt.toISOString(),
  };
}

// ---------- Reservation ----------

export const reservationInclude = {
  guest: true,
  room: { select: { id: true, number: true } },
  roomType: { select: { id: true, name: true } },
} satisfies Prisma.ReservationInclude;

export type ReservationFull = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>;

export function toReservationDto(r: ReservationFull): ReservationDto {
  return {
    id: r.id,
    status: r.status,
    checkIn: toIsoDate(r.checkIn),
    checkOut: toIsoDate(r.checkOut),
    adults: r.adults,
    rateCents: r.rateCents,
    source: r.source,
    guest: {
      id: r.guest.id,
      name: `${r.guest.firstName} ${r.guest.lastName}`,
      email: r.guest.email,
      phone: r.guest.phone,
    },
    room: r.room,
    roomType: r.roomType,
  };
}

// ---------- Housekeeping ----------

export const taskInclude = {
  room: { select: { id: true, number: true, floor: true, status: true, cleanliness: true } },
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.HousekeepingTaskInclude;

export type TaskFull = Prisma.HousekeepingTaskGetPayload<{ include: typeof taskInclude }>;

export function toTaskDto(t: TaskFull): HousekeepingTaskDto {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    priority: t.priority,
    notes: t.notes,
    dueAt: t.dueAt?.toISOString() ?? null,
    startedAt: t.startedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    room: t.room,
    assignee: t.assignee,
  };
}

// ---------- POS ----------

export const orderInclude = {
  outlet: { select: { id: true, name: true } },
  lines: true,
  reservation: { select: { room: { select: { number: true } } } },
} satisfies Prisma.PosOrderInclude;

export type OrderFull = Prisma.PosOrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderDto(o: OrderFull): PosOrderDto {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    outlet: o.outlet,
    lines: o.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      name: l.name,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      lineTotalCents: l.lineTotalCents,
    })),
    subtotalCents: o.subtotalCents,
    taxCents: o.taxCents,
    totalCents: o.totalCents,
    paymentMethod: o.paymentMethod,
    reservationId: o.reservationId,
    roomNumber: o.reservation?.room?.number ?? null,
    createdAt: o.createdAt.toISOString(),
    closedAt: o.closedAt?.toISOString() ?? null,
  };
}
