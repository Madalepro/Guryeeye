import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  toIsoDate,
  type MarketplaceStats,
  type PublicAgent,
  type PublicHotel,
  type PublicInquiryRequest,
  type PublicListing,
  type PublicListingQuery,
  type PublicProject,
} from '@guryeeye/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ON_MARKET = ['ACTIVE', 'UNDER_OFFER'] as const;
const account = { select: { id: true, name: true, currency: true, verified: true } } as const;

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listings(q: PublicListingQuery): Promise<PublicListing[]> {
    const city = q.city ? { equals: q.city, mode: 'insensitive' as const } : undefined;
    const search = q.q?.trim();
    const out: PublicListing[] = [];

    if (q.kind !== 'sale') {
      const where: Prisma.RentalUnitWhereInput = {
        status: 'VACANT',
        bedrooms: q.minBedrooms ? { gte: q.minBedrooms } : undefined,
        monthlyRentCents: q.maxPriceCents ? { lte: q.maxPriceCents } : undefined,
        property: {
          city,
          type: q.type,
          OR: search ? [{ name: { contains: search, mode: 'insensitive' } }, { address: { contains: search, mode: 'insensitive' } }] : undefined,
        },
      };
      const units = await this.prisma.rentalUnit.findMany({
        where,
        include: { property: { include: { hotel: account } } },
        orderBy: { monthlyRentCents: 'asc' },
        take: 100,
      });
      for (const u of units) {
        out.push({
          id: u.id,
          kind: 'rent',
          title: `${u.property.name} · ${u.label}`,
          type: u.property.type,
          city: u.property.city,
          address: u.property.address,
          bedrooms: u.property.type === 'COMMERCIAL' || u.property.type === 'LAND' ? null : u.bedrooms,
          areaSqm: null,
          priceCents: u.monthlyRentCents,
          currency: u.property.hotel.currency,
          status: 'AVAILABLE',
          listedBy: { accountId: u.property.hotel.id, name: u.property.hotel.name },
          verified: u.property.hotel.verified,
        });
      }
    }

    if (q.kind !== 'rent') {
      const listings = await this.prisma.saleListing.findMany({
        where: {
          status: { in: [...ON_MARKET] },
          city,
          type: q.type,
          bedrooms: q.minBedrooms ? { gte: q.minBedrooms } : undefined,
          askingPriceCents: q.maxPriceCents ? { lte: q.maxPriceCents } : undefined,
          OR: search ? [{ title: { contains: search, mode: 'insensitive' } }, { address: { contains: search, mode: 'insensitive' } }] : undefined,
        },
        include: { hotel: account },
        orderBy: { listedAt: 'desc' },
        take: 100,
      });
      for (const l of listings) {
        out.push({
          id: l.id,
          kind: 'sale',
          title: l.title,
          type: l.type,
          city: l.city,
          address: l.address,
          bedrooms: l.bedrooms,
          areaSqm: l.areaSqm,
          priceCents: l.askingPriceCents,
          currency: l.hotel.currency,
          status: l.status === 'UNDER_OFFER' ? 'UNDER_OFFER' : 'AVAILABLE',
          listedBy: { accountId: l.hotel.id, name: l.hotel.name },
          verified: l.hotel.verified,
        });
      }
    }
    return out;
  }

  /** Public enquiries land in the owning account's workspace: rentals as enquiries, sales as new pipeline leads. */
  async inquire(body: PublicInquiryRequest): Promise<{ ok: true }> {
    const contact = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || null,
    };
    if (body.kind === 'rent') {
      const unit = await this.prisma.rentalUnit.findUnique({ where: { id: body.listingId }, include: { property: { select: { hotelId: true } } } });
      if (!unit) throw new NotFoundException('Listing not found');
      if (unit.status !== 'VACANT') throw new BadRequestException('This home has just been let');
      await this.prisma.rentalInquiry.create({
        data: { ...contact, hotelId: unit.property.hotelId, unitId: unit.id, message: body.message?.trim() || null },
      });
    } else {
      const listing = await this.prisma.saleListing.findUnique({ where: { id: body.listingId } });
      if (!listing) throw new NotFoundException('Listing not found');
      if (!(ON_MARKET as readonly string[]).includes(listing.status)) throw new BadRequestException('This property is no longer on the market');
      await this.prisma.saleLead.create({
        data: { ...contact, hotelId: listing.hotelId, listingId: listing.id, notes: body.message?.trim() ? `Website enquiry: ${body.message.trim()}` : 'Website enquiry' },
      });
    }
    return { ok: true };
  }

  async hotels(): Promise<PublicHotel[]> {
    const rows = await this.prisma.hotel.findMany({
      where: { rooms: { some: {} } },
      orderBy: { name: 'asc' },
      include: {
        roomTypes: { orderBy: { baseRateCents: 'asc' }, select: { name: true, baseRateCents: true, capacity: true } },
        _count: { select: { rooms: true } },
      },
    });
    const available = await this.prisma.room.groupBy({ by: ['hotelId'], where: { status: 'AVAILABLE' }, _count: true });
    return rows.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      currency: h.currency,
      rooms: h._count.rooms,
      availableTonight: available.find((a) => a.hotelId === h.id)?._count ?? 0,
      fromRateCents: h.roomTypes[0]?.baseRateCents ?? null,
      roomTypes: h.roomTypes,
    }));
  }

  async agents(): Promise<PublicAgent[]> {
    const users = await this.prisma.user.findMany({
      where: { active: true, role: { in: ['SALES_AGENT', 'PROPERTY_MANAGER'] }, hotelId: { not: null } },
      select: { id: true, name: true, role: true, hotel: { select: { id: true, name: true, city: true } } },
      orderBy: { name: 'asc' },
    });
    const [listings, units, sold] = await Promise.all([
      this.prisma.saleListing.groupBy({ by: ['hotelId'], where: { status: { in: [...ON_MARKET] } }, _count: true }),
      this.prisma.rentalUnit.findMany({ select: { property: { select: { hotelId: true } } } }),
      this.prisma.saleTransaction.findMany({ select: { lead: { select: { agentId: true } } } }),
    ]);
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role as PublicAgent['role'],
      agency: u.hotel!,
      activeListings: u.role === 'SALES_AGENT' ? (listings.find((l) => l.hotelId === u.hotel!.id)?._count ?? 0) : 0,
      propertiesSold: sold.filter((t) => t.lead.agentId === u.id).length,
      managedUnits: u.role === 'PROPERTY_MANAGER' ? units.filter((x) => x.property.hotelId === u.hotel!.id).length : 0,
    }));
  }

  async projects(): Promise<PublicProject[]> {
    const rows = await this.prisma.project.findMany({
      include: { hotel: { select: { name: true, currency: true } } },
      orderBy: [{ status: 'asc' }, { expectedCompletion: 'asc' }],
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      description: p.description,
      status: p.status,
      totalUnits: p.totalUnits,
      unitsAvailable: p.unitsAvailable,
      priceFromCents: p.priceFromCents,
      currency: p.hotel.currency,
      expectedCompletion: p.expectedCompletion ? toIsoDate(p.expectedCompletion) : null,
      developer: p.hotel.name,
    }));
  }

  async stats(): Promise<MarketplaceStats> {
    const [forRent, forSale, hotels, agents, rentCities, saleCities] = await Promise.all([
      this.prisma.rentalUnit.count({ where: { status: 'VACANT' } }),
      this.prisma.saleListing.count({ where: { status: { in: [...ON_MARKET] } } }),
      this.prisma.hotel.count({ where: { rooms: { some: {} } } }),
      this.prisma.user.count({ where: { active: true, role: { in: ['SALES_AGENT', 'PROPERTY_MANAGER'] } } }),
      this.prisma.rentalProperty.findMany({ distinct: ['city'], select: { city: true } }),
      this.prisma.saleListing.findMany({ distinct: ['city'], select: { city: true } }),
    ]);
    const cities = [...new Set([...rentCities, ...saleCities].map((c) => c.city))].sort();
    return { forRent, forSale, hotels, agents, cities };
  }
}
