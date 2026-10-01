import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  addDays,
  parseIsoDate,
  toIsoDate,
  UnitStatus,
  type CreateLeaseRequest,
  type CreateRentalPropertyRequest,
  type IsoDate,
  type LeaseDto,
  type LeaseStatus,
  type PayRentRequest,
  type RentalPropertyDto,
  type RentalsOverview,
  type RentPaymentDto,
  type RentPaymentStatus,
  type TenantDto,
} from '@guryeeye/shared';
import type { Prisma } from '@prisma/client';
import { getHotelOrThrow, hotelToday } from '../common/hotel-context';
import { PrismaService } from '../prisma/prisma.service';

/** Rent is invoiced on the 1st and falls due on the 5th of each month. */
const DUE_DAY_OFFSET = 4;

export function monthStart(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function nextMonth(period: IsoDate): IsoDate {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Billing periods (month starts) a lease owes for, from its first month through `through`. */
export function billingPeriods(startDate: IsoDate, endDate: IsoDate, through: IsoDate): IsoDate[] {
  const last = monthStart(endDate < through ? endDate : through);
  const out: IsoDate[] = [];
  for (let p = monthStart(startDate); p <= last; p = nextMonth(p)) out.push(p);
  return out;
}

export function emptyUnitCounts(): Record<UnitStatus, number> {
  return Object.fromEntries(Object.values(UnitStatus).map((s) => [s, 0])) as Record<UnitStatus, number>;
}

const leaseInclude = {
  tenant: { select: { id: true, name: true, phone: true } },
  unit: { select: { id: true, label: true, property: { select: { id: true, name: true } } } },
  payments: { where: { status: 'PENDING' }, select: { amountCents: true } },
} satisfies Prisma.LeaseInclude;

type LeaseRow = Prisma.LeaseGetPayload<{ include: typeof leaseInclude }>;

function toLeaseDto(l: LeaseRow): LeaseDto {
  return {
    id: l.id,
    status: l.status,
    startDate: toIsoDate(l.startDate),
    endDate: toIsoDate(l.endDate),
    monthlyRentCents: l.monthlyRentCents,
    depositCents: l.depositCents,
    tenant: l.tenant,
    unit: { id: l.unit.id, label: l.unit.label },
    property: l.unit.property,
    balanceDueCents: l.payments.reduce((s, p) => s + p.amountCents, 0),
  };
}

const paymentInclude = {
  lease: {
    select: {
      tenant: { select: { name: true } },
      unit: { select: { label: true, property: { select: { name: true } } } },
    },
  },
} satisfies Prisma.RentPaymentInclude;

type PaymentRow = Prisma.RentPaymentGetPayload<{ include: typeof paymentInclude }>;

function toPaymentDto(p: PaymentRow, today: IsoDate): RentPaymentDto {
  const dueDate = toIsoDate(p.dueDate);
  return {
    id: p.id,
    leaseId: p.leaseId,
    period: toIsoDate(p.period),
    dueDate,
    amountCents: p.amountCents,
    status: p.status,
    overdue: p.status === 'PENDING' && dueDate < today,
    method: p.method,
    paidAt: p.paidAt?.toISOString() ?? null,
    tenantName: p.lease.tenant.name,
    unitLabel: p.lease.unit.label,
    propertyName: p.lease.unit.property.name,
  };
}

@Injectable()
export class RentalsService {
  constructor(private readonly prisma: PrismaService) {}

  private async today(hotelId: string): Promise<IsoDate> {
    return hotelToday(await getHotelOrThrow(this.prisma, hotelId)).iso;
  }

  /** Issues any monthly rent invoices that active leases are owed up to the current month. */
  async issueInvoices(hotelId: string, today: IsoDate): Promise<void> {
    const leases = await this.prisma.lease.findMany({
      where: { hotelId, status: 'ACTIVE' },
      select: { id: true, startDate: true, endDate: true, monthlyRentCents: true },
    });
    const data = leases.flatMap((l) =>
      billingPeriods(toIsoDate(l.startDate), toIsoDate(l.endDate), today).map((period) => ({
        hotelId,
        leaseId: l.id,
        period: parseIsoDate(period),
        dueDate: parseIsoDate(addDays(period, DUE_DAY_OFFSET)),
        amountCents: l.monthlyRentCents,
      })),
    );
    if (data.length) await this.prisma.rentPayment.createMany({ data, skipDuplicates: true });
  }

  async overview(hotelId: string): Promise<RentalsOverview> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const today = hotelToday(hotel).iso;
    await this.issueInvoices(hotelId, today);

    const period = parseIsoDate(monthStart(today));
    const [properties, units, activeLeases, collected, pending, expiring] = await Promise.all([
      this.prisma.rentalProperty.count({ where: { hotelId } }),
      this.prisma.rentalUnit.groupBy({ by: ['status'], where: { property: { hotelId } }, _count: true }),
      this.prisma.lease.aggregate({ where: { hotelId, status: 'ACTIVE' }, _sum: { monthlyRentCents: true } }),
      this.prisma.rentPayment.aggregate({ where: { hotelId, status: 'PAID', paidAt: { gte: period } }, _sum: { amountCents: true } }),
      this.prisma.rentPayment.findMany({ where: { hotelId, status: 'PENDING' }, select: { amountCents: true, dueDate: true } }),
      this.prisma.lease.findMany({
        where: { hotelId, status: 'ACTIVE', endDate: { lte: parseIsoDate(addDays(today, 60)) } },
        include: leaseInclude,
        orderBy: { endDate: 'asc' },
      }),
    ]);

    const unitStatus = emptyUnitCounts();
    for (const u of units) unitStatus[u.status] = u._count;
    const totalUnits = Object.values(unitStatus).reduce((s, n) => s + n, 0);
    const lettable = totalUnits - unitStatus.MAINTENANCE;

    return {
      currency: hotel.currency,
      today,
      properties,
      units: totalUnits,
      unitStatus,
      occupancyRate: lettable > 0 ? unitStatus.OCCUPIED / lettable : 0,
      monthlyRentRollCents: activeLeases._sum.monthlyRentCents ?? 0,
      collectedThisMonthCents: collected._sum.amountCents ?? 0,
      outstandingCents: pending.reduce((s, p) => s + p.amountCents, 0),
      overdueCount: pending.filter((p) => toIsoDate(p.dueDate) < today).length,
      expiringSoon: expiring.map(toLeaseDto),
    };
  }

  async properties(hotelId: string): Promise<RentalPropertyDto[]> {
    const rows = await this.prisma.rentalProperty.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
      include: {
        units: {
          orderBy: { label: 'asc' },
          include: {
            leases: {
              where: { status: 'ACTIVE' },
              take: 1,
              select: { id: true, endDate: true, tenant: { select: { name: true } } },
            },
          },
        },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      address: p.address,
      city: p.city,
      units: p.units.map((u) => {
        const lease = u.leases[0];
        return {
          id: u.id,
          label: u.label,
          bedrooms: u.bedrooms,
          monthlyRentCents: u.monthlyRentCents,
          status: u.status,
          tenant: lease ? { leaseId: lease.id, name: lease.tenant.name, endDate: toIsoDate(lease.endDate) } : null,
        };
      }),
    }));
  }

  async createProperty(hotelId: string, body: CreateRentalPropertyRequest): Promise<RentalPropertyDto> {
    const labels = body.units.map((u) => u.label.trim());
    if (new Set(labels).size !== labels.length) throw new BadRequestException('Unit labels must be unique');
    const created = await this.prisma.rentalProperty.create({
      data: {
        hotelId,
        name: body.name.trim(),
        type: body.type,
        address: body.address.trim(),
        city: body.city.trim(),
        units: { create: body.units.map((u) => ({ ...u, label: u.label.trim() })) },
      },
    });
    return (await this.properties(hotelId)).find((p) => p.id === created.id)!;
  }

  async tenants(hotelId: string): Promise<TenantDto[]> {
    const rows = await this.prisma.tenant.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { leases: { where: { status: 'ACTIVE' } } } } },
    });
    return rows.map((t) => ({ id: t.id, name: t.name, phone: t.phone, email: t.email, activeLeases: t._count.leases }));
  }

  async leases(hotelId: string, status?: LeaseStatus): Promise<LeaseDto[]> {
    await this.issueInvoices(hotelId, await this.today(hotelId));
    const rows = await this.prisma.lease.findMany({
      where: { hotelId, status },
      include: leaseInclude,
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
    });
    return rows.map(toLeaseDto);
  }

  private async leaseDto(id: string): Promise<LeaseDto> {
    return toLeaseDto(await this.prisma.lease.findUniqueOrThrow({ where: { id }, include: leaseInclude }));
  }

  async createLease(hotelId: string, body: CreateLeaseRequest): Promise<LeaseDto> {
    if (body.endDate <= body.startDate) throw new BadRequestException('Lease must end after it starts');
    const today = await this.today(hotelId);

    const id = await this.prisma.$transaction(async (tx) => {
      const unit = await tx.rentalUnit.findFirst({ where: { id: body.unitId, property: { hotelId } } });
      if (!unit) throw new NotFoundException('Unit not found');
      if (unit.status !== 'VACANT') throw new BadRequestException(`Unit ${unit.label} is not vacant`);

      // Conditional update so two concurrent lease signings cannot both claim the unit.
      const claimed = await tx.rentalUnit.updateMany({ where: { id: unit.id, status: 'VACANT' }, data: { status: 'OCCUPIED' } });
      if (claimed.count === 0) throw new BadRequestException(`Unit ${unit.label} was just let to someone else`);

      const tenant = await tx.tenant.create({
        data: {
          hotelId,
          name: body.tenant.name.trim(),
          phone: body.tenant.phone?.trim() || null,
          email: body.tenant.email?.trim() || null,
        },
      });
      const lease = await tx.lease.create({
        data: {
          hotelId,
          unitId: unit.id,
          tenantId: tenant.id,
          startDate: parseIsoDate(body.startDate),
          endDate: parseIsoDate(body.endDate),
          monthlyRentCents: body.monthlyRentCents ?? unit.monthlyRentCents,
          depositCents: body.depositCents ?? 0,
        },
      });
      return lease.id;
    });

    await this.issueInvoices(hotelId, today);
    return this.leaseDto(id);
  }

  async endLease(hotelId: string, leaseId: string): Promise<LeaseDto> {
    await this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.findFirst({ where: { id: leaseId, hotelId } });
      if (!lease) throw new NotFoundException('Lease not found');
      if (lease.status !== 'ACTIVE') throw new BadRequestException('Lease has already ended');
      await tx.lease.update({ where: { id: leaseId }, data: { status: 'ENDED', endedAt: new Date() } });
      await tx.rentalUnit.update({ where: { id: lease.unitId }, data: { status: 'VACANT' } });
    });
    return this.leaseDto(leaseId);
  }

  async payments(hotelId: string, status?: RentPaymentStatus): Promise<RentPaymentDto[]> {
    const today = await this.today(hotelId);
    await this.issueInvoices(hotelId, today);
    const rows = await this.prisma.rentPayment.findMany({
      where: { hotelId, status },
      include: paymentInclude,
      orderBy: status === 'PAID' ? { paidAt: 'desc' } : [{ dueDate: 'asc' }],
      take: 200,
    });
    return rows.map((p) => toPaymentDto(p, today));
  }

  async pay(hotelId: string, paymentId: string, body: PayRentRequest): Promise<RentPaymentDto> {
    const updated = await this.prisma.rentPayment.updateMany({
      where: { id: paymentId, hotelId, status: 'PENDING' },
      data: { status: 'PAID', method: body.method, paidAt: new Date() },
    });
    if (updated.count === 0) {
      const exists = await this.prisma.rentPayment.count({ where: { id: paymentId, hotelId } });
      throw exists ? new BadRequestException('This invoice is already paid') : new NotFoundException('Invoice not found');
    }
    const row = await this.prisma.rentPayment.findUniqueOrThrow({ where: { id: paymentId }, include: paymentInclude });
    return toPaymentDto(row, await this.today(hotelId));
  }
}
