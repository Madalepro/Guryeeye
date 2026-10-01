import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  computeOrderTotals,
  type AuthUser,
  type CreatePosOrderRequest,
  type PayPosOrderRequest,
  type PosOrderDto,
  type PosOrderStatus,
  type PosOutletDto,
} from '@guryeeye/shared';
import { getHotelOrThrow } from '../common/hotel-context';
import { orderInclude, toOrderDto } from '../common/mappers';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';

const MAX_LINES = 100;

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async outlets(hotelId: string): Promise<PosOutletDto[]> {
    const outlets = await this.prisma.posOutlet.findMany({
      where: { hotelId, active: true },
      include: { items: { where: { active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
      orderBy: { name: 'asc' },
    });
    return outlets.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        priceCents: i.priceCents,
        active: i.active,
      })),
    }));
  }

  async orders(hotelId: string, q: { status?: PosOrderStatus; outletId?: string }): Promise<PosOrderDto[]> {
    const where: Prisma.PosOrderWhereInput = { hotelId, status: q.status, outletId: q.outletId };
    const orders = await this.prisma.posOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map(toOrderDto);
  }

  private async load(hotelId: string, orderId: string) {
    const order = await this.prisma.posOrder.findFirst({ where: { id: orderId, hotelId }, include: orderInclude });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private publish(hotelId: string, order: Parameters<typeof toOrderDto>[0]): PosOrderDto {
    const dto = toOrderDto(order);
    this.events.publish({ type: 'order.updated', hotelId, order: dto });
    return dto;
  }

  async createOrder(hotelId: string, body: CreatePosOrderRequest, user: AuthUser): Promise<PosOrderDto> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const outlet = await this.prisma.posOutlet.findFirst({ where: { id: body.outletId, hotelId, active: true } });
    if (!outlet) throw new BadRequestException('Unknown outlet for this hotel');

    // Merge duplicate items so each line is unique per item.
    const qty = new Map<string, number>();
    for (const l of body.lines) qty.set(l.itemId, (qty.get(l.itemId) ?? 0) + l.quantity);
    if (qty.size === 0) throw new BadRequestException('Order must contain at least one item');
    if (qty.size > MAX_LINES) throw new BadRequestException(`Order cannot exceed ${MAX_LINES} lines`);

    // Prices always come from the database, never from the client.
    const items = await this.prisma.posItem.findMany({
      where: { id: { in: [...qty.keys()] }, outletId: outlet.id, active: true },
    });
    if (items.length !== qty.size) throw new BadRequestException('One or more items are unavailable at this outlet');

    const lines = items.map((i) => {
      const quantity = qty.get(i.id) ?? 0;
      return {
        itemId: i.id,
        name: i.name,
        quantity,
        unitPriceCents: i.priceCents,
        lineTotalCents: quantity * i.priceCents,
      };
    });
    const totals = computeOrderTotals(lines, hotel.taxRateBps);

    const order = await this.prisma.posOrder.create({
      data: {
        hotelId,
        outletId: outlet.id,
        createdById: user.id,
        ...totals,
        lines: { create: lines },
      },
      include: orderInclude,
    });
    return this.publish(hotelId, order);
  }

  async pay(hotelId: string, orderId: string, body: PayPosOrderRequest): Promise<PosOrderDto> {
    const order = await this.load(hotelId, orderId);
    if (order.status !== 'OPEN') throw new BadRequestException('Order is already closed');

    const isRoomCharge = body.method === 'ROOM_CHARGE';
    let reservationId: string | null = null;
    if (isRoomCharge) {
      if (!body.reservationId) throw new BadRequestException('Select an in-house guest to charge');
      const reservation = await this.prisma.reservation.findFirst({
        where: { id: body.reservationId, hotelId, status: 'CHECKED_IN' },
        include: { room: { select: { number: true } } },
      });
      if (!reservation) throw new BadRequestException('Room charges require a checked-in reservation');
      reservationId = reservation.id;
    }

    await this.prisma.$transaction(async (tx) => {
      // Conditional update makes double-tender (two terminals paying at once) impossible.
      const res = await tx.posOrder.updateMany({
        where: { id: orderId, status: 'OPEN' },
        data: {
          status: isRoomCharge ? 'CHARGED_TO_ROOM' : 'PAID',
          paymentMethod: body.method,
          reservationId,
          closedAt: new Date(),
        },
      });
      if (res.count !== 1) throw new ConflictException('Order was closed by someone else');
      if (reservationId) {
        await tx.folioLine.create({
          data: {
            reservationId,
            description: `${order.outlet.name} — order #${order.number}`,
            amountCents: order.totalCents,
            source: 'POS',
            posOrderId: order.id,
          },
        });
      }
    });

    return this.publish(hotelId, await this.load(hotelId, orderId));
  }

  async void(hotelId: string, orderId: string): Promise<PosOrderDto> {
    const res = await this.prisma.posOrder.updateMany({
      where: { id: orderId, hotelId, status: 'OPEN' },
      data: { status: 'VOID', closedAt: new Date() },
    });
    if (res.count !== 1) {
      await this.load(hotelId, orderId); // 404 if it doesn't exist
      throw new BadRequestException('Only open orders can be voided');
    }
    return this.publish(hotelId, await this.load(hotelId, orderId));
  }
}
