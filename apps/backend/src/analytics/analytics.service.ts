import { Injectable } from '@nestjs/common';
import { addDays, eachDay, parseIsoDate, toIsoDate, type IsoDate, type PlatformAnalytics } from '@guryeeye/shared';
import { getHotelOrThrow } from '../common/hotel-context';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

const SETTLED_POS = ['PAID', 'CHARGED_TO_ROOM'] as const;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  async summary(hotelId: string, from: IsoDate, to: IsoDate): Promise<PlatformAnalytics> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const fromDate = parseIsoDate(from);
    const toExclusive = parseIsoDate(addDays(to, 1));

    const [hotelReport, posOrders, rentPaid, sales, units, pendingRent, activeListings, openLeads] = await Promise.all([
      this.reports.occupancyAndRevenue(hotelId, from, to),
      this.prisma.posOrder.findMany({
        where: { hotelId, status: { in: [...SETTLED_POS] }, closedAt: { gte: fromDate, lt: toExclusive } },
        select: { closedAt: true, totalCents: true },
      }),
      this.prisma.rentPayment.findMany({
        where: { hotelId, status: 'PAID', paidAt: { gte: fromDate, lt: toExclusive } },
        select: { paidAt: true, amountCents: true },
      }),
      this.prisma.saleTransaction.findMany({
        where: { hotelId, closedAt: { gte: fromDate, lt: toExclusive } },
        select: { closedAt: true, priceCents: true, commissionCents: true },
      }),
      this.prisma.rentalUnit.groupBy({ by: ['status'], where: { property: { hotelId } }, _count: true }),
      this.prisma.rentPayment.aggregate({ where: { hotelId, status: 'PENDING' }, _sum: { amountCents: true } }),
      this.prisma.saleListing.count({ where: { hotelId, status: { in: ['ACTIVE', 'UNDER_OFFER'] } } }),
      this.prisma.saleLead.count({ where: { hotelId, stage: { in: ['NEW', 'CONTACTED', 'VIEWING', 'NEGOTIATION'] } } }),
    ]);

    const byDay = new Map(eachDay(from, to).map((d) => [d, { date: d, hotelCents: 0, rentalsCents: 0, salesCents: 0 }]));
    for (const p of hotelReport.series) {
      const row = byDay.get(p.date);
      if (row) row.hotelCents += p.roomRevenueCents;
    }
    for (const o of posOrders) {
      const row = o.closedAt && byDay.get(toIsoDate(o.closedAt));
      if (row) row.hotelCents += o.totalCents;
    }
    for (const r of rentPaid) {
      const row = r.paidAt && byDay.get(toIsoDate(r.paidAt));
      if (row) row.rentalsCents += r.amountCents;
    }
    for (const s of sales) {
      const row = byDay.get(toIsoDate(s.closedAt));
      if (row) row.salesCents += s.commissionCents;
    }
    const series = [...byDay.values()];

    const revenue = {
      hotel: hotelReport.kpis.totalRevenueCents,
      rentals: rentPaid.reduce((s, r) => s + r.amountCents, 0),
      sales: sales.reduce((s, t) => s + t.commissionCents, 0),
    };

    const unitCount = (status: string) => units.find((u) => u.status === status)?._count ?? 0;
    const totalUnits = units.reduce((s, u) => s + u._count, 0);
    const lettable = totalUnits - unitCount('MAINTENANCE');

    return {
      range: { from, to },
      currency: hotel.currency,
      revenue: { ...revenue, total: revenue.hotel + revenue.rentals + revenue.sales },
      series,
      hotel: {
        rooms: await this.prisma.room.count({ where: { hotelId } }),
        occupancyRate: hotelReport.kpis.occupancyRate,
        adrCents: hotelReport.kpis.adrCents,
      },
      rentals: {
        units: totalUnits,
        occupancyRate: lettable > 0 ? unitCount('OCCUPIED') / lettable : 0,
        outstandingCents: pendingRent._sum.amountCents ?? 0,
      },
      sales: {
        activeListings,
        openLeads,
        volumeCents: sales.reduce((s, t) => s + t.priceCents, 0),
      },
    };
  }
}
