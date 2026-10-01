import { Controller, Get } from '@nestjs/common';
import { addDays, todayInTimezone, type PlatformOverview } from '@guryeeye/shared';
import { PlatformAdminOnly } from '../auth/auth.decorators';
import { hotelSummaryInclude, toHotelSummary } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

@PlatformAdminOnly()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  @Get('overview')
  async overview(): Promise<PlatformOverview> {
    const [hotels, rooms, users, activeReservations] = await Promise.all([
      this.prisma.hotel.findMany({ include: hotelSummaryInclude, orderBy: { name: 'asc' } }),
      this.prisma.room.count(),
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.reservation.count({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } }),
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

    return {
      hotels: hotels.length,
      rooms,
      users,
      activeReservations,
      // Summed across currencies — acceptable while all hotels share one; revisit with FX support.
      revenueLast30DaysCents: hotelStats.reduce((s, h) => s + h.revenueLast30DaysCents, 0),
      hotelStats,
    };
  }
}
