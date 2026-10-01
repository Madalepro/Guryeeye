import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  nightsBetween,
  parseIsoDate,
  type CreateReservationRequest,
  type FolioDto,
  type IsoDate,
  type ReservationDto,
  type ReservationStatus,
} from '@guryeeye/shared';
import { getHotelOrThrow, hotelToday } from '../common/hotel-context';
import { reservationInclude, taskInclude, toReservationDto, toTaskDto } from '../common/mappers';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';

const ACTIVE_STATUSES: ReservationStatus[] = ['CONFIRMED', 'CHECKED_IN'];
const UNSELLABLE_ROOM = ['OUT_OF_ORDER', 'MAINTENANCE'] as const;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomsService,
    private readonly events: EventsService,
  ) {}

  async list(
    hotelId: string,
    q: { from?: IsoDate; to?: IsoDate; status?: ReservationStatus },
  ): Promise<ReservationDto[]> {
    const where: Prisma.ReservationWhereInput = { hotelId, status: q.status };
    // Overlap: stay intersects [from, to].
    if (q.to) where.checkIn = { lte: parseIsoDate(q.to) };
    if (q.from) where.checkOut = { gt: parseIsoDate(q.from) };
    const rows = await this.prisma.reservation.findMany({
      where,
      include: reservationInclude,
      orderBy: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    });
    return rows.map(toReservationDto);
  }

  private async findOrThrow(hotelId: string, id: string) {
    const r = await this.prisma.reservation.findFirst({ where: { id, hotelId }, include: reservationInclude });
    if (!r) throw new NotFoundException('Reservation not found');
    return r;
  }

  private async publish(hotelId: string, id: string): Promise<ReservationDto> {
    const dto = toReservationDto(await this.findOrThrow(hotelId, id));
    this.events.publish({ type: 'reservation.updated', hotelId, reservation: dto });
    return dto;
  }

  /** Throws if the room already has an active stay overlapping the given dates. */
  private async assertRoomFree(
    tx: Prisma.TransactionClient,
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeId?: string,
  ): Promise<void> {
    const clash = await tx.reservation.findFirst({
      where: {
        roomId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: ACTIVE_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException('Room is already booked for these dates');
  }

  async create(hotelId: string, body: CreateReservationRequest): Promise<ReservationDto> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    if (body.checkOut <= body.checkIn) throw new BadRequestException('checkOut must be after checkIn');
    if (body.checkIn < hotelToday(hotel).iso) throw new BadRequestException('checkIn cannot be in the past');

    const roomType = await this.prisma.roomType.findFirst({ where: { id: body.roomTypeId, hotelId } });
    if (!roomType) throw new BadRequestException('Unknown room type for this hotel');
    if (body.adults > roomType.capacity) {
      throw new BadRequestException(`${roomType.name} sleeps at most ${roomType.capacity}`);
    }

    const checkIn = parseIsoDate(body.checkIn);
    const checkOut = parseIsoDate(body.checkOut);

    const created = await this.prisma.$transaction(async (tx) => {
      if (body.roomId) {
        const room = await tx.room.findFirst({ where: { id: body.roomId, hotelId } });
        if (!room) throw new BadRequestException('Unknown room for this hotel');
        if (room.roomTypeId !== roomType.id) throw new BadRequestException('Room does not match room type');
        await this.assertRoomFree(tx, room.id, checkIn, checkOut);
      }
      const guest = await tx.guest.create({
        data: {
          hotelId,
          firstName: body.guest.firstName.trim(),
          lastName: body.guest.lastName.trim(),
          email: body.guest.email?.toLowerCase().trim() || null,
          phone: body.guest.phone?.trim() || null,
        },
      });
      return tx.reservation.create({
        data: {
          hotelId,
          guestId: guest.id,
          roomTypeId: roomType.id,
          roomId: body.roomId ?? null,
          checkIn,
          checkOut,
          adults: body.adults,
          rateCents: body.rateCents ?? roomType.baseRateCents,
          source: body.source?.trim() || 'DIRECT',
        },
      });
    });

    if (created.roomId && body.checkIn === hotelToday(hotel).iso) {
      await this.prisma.room.updateMany({
        where: { id: created.roomId, status: 'AVAILABLE' },
        data: { status: 'RESERVED' },
      });
    }
    if (created.roomId) await this.rooms.broadcast(hotelId, created.roomId);
    return this.publish(hotelId, created.id);
  }

  async checkIn(hotelId: string, id: string, roomIdOverride?: string): Promise<ReservationDto> {
    const reservation = await this.findOrThrow(hotelId, id);
    if (reservation.status !== 'CONFIRMED') {
      throw new BadRequestException(`Cannot check in a ${reservation.status.toLowerCase()} reservation`);
    }
    const roomId = roomIdOverride ?? reservation.roomId;
    if (!roomId) throw new BadRequestException('Assign a room before checking in');

    const previousRoomId = reservation.roomId;

    await this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findFirst({ where: { id: roomId, hotelId } });
      if (!room) throw new BadRequestException('Unknown room for this hotel');
      if (room.roomTypeId !== reservation.roomTypeId) {
        throw new BadRequestException('Room does not match the reserved room type');
      }
      if ((UNSELLABLE_ROOM as readonly string[]).includes(room.status)) {
        throw new BadRequestException(`Room ${room.number} is ${room.status.toLowerCase().replace(/_/g, ' ')}`);
      }
      const occupied = await tx.reservation.findFirst({
        where: { roomId, status: 'CHECKED_IN', id: { not: id } },
        select: { id: true },
      });
      if (occupied) throw new ConflictException(`Room ${room.number} is occupied`);
      await this.assertRoomFree(tx, roomId, reservation.checkIn, reservation.checkOut, id);

      // Conditional update guards against two desks checking in the same booking concurrently.
      const updated = await tx.reservation.updateMany({
        where: { id, status: 'CONFIRMED' },
        data: { status: 'CHECKED_IN', roomId, checkedInAt: new Date() },
      });
      if (updated.count !== 1) throw new ConflictException('Reservation was modified by someone else');
      await tx.room.update({ where: { id: roomId }, data: { status: 'OCCUPIED' } });

      if (previousRoomId && previousRoomId !== roomId) {
        await tx.room.updateMany({
          where: { id: previousRoomId, status: 'RESERVED' },
          data: { status: 'AVAILABLE' },
        });
      }
    });

    await this.rooms.broadcast(hotelId, roomId);
    if (previousRoomId && previousRoomId !== roomId) await this.rooms.broadcast(hotelId, previousRoomId);
    return this.publish(hotelId, id);
  }

  async checkOut(hotelId: string, id: string): Promise<ReservationDto> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const reservation = await this.findOrThrow(hotelId, id);
    if (reservation.status !== 'CHECKED_IN' || !reservation.roomId) {
      throw new BadRequestException('Only in-house reservations can be checked out');
    }
    const roomId = reservation.roomId;

    // Bill nights actually stayed (at least one), capped at the booked length.
    const today = hotelToday(hotel).iso;
    const checkInIso = reservation.checkIn.toISOString().slice(0, 10);
    const booked = nightsBetween(checkInIso, reservation.checkOut.toISOString().slice(0, 10));
    const nights = Math.max(1, Math.min(booked, nightsBetween(checkInIso, today)));

    const task = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.updateMany({
        where: { id, status: 'CHECKED_IN' },
        data: { status: 'CHECKED_OUT', checkedOutAt: new Date() },
      });
      if (updated.count !== 1) throw new ConflictException('Reservation was modified by someone else');

      await tx.folioLine.create({
        data: {
          reservationId: id,
          description: `Room ${reservation.room?.number ?? ''} — ${nights} night${nights === 1 ? '' : 's'}`,
          amountCents: nights * reservation.rateCents,
          source: 'ROOM',
        },
      });
      await tx.room.update({ where: { id: roomId }, data: { status: 'AVAILABLE', cleanliness: 'DIRTY' } });
      return tx.housekeepingTask.create({
        data: { hotelId, roomId, type: 'CHECKOUT_CLEAN', priority: 'HIGH', notes: 'Auto-created on check-out' },
        include: taskInclude,
      });
    });

    this.events.publish({ type: 'task.updated', hotelId, task: toTaskDto(task) });
    await this.rooms.broadcast(hotelId, roomId);
    return this.publish(hotelId, id);
  }

  async cancel(hotelId: string, id: string): Promise<ReservationDto> {
    const reservation = await this.findOrThrow(hotelId, id);
    if (reservation.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed reservations can be cancelled');
    }
    await this.prisma.reservation.update({ where: { id }, data: { status: 'CANCELLED' } });
    if (reservation.roomId) {
      await this.prisma.room.updateMany({
        where: { id: reservation.roomId, status: 'RESERVED' },
        data: { status: 'AVAILABLE' },
      });
      await this.rooms.broadcast(hotelId, reservation.roomId);
    }
    return this.publish(hotelId, id);
  }

  async folio(hotelId: string, id: string): Promise<FolioDto> {
    const reservation = await this.findOrThrow(hotelId, id);
    const lines = await this.prisma.folioLine.findMany({
      where: { reservationId: id },
      orderBy: { postedAt: 'asc' },
    });
    const dtoLines = lines.map((l) => ({
      id: l.id,
      description: l.description,
      amountCents: l.amountCents,
      source: l.source,
      postedAt: l.postedAt.toISOString(),
    }));

    if (reservation.status === 'CHECKED_IN') {
      const hotel = await getHotelOrThrow(this.prisma, hotelId);
      const checkInIso = reservation.checkIn.toISOString().slice(0, 10);
      const nights = Math.max(1, nightsBetween(checkInIso, hotelToday(hotel).iso));
      dtoLines.unshift({
        id: 'accrued-room-charges',
        description: `Room charges accrued — ${nights} night${nights === 1 ? '' : 's'} (posted at check-out)`,
        amountCents: nights * reservation.rateCents,
        source: 'ROOM',
        postedAt: new Date().toISOString(),
      });
    }

    return {
      reservationId: id,
      lines: dtoLines,
      totalCents: dtoLines.reduce((sum, l) => sum + l.amountCents, 0),
    };
  }
}
