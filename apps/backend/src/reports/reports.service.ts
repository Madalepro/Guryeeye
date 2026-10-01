import { Injectable } from '@nestjs/common';
import {
  addDays,
  parseIsoDate,
  RoomStatus,
  toIsoDate,
  type IsoDate,
  type ReportSummary,
} from '@guryeeye/shared';
import { getHotelOrThrow } from '../common/hotel-context';
import { PrismaService } from '../prisma/prisma.service';
import { averageMinutes, buildOccupancySeries, computeKpis } from './report-calc';

const ON_THE_BOOKS = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] as const;
const SETTLED = ['PAID', 'CHARGED_TO_ROOM'] as const;

export function emptyStatusCounts(): Record<RoomStatus, number> {
  return Object.fromEntries(Object.values(RoomStatus).map((s) => [s, 0])) as Record<RoomStatus, number>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Occupancy series + KPIs for a hotel and date range; reused by the platform overview. */
  async occupancyAndRevenue(hotelId: string, from: IsoDate, to: IsoDate) {
    const fromDate = parseIsoDate(from);
    const toExclusive = parseIsoDate(addDays(to, 1));

    const [roomCount, reservations, orders] = await Promise.all([
      this.prisma.room.count({ where: { hotelId } }),
      this.prisma.reservation.findMany({
        where: {
          hotelId,
          status: { in: [...ON_THE_BOOKS] },
          checkIn: { lt: toExclusive },
          checkOut: { gt: fromDate },
        },
        select: { checkIn: true, checkOut: true, rateCents: true },
      }),
      this.prisma.posOrder.findMany({
        where: { hotelId, status: { in: [...SETTLED] }, closedAt: { gte: fromDate, lt: toExclusive } },
        select: { outletId: true, totalCents: true, outlet: { select: { name: true } } },
      }),
    ]);

    const series = buildOccupancySeries(
      from,
      to,
      roomCount,
      reservations.map((r) => ({
        checkIn: toIsoDate(r.checkIn),
        checkOut: toIsoDate(r.checkOut),
        rateCents: r.rateCents,
      })),
    );
    const posRevenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
    return { series, orders, kpis: computeKpis(series, posRevenueCents) };
  }

  async summary(hotelId: string, from: IsoDate, to: IsoDate): Promise<ReportSummary> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const fromDate = parseIsoDate(from);
    const toExclusive = parseIsoDate(addDays(to, 1));

    const [{ series, orders, kpis }, completedTasks, pending, statusGroups] = await Promise.all([
      this.occupancyAndRevenue(hotelId, from, to),
      this.prisma.housekeepingTask.findMany({
        where: { hotelId, completedAt: { gte: fromDate, lt: toExclusive } },
        select: { startedAt: true, completedAt: true, assigneeId: true, assignee: { select: { name: true } } },
      }),
      this.prisma.housekeepingTask.count({ where: { hotelId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      this.prisma.room.groupBy({ by: ['status'], where: { hotelId }, _count: { _all: true } }),
    ]);

    const outletMap = new Map<string, { outletId: string; outletName: string; orders: number; revenueCents: number }>();
    for (const o of orders) {
      const cur = outletMap.get(o.outletId) ?? {
        outletId: o.outletId,
        outletName: o.outlet.name,
        orders: 0,
        revenueCents: 0,
      };
      cur.orders += 1;
      cur.revenueCents += o.totalCents;
      outletMap.set(o.outletId, cur);
    }

    const byAssignee = new Map<string, { assigneeId: string | null; name: string; completed: number }>();
    for (const t of completedTasks) {
      const key = t.assigneeId ?? 'unassigned';
      const cur = byAssignee.get(key) ?? {
        assigneeId: t.assigneeId,
        name: t.assignee?.name ?? 'Unassigned',
        completed: 0,
      };
      cur.completed += 1;
      byAssignee.set(key, cur);
    }

    const roomStatus = emptyStatusCounts();
    for (const g of statusGroups) roomStatus[g.status] = g._count._all;

    return {
      range: { from, to },
      currency: hotel.currency,
      kpis,
      occupancy: series,
      outlets: [...outletMap.values()].sort((a, b) => b.revenueCents - a.revenueCents),
      housekeeping: {
        completed: completedTasks.length,
        pending,
        avgCompletionMinutes: averageMinutes(completedTasks),
        byAssignee: [...byAssignee.values()].sort((a, b) => b.completed - a.completed),
      },
      roomStatus,
    };
  }
}
