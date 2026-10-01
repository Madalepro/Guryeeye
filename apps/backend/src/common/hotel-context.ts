import { NotFoundException } from '@nestjs/common';
import type { Hotel } from '@prisma/client';
import { parseIsoDate, todayInTimezone, type IsoDate } from '@guryeeye/shared';
import type { PrismaService } from '../prisma/prisma.service';

export async function getHotelOrThrow(prisma: PrismaService, hotelId: string): Promise<Hotel> {
  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
  if (!hotel) throw new NotFoundException('Hotel not found');
  return hotel;
}

/** The hotel's current business date, as both ISO string and a UTC-midnight Date for @db.Date columns. */
export function hotelToday(hotel: Pick<Hotel, 'timezone'>, now = new Date()): { iso: IsoDate; date: Date } {
  const iso = todayInTimezone(hotel.timezone, now);
  return { iso, date: parseIsoDate(iso) };
}
