import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Cleanliness,
  type AuthUser,
  type CreateHotelRequest,
  type HotelSummary,
  type WorkspaceOverview,
} from '@guryeeye/shared';
import { hotelToday } from '../common/hotel-context';
import { hotelSummaryInclude, reservationInclude, toHotelSummary, toReservationDto } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { emptyStatusCounts } from '../reports/reports.service';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser): Promise<HotelSummary[]> {
    const hotels = await this.prisma.hotel.findMany({
      where: user.role === 'PLATFORM_ADMIN' ? {} : { id: user.hotelId ?? '__none__' },
      include: hotelSummaryInclude,
      orderBy: { name: 'asc' },
    });
    return hotels.map(toHotelSummary);
  }

  async get(hotelId: string): Promise<HotelSummary> {
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId }, include: hotelSummaryInclude });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return toHotelSummary(hotel);
  }

  async create(body: CreateHotelRequest): Promise<HotelSummary> {
    const hotel = await this.prisma.hotel.create({
      data: { ...body, slug: body.slug.toLowerCase(), currency: body.currency.toUpperCase() },
      include: hotelSummaryInclude,
    });
    return toHotelSummary(hotel);
  }

  async overview(hotelId: string): Promise<WorkspaceOverview> {
    const hotel = await this.get(hotelId);
    const today = hotelToday(hotel);
    const startOfDay = today.date;
    const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

    const [statusGroups, cleanGroups, arrivals, departures, inHouse, openTasks, openOrders, posToday] =
      await Promise.all([
        this.prisma.room.groupBy({ by: ['status'], where: { hotelId }, _count: { _all: true } }),
        this.prisma.room.groupBy({ by: ['cleanliness'], where: { hotelId }, _count: { _all: true } }),
        this.prisma.reservation.findMany({
          where: { hotelId, status: 'CONFIRMED', checkIn: today.date },
          include: reservationInclude,
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.reservation.findMany({
          where: { hotelId, status: 'CHECKED_IN', checkOut: { lte: today.date } },
          include: reservationInclude,
          orderBy: { checkOut: 'asc' },
        }),
        this.prisma.reservation.findMany({
          where: { hotelId, status: 'CHECKED_IN' },
          select: { rateCents: true },
        }),
        this.prisma.housekeepingTask.count({ where: { hotelId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
        this.prisma.posOrder.count({ where: { hotelId, status: 'OPEN' } }),
        this.prisma.posOrder.aggregate({
          where: {
            hotelId,
            status: { in: ['PAID', 'CHARGED_TO_ROOM'] },
            closedAt: { gte: startOfDay, lt: endOfDay },
          },
          _sum: { totalCents: true },
        }),
      ]);

    const roomStatus = emptyStatusCounts();
    for (const g of statusGroups) roomStatus[g.status] = g._count._all;
    const cleanliness = Object.fromEntries(Object.values(Cleanliness).map((c) => [c, 0])) as Record<
      Cleanliness,
      number
    >;
    for (const g of cleanGroups) cleanliness[g.cleanliness] = g._count._all;

    return {
      hotel,
      today: today.iso,
      roomStatus,
      cleanliness,
      arrivals: arrivals.map(toReservationDto),
      departures: departures.map(toReservationDto),
      inHouse: inHouse.length,
      openTasks,
      openOrders,
      todayRevenueCents: (posToday._sum.totalCents ?? 0) + inHouse.reduce((s, r) => s + r.rateCents, 0),
    };
  }
}
