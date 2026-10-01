import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { RoomDto, RoomTypeDto, UpdateRoomStatusRequest } from '@guryeeye/shared';
import { getHotelOrThrow, hotelToday } from '../common/hotel-context';
import { roomGridInclude, toRoomDto } from '../common/mappers';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async list(hotelId: string): Promise<RoomDto[]> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const rooms = await this.prisma.room.findMany({
      where: { hotelId },
      include: roomGridInclude(hotelToday(hotel).date),
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
    return rooms.map(toRoomDto);
  }

  async roomTypes(hotelId: string): Promise<RoomTypeDto[]> {
    return this.prisma.roomType.findMany({
      where: { hotelId },
      select: { id: true, name: true, code: true, baseRateCents: true, capacity: true },
      orderBy: { baseRateCents: 'asc' },
    });
  }

  async getDto(hotelId: string, roomId: string): Promise<RoomDto> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hotelId },
      include: roomGridInclude(hotelToday(hotel).date),
    });
    if (!room) throw new NotFoundException('Room not found');
    return toRoomDto(room);
  }

  /** Re-reads a room and broadcasts it to every workspace watching this hotel. */
  async broadcast(hotelId: string, roomId: string): Promise<RoomDto> {
    const room = await this.getDto(hotelId, roomId);
    this.events.publish({ type: 'room.updated', hotelId, room });
    return room;
  }

  async updateStatus(hotelId: string, roomId: string, body: UpdateRoomStatusRequest): Promise<RoomDto> {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hotelId },
      include: { reservations: { where: { status: 'CHECKED_IN' }, select: { id: true }, take: 1 } },
    });
    if (!room) throw new NotFoundException('Room not found');

    const inHouse = room.reservations.length > 0;
    if (body.status && inHouse && body.status !== 'OCCUPIED') {
      throw new BadRequestException('Room has an in-house guest; check the guest out first');
    }
    if (body.status === 'OCCUPIED' && !inHouse) {
      throw new BadRequestException('Rooms become occupied through check-in, not a manual status change');
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: {
        status: body.status,
        cleanliness: body.cleanliness,
        notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
      },
    });
    return this.broadcast(hotelId, roomId);
  }
}
