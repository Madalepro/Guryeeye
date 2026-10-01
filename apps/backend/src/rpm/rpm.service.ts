import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateMaintenanceRequest,
  MaintenanceRequestDto,
  MaintenanceStatus,
  RentalInquiryDto,
  UpdateMaintenanceRequest,
} from '@guryeeye/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const unitInclude = {
  unit: {
    select: {
      id: true,
      label: true,
      status: true,
      property: { select: { id: true, name: true } },
      leases: { where: { status: 'ACTIVE' }, take: 1, select: { tenant: { select: { name: true } } } },
    },
  },
} satisfies Prisma.MaintenanceRequestInclude;

type MaintenanceRow = Prisma.MaintenanceRequestGetPayload<{ include: typeof unitInclude }>;

function toMaintenanceDto(m: MaintenanceRow): MaintenanceRequestDto {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    priority: m.priority,
    status: m.status,
    costCents: m.costCents,
    createdAt: m.createdAt.toISOString(),
    resolvedAt: m.resolvedAt?.toISOString() ?? null,
    unit: { id: m.unit.id, label: m.unit.label, status: m.unit.status },
    property: m.unit.property,
    tenantName: m.unit.leases[0]?.tenant.name ?? null,
  };
}

const inquiryInclude = {
  unit: { select: { id: true, label: true, status: true, property: { select: { id: true, name: true } } } },
} satisfies Prisma.RentalInquiryInclude;

type InquiryRow = Prisma.RentalInquiryGetPayload<{ include: typeof inquiryInclude }>;

function toInquiryDto(i: InquiryRow): RentalInquiryDto {
  return {
    id: i.id,
    name: i.name,
    phone: i.phone,
    email: i.email,
    message: i.message,
    handled: i.handled,
    createdAt: i.createdAt.toISOString(),
    unit: { id: i.unit.id, label: i.unit.label, status: i.unit.status },
    property: i.unit.property,
  };
}

@Injectable()
export class RpmService {
  constructor(private readonly prisma: PrismaService) {}

  async maintenance(hotelId: string, status?: MaintenanceStatus): Promise<MaintenanceRequestDto[]> {
    const rows = await this.prisma.maintenanceRequest.findMany({
      where: { hotelId, status },
      include: unitInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(toMaintenanceDto);
  }

  private async dto(id: string): Promise<MaintenanceRequestDto> {
    return toMaintenanceDto(await this.prisma.maintenanceRequest.findUniqueOrThrow({ where: { id }, include: unitInclude }));
  }

  async create(hotelId: string, body: CreateMaintenanceRequest): Promise<MaintenanceRequestDto> {
    const unit = await this.prisma.rentalUnit.findFirst({ where: { id: body.unitId, property: { hotelId } } });
    if (!unit) throw new NotFoundException('Unit not found');
    if (body.blockUnit && unit.status === 'OCCUPIED') {
      throw new BadRequestException('Occupied units stay let during repairs; only vacant units can be taken off the market');
    }
    const id = await this.prisma.$transaction(async (tx) => {
      const m = await tx.maintenanceRequest.create({
        data: {
          hotelId,
          unitId: unit.id,
          title: body.title.trim(),
          description: body.description?.trim() || null,
          priority: body.priority ?? 'NORMAL',
        },
      });
      if (body.blockUnit && unit.status === 'VACANT') {
        await tx.rentalUnit.update({ where: { id: unit.id }, data: { status: 'MAINTENANCE' } });
      }
      return m.id;
    });
    return this.dto(id);
  }

  async update(hotelId: string, id: string, body: UpdateMaintenanceRequest): Promise<MaintenanceRequestDto> {
    const existing = await this.prisma.maintenanceRequest.findFirst({ where: { id, hotelId }, include: { unit: true } });
    if (!existing) throw new NotFoundException('Maintenance request not found');
    if (existing.status === 'RESOLVED' && body.status && body.status !== 'RESOLVED') {
      throw new BadRequestException('Resolved requests cannot be reopened; log a new request instead');
    }
    const resolving = body.status === 'RESOLVED' && existing.status !== 'RESOLVED';

    await this.prisma.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: body.status,
          priority: body.priority,
          costCents: body.costCents,
          resolvedAt: resolving ? new Date() : undefined,
        },
      });
      if (resolving && existing.unit.status === 'MAINTENANCE') {
        const stillOpen = await tx.maintenanceRequest.count({ where: { unitId: existing.unitId, status: { not: 'RESOLVED' } } });
        if (stillOpen === 0) await tx.rentalUnit.update({ where: { id: existing.unitId }, data: { status: 'VACANT' } });
      }
    });
    return this.dto(id);
  }

  async inquiries(hotelId: string): Promise<RentalInquiryDto[]> {
    const rows = await this.prisma.rentalInquiry.findMany({
      where: { hotelId },
      include: inquiryInclude,
      orderBy: [{ handled: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return rows.map(toInquiryDto);
  }

  async handleInquiry(hotelId: string, id: string): Promise<RentalInquiryDto> {
    const updated = await this.prisma.rentalInquiry.updateMany({ where: { id, hotelId }, data: { handled: true } });
    if (updated.count === 0) throw new NotFoundException('Enquiry not found');
    return toInquiryDto(await this.prisma.rentalInquiry.findUniqueOrThrow({ where: { id }, include: inquiryInclude }));
  }
}
