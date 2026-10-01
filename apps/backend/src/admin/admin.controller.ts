import { Controller, Get } from '@nestjs/common';
import { addDays, todayInTimezone, type PlatformOverview } from '@guryeeye/shared';
import { PlatformAdminOnly } from '../auth/auth.decorators';
import { hotelSummaryInclude, toHotelSummary } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { RentalsService } from '../rentals/rentals.service';
import { ReportsService } from '../reports/reports.service';

const OPEN_LEAD_STAGES = ['NEW', 'CONTACTED', 'VIEWING', 'NEGOTIATION'] as const;

@PlatformAdminOnly()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly rentals: RentalsService,
  ) {}

  @Get('overview')
  async overview(): Promise<PlatformOverview> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const accounts = await this.prisma.hotel.findMany({ select: { id: true, timezone: true } });
    await Promise.all(accounts.map((a) => this.rentals.issueInvoices(a.id, todayInTimezone(a.timezone))));
    const [
      hotels,
      rooms,
      users,
      activeReservations,
      properties,
      unitsByAccount,
      activeLeases,
      rentByAccount,
      outstanding,
      listingsByAccount,
      openLeads,
      salesByAccount,
    ] = await Promise.all([
      this.prisma.hotel.findMany({ include: hotelSummaryInclude, orderBy: { name: 'asc' } }),
      this.prisma.room.count(),
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.reservation.count({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } }),
      this.prisma.rentalProperty.count(),
      this.prisma.rentalUnit.findMany({ select: { status: true, property: { select: { hotelId: true } } } }),
      this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
      this.prisma.rentPayment.groupBy({ by: ['hotelId'], where: { status: 'PAID', paidAt: { gte: since } }, _sum: { amountCents: true } }),
      this.prisma.rentPayment.aggregate({ where: { status: 'PENDING' }, _sum: { amountCents: true } }),
      this.prisma.saleListing.groupBy({ by: ['hotelId'], where: { status: { in: ['ACTIVE', 'UNDER_OFFER'] } }, _count: true }),
      this.prisma.saleLead.count({ where: { stage: { in: [...OPEN_LEAD_STAGES] } } }),
      this.prisma.saleTransaction.groupBy({
        by: ['hotelId'],
        where: { closedAt: { gte: since } },
        _count: true,
        _sum: { priceCents: true, commissionCents: true },
      }),
    ]);

    const hotelStats = await Promise.all(
      hotels.map(async (h) => {
        const to = todayInTimezone(h.timezone);
        const { kpis } = await this.reports.occupancyAndRevenue(h.id, addDays(to, -29), to);
        return {
          ...toHotelSummary(h),
          occupancyRate: kpis.occupancyRate,
          revenueLast30DaysCents: kpis.totalRevenueCents,
        };
      }),
    );

    const accountStats = hotelStats.map((h) => {
      const sales = salesByAccount.find((s) => s.hotelId === h.id);
      return {
        id: h.id,
        name: h.name,
        city: h.city,
        currency: h.currency,
        hotelRevenueCents: h.revenueLast30DaysCents,
        rentalUnits: unitsByAccount.filter((u) => u.property.hotelId === h.id).length,
        rentCollectedCents: rentByAccount.find((r) => r.hotelId === h.id)?._sum.amountCents ?? 0,
        activeListings: listingsByAccount.find((l) => l.hotelId === h.id)?._count ?? 0,
        salesCommissionCents: sales?._sum.commissionCents ?? 0,
      };
    });

    return {
      hotels: hotels.length,
      rooms,
      users,
      activeReservations,
      // Summed across currencies — acceptable while all hotels share one; revisit with FX support.
      revenueLast30DaysCents: hotelStats.reduce((s, h) => s + h.revenueLast30DaysCents, 0),
      hotelStats,
      rentals: {
        properties,
        units: unitsByAccount.length,
        occupiedUnits: unitsByAccount.filter((u) => u.status === 'OCCUPIED').length,
        activeLeases,
        collectedLast30DaysCents: rentByAccount.reduce((s, r) => s + (r._sum.amountCents ?? 0), 0),
        outstandingCents: outstanding._sum.amountCents ?? 0,
      },
      sales: {
        activeListings: listingsByAccount.reduce((s, l) => s + l._count, 0),
        openLeads,
        soldLast30Days: salesByAccount.reduce((s, x) => s + x._count, 0),
        volumeLast30DaysCents: salesByAccount.reduce((s, x) => s + (x._sum.priceCents ?? 0), 0),
        commissionLast30DaysCents: salesByAccount.reduce((s, x) => s + (x._sum.commissionCents ?? 0), 0),
      },
      accountStats,
    };
  }
}
