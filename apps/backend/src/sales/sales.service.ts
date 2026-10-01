import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LeadStage,
  type AuthUser,
  type CloseSaleRequest,
  type CreateSaleLeadRequest,
  type CreateSaleListingRequest,
  type ListingStatus,
  type SaleLeadDto,
  type SaleListingDto,
  type SalesOverview,
  type SaleTransactionDto,
  type UpdateSaleLeadRequest,
  type UpdateSaleListingRequest,
} from '@guryeeye/shared';
import type { Prisma } from '@prisma/client';
import { getHotelOrThrow } from '../common/hotel-context';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_COMMISSION_BPS = 300;
const OPEN_STAGES = ['NEW', 'CONTACTED', 'VIEWING', 'NEGOTIATION'] as const;

export function commissionCents(priceCents: number, bps: number): number {
  return Math.round((priceCents * bps) / 10_000);
}

const listingInclude = { _count: { select: { leads: true } } } satisfies Prisma.SaleListingInclude;
type ListingRow = Prisma.SaleListingGetPayload<{ include: typeof listingInclude }>;

function toListingDto(l: ListingRow): SaleListingDto {
  return {
    id: l.id,
    title: l.title,
    type: l.type,
    address: l.address,
    city: l.city,
    bedrooms: l.bedrooms,
    areaSqm: l.areaSqm,
    askingPriceCents: l.askingPriceCents,
    status: l.status,
    listedAt: l.listedAt.toISOString(),
    leadCount: l._count.leads,
  };
}

const leadInclude = {
  listing: { select: { id: true, title: true, askingPriceCents: true, status: true } },
  agent: { select: { id: true, name: true } },
} satisfies Prisma.SaleLeadInclude;
type LeadRow = Prisma.SaleLeadGetPayload<{ include: typeof leadInclude }>;

function toLeadDto(l: LeadRow): SaleLeadDto {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    stage: l.stage,
    offerCents: l.offerCents,
    notes: l.notes,
    listing: l.listing,
    agent: l.agent,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

const txInclude = {
  listing: { select: { id: true, title: true, city: true } },
  lead: { select: { id: true, name: true, agent: { select: { id: true, name: true } } } },
} satisfies Prisma.SaleTransactionInclude;
type TxRow = Prisma.SaleTransactionGetPayload<{ include: typeof txInclude }>;

function toTxDto(t: TxRow): SaleTransactionDto {
  return {
    id: t.id,
    priceCents: t.priceCents,
    commissionBps: t.commissionBps,
    commissionCents: t.commissionCents,
    closedAt: t.closedAt.toISOString(),
    listing: t.listing,
    buyer: { id: t.lead.id, name: t.lead.name },
    agent: t.lead.agent,
  };
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(hotelId: string): Promise<SalesOverview> {
    const hotel = await getHotelOrThrow(this.prisma, hotelId);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [listings, leads, recent, closed30] = await Promise.all([
      this.prisma.saleListing.findMany({
        where: { hotelId, status: { in: ['ACTIVE', 'UNDER_OFFER'] } },
        select: { status: true, askingPriceCents: true },
      }),
      this.prisma.saleLead.findMany({
        where: { hotelId },
        select: { stage: true, offerCents: true, listingId: true, listing: { select: { askingPriceCents: true } } },
      }),
      this.prisma.saleTransaction.findMany({ where: { hotelId }, include: txInclude, orderBy: { closedAt: 'desc' }, take: 5 }),
      this.prisma.saleTransaction.aggregate({
        where: { hotelId, closedAt: { gte: since } },
        _count: true,
        _sum: { priceCents: true, commissionCents: true },
      }),
    ]);

    const leadStages = Object.fromEntries(Object.values(LeadStage).map((s) => [s, 0])) as Record<LeadStage, number>;
    // A listing chased by several buyers is counted once, at its best open offer (or asking price).
    const pipeline = new Map<string, { asking: number; bestOffer: number | null }>();
    for (const l of leads) {
      leadStages[l.stage]++;
      if (!l.listingId || !l.listing || !(OPEN_STAGES as readonly string[]).includes(l.stage)) continue;
      const entry = pipeline.get(l.listingId) ?? { asking: l.listing.askingPriceCents, bestOffer: null };
      if (l.offerCents !== null) entry.bestOffer = Math.max(entry.bestOffer ?? 0, l.offerCents);
      pipeline.set(l.listingId, entry);
    }
    const pipelineValueCents = [...pipeline.values()].reduce((s, e) => s + (e.bestOffer ?? e.asking), 0);

    return {
      currency: hotel.currency,
      activeListings: listings.filter((l) => l.status === 'ACTIVE').length,
      underOffer: listings.filter((l) => l.status === 'UNDER_OFFER').length,
      inventoryValueCents: listings.reduce((s, l) => s + l.askingPriceCents, 0),
      pipelineValueCents,
      leadStages,
      soldLast30Days: closed30._count,
      volumeLast30DaysCents: closed30._sum.priceCents ?? 0,
      commissionLast30DaysCents: closed30._sum.commissionCents ?? 0,
      recentTransactions: recent.map(toTxDto),
    };
  }

  async listings(hotelId: string, status?: ListingStatus): Promise<SaleListingDto[]> {
    const rows = await this.prisma.saleListing.findMany({
      where: { hotelId, status },
      include: listingInclude,
      orderBy: [{ status: 'asc' }, { listedAt: 'desc' }],
    });
    return rows.map(toListingDto);
  }

  async createListing(hotelId: string, body: CreateSaleListingRequest): Promise<SaleListingDto> {
    const row = await this.prisma.saleListing.create({
      data: {
        hotelId,
        title: body.title.trim(),
        type: body.type,
        address: body.address.trim(),
        city: body.city.trim(),
        bedrooms: body.bedrooms ?? null,
        areaSqm: body.areaSqm ?? null,
        askingPriceCents: body.askingPriceCents,
      },
      include: listingInclude,
    });
    return toListingDto(row);
  }

  async updateListing(hotelId: string, listingId: string, body: UpdateSaleListingRequest): Promise<SaleListingDto> {
    const listing = await this.prisma.saleListing.findFirst({ where: { id: listingId, hotelId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status === 'SOLD') throw new BadRequestException('Sold listings cannot be changed');
    const row = await this.prisma.saleListing.update({
      where: { id: listingId },
      data: { status: body.status, askingPriceCents: body.askingPriceCents },
      include: listingInclude,
    });
    return toListingDto(row);
  }

  async leads(hotelId: string): Promise<SaleLeadDto[]> {
    const rows = await this.prisma.saleLead.findMany({ where: { hotelId }, include: leadInclude, orderBy: { updatedAt: 'desc' } });
    return rows.map(toLeadDto);
  }

  private async assertListing(hotelId: string, listingId: string | null | undefined): Promise<void> {
    if (!listingId) return;
    const listing = await this.prisma.saleListing.findFirst({ where: { id: listingId, hotelId }, select: { status: true } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status === 'SOLD' || listing.status === 'WITHDRAWN') {
      throw new BadRequestException('Leads can only be attached to listings that are on the market');
    }
  }

  async createLead(hotelId: string, body: CreateSaleLeadRequest, user: AuthUser): Promise<SaleLeadDto> {
    await this.assertListing(hotelId, body.listingId);
    const row = await this.prisma.saleLead.create({
      data: {
        hotelId,
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        listingId: body.listingId ?? null,
        notes: body.notes?.trim() || null,
        agentId: user.role === 'PLATFORM_ADMIN' ? null : user.id,
      },
      include: leadInclude,
    });
    return toLeadDto(row);
  }

  async updateLead(hotelId: string, leadId: string, body: UpdateSaleLeadRequest): Promise<SaleLeadDto> {
    const lead = await this.prisma.saleLead.findFirst({ where: { id: leadId, hotelId } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.stage === 'WON') throw new BadRequestException('This lead has already closed');
    await this.assertListing(hotelId, body.listingId);
    const row = await this.prisma.saleLead.update({
      where: { id: leadId },
      data: {
        stage: body.stage,
        offerCents: body.offerCents,
        listingId: body.listingId,
        notes: body.notes === undefined ? undefined : body.notes?.trim() || null,
      },
      include: leadInclude,
    });
    return toLeadDto(row);
  }

  async closeSale(hotelId: string, leadId: string, body: CloseSaleRequest): Promise<SaleTransactionDto> {
    const bps = body.commissionBps ?? DEFAULT_COMMISSION_BPS;
    const id = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.saleLead.findFirst({ where: { id: leadId, hotelId } });
      if (!lead) throw new NotFoundException('Lead not found');
      if (lead.stage === 'WON' || lead.stage === 'LOST') throw new BadRequestException('Only open leads can be closed');
      if (!lead.listingId) throw new BadRequestException('Attach the lead to a listing before closing the sale');

      // Conditional update so a listing can only ever be sold once.
      const sold = await tx.saleListing.updateMany({
        where: { id: lead.listingId, hotelId, status: { in: ['ACTIVE', 'UNDER_OFFER'] } },
        data: { status: 'SOLD' },
      });
      if (sold.count === 0) throw new BadRequestException('This listing is no longer on the market');

      await tx.saleLead.update({ where: { id: leadId }, data: { stage: 'WON', offerCents: body.priceCents } });
      // Other buyers chasing the same property are closed out.
      await tx.saleLead.updateMany({
        where: { listingId: lead.listingId, id: { not: leadId }, stage: { in: [...OPEN_STAGES] } },
        data: { stage: 'LOST' },
      });
      const t = await tx.saleTransaction.create({
        data: {
          hotelId,
          listingId: lead.listingId,
          leadId,
          priceCents: body.priceCents,
          commissionBps: bps,
          commissionCents: commissionCents(body.priceCents, bps),
        },
      });
      return t.id;
    });
    return toTxDto(await this.prisma.saleTransaction.findUniqueOrThrow({ where: { id }, include: txInclude }));
  }

  async transactions(hotelId: string): Promise<SaleTransactionDto[]> {
    const rows = await this.prisma.saleTransaction.findMany({ where: { hotelId }, include: txInclude, orderBy: { closedAt: 'desc' } });
    return rows.map(toTxDto);
  }
}
