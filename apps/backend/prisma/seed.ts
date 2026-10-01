/* eslint-disable no-console */
import { PrismaClient, type PosOutletType, type PropertyType, type RoomStatus, type Cleanliness } from '@prisma/client';
import { addDays, computeOrderTotals, parseIsoDate, todayInTimezone } from '@guryeeye/shared';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD ?? 'Guryeeye#2026';

// Deterministic PRNG so every seed produces the same demo data.
let state = 20260101;
const rand = () => ((state = (state * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const FIRST = ['Amina', 'Hodan', 'Faisal', 'Liban', 'Sahra', 'Omar', 'Nimco', 'Yusuf', 'Ifrah', 'Ahmed', 'Sara', 'David', 'Leila', 'Mark', 'Fatima', 'Abdi'];
const LAST = ['Warsame', 'Jama', 'Hassan', 'Ali', 'Farah', 'Osman', 'Abdullahi', 'Mohamed', 'Smith', 'Ibrahim', 'Nur', 'Adan'];
const SOURCES = ['DIRECT', 'BOOKING_COM', 'EXPEDIA', 'WALK_IN', 'CORPORATE'];

const MENUS: Record<PosOutletType, [string, string, number][]> = {
  RESTAURANT: [
    ['Bariis iyo Hilib', 'Mains', 1450], ['Grilled Kingfish', 'Mains', 1800], ['Chicken Suqaar', 'Mains', 1200],
    ['Sambuusa (3)', 'Starters', 450], ['Lentil Soup', 'Starters', 550], ['Garden Salad', 'Starters', 600],
    ['Malawax with Honey', 'Desserts', 500], ['Fresh Fruit Plate', 'Desserts', 650],
  ],
  BAR: [
    ['Shaah (Spiced Tea)', 'Hot drinks', 250], ['Espresso', 'Hot drinks', 300], ['Cappuccino', 'Hot drinks', 400],
    ['Fresh Mango Juice', 'Cold drinks', 450], ['Lemon Mint', 'Cold drinks', 400], ['Sparkling Water', 'Cold drinks', 250],
  ],
  ROOM_SERVICE: [
    ['Club Sandwich', 'All day', 1100], ['Breakfast Tray', 'Breakfast', 1500], ['Late Night Pasta', 'All day', 1300],
  ],
  SPA: [['Swedish Massage 60m', 'Treatments', 6500], ['Hammam Ritual', 'Treatments', 5000], ['Manicure', 'Beauty', 2500]],
  MINIBAR: [['Water 500ml', 'Drinks', 150], ['Cashews', 'Snacks', 450], ['Chocolate Bar', 'Snacks', 350]],
};

interface HotelSeed {
  name: string;
  slug: string;
  city: string;
  country: string;
  timezone: string;
  taxRateBps: number;
  floors: number;
  roomsPerFloor: number;
  emailDomain: string;
  outlets: [string, PosOutletType][];
}

const HOTELS: HotelSeed[] = [
  {
    name: 'Guryeeye Grand Mogadishu',
    slug: 'grand-mogadishu',
    city: 'Mogadishu',
    country: 'Somalia',
    timezone: 'Africa/Mogadishu',
    taxRateBps: 1000,
    floors: 5,
    roomsPerFloor: 10,
    emailDomain: 'grand.guryeeye.com',
    outlets: [['Xamar Restaurant', 'RESTAURANT'], ['Lido Lounge Bar', 'BAR'], ['In-Room Dining', 'ROOM_SERVICE'], ['Oasis Spa', 'SPA']],
  },
  {
    name: 'Guryeeye Suites Hargeisa',
    slug: 'suites-hargeisa',
    city: 'Hargeisa',
    country: 'Somaliland',
    timezone: 'Africa/Mogadishu',
    taxRateBps: 500,
    floors: 3,
    roomsPerFloor: 8,
    emailDomain: 'hargeisa.guryeeye.com',
    outlets: [['Naasa Hablood Café', 'RESTAURANT'], ['Minibar', 'MINIBAR']],
  },
];


const STREETS = ['Maka Al Mukarama Rd', 'Jidka Wadnaha', 'KM4 Junction', 'Taleex St', 'Lido Beach Rd', 'Hodan District', 'Waberi Ave', 'Shaqalaha', 'Jigjiga Yar', 'New Hargeisa'];

const RENTALS: Record<string, [string, PropertyType, number, number, number][]> = {
  // name, type, units, bedrooms, monthly rent (cents)
  'grand-mogadishu': [
    ['Hodan Heights Apartments', 'APARTMENT', 12, 2, 65000],
    ['Lido Beach Villas', 'VILLA', 4, 4, 220000],
    ['Bakaara Trade Centre', 'COMMERCIAL', 6, 0, 120000],
    ['Waberi Family Homes', 'HOUSE', 5, 3, 90000],
  ],
  'suites-hargeisa': [
    ['Jigjiga Yar Residences', 'APARTMENT', 8, 2, 45000],
    ['Shaab Area Houses', 'HOUSE', 3, 3, 70000],
  ],
};

const LISTINGS: Record<string, [string, PropertyType, number | null, number, number][]> = {
  // title, type, bedrooms, area m², asking price (cents)
  'grand-mogadishu': [
    ['Sea-view villa on Lido Beach', 'VILLA', 5, 420, 38_500_000],
    ['3-bed family house, Hodan', 'HOUSE', 3, 210, 14_500_000],
    ['Penthouse apartment, KM4', 'APARTMENT', 3, 160, 12_000_000],
    ['Corner shop unit, Bakaara Market', 'COMMERCIAL', null, 85, 9_500_000],
    ['Residential plot, Daynile', 'LAND', null, 600, 4_800_000],
    ['2-bed apartment, Wadajir', 'APARTMENT', 2, 95, 6_200_000],
    ['Office floor, Maka Al Mukarama', 'COMMERCIAL', null, 340, 27_000_000],
    ['4-bed townhouse, Howlwadaag', 'HOUSE', 4, 260, 18_800_000],
    ['Beachfront plot, Jazeera', 'LAND', null, 1200, 16_000_000],
    ['Garden villa, Hamar Jajab', 'VILLA', 4, 330, 26_500_000],
  ],
  'suites-hargeisa': [
    ['Modern house, Jigjiga Yar', 'HOUSE', 4, 240, 11_500_000],
    ['Hilltop plot, Masala', 'LAND', null, 800, 3_900_000],
    ['2-bed flat, 26 June district', 'APARTMENT', 2, 90, 4_600_000],
    ['Retail unit, Hargeisa centre', 'COMMERCIAL', null, 70, 7_200_000],
  ],
};

function monthStart(d: string): string {
  return `${d.slice(0, 7)}-01`;
}
function nextMonth(p: string): string {
  const [y, m] = p.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}
function addMonths(d: string, n: number): string {
  let p = monthStart(d);
  if (n >= 0) for (let i = 0; i < n; i++) p = nextMonth(p);
  else for (let i = 0; i < -n; i++) {
    const [y, m] = p.split('-').map(Number) as [number, number];
    p = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, '0')}-01`;
  }
  return `${p.slice(0, 8)}${d.slice(8)}`;
}

async function seedRentals(hotelId: string, slug: string, today: string) {
  let leases = 0;
  for (const [name, type, unitCount, bedrooms, rent] of RENTALS[slug] ?? []) {
    const property = await prisma.rentalProperty.create({
      data: { hotelId, name, type, address: pick(STREETS), city: slug === 'suites-hargeisa' ? 'Hargeisa' : 'Mogadishu' },
    });
    for (let i = 1; i <= unitCount; i++) {
      const label = type === 'COMMERCIAL' ? `Shop ${i}` : type === 'APARTMENT' ? `${Math.ceil(i / 4)}${String(((i - 1) % 4) + 1).padStart(2, '0')}` : `No. ${i}`;
      const monthly = Math.round((rent * (0.9 + rand() * 0.25)) / 500) * 500;
      const r = rand();
      const unit = await prisma.rentalUnit.create({
        data: { propertyId: property.id, label, bedrooms, monthlyRentCents: monthly, status: r < 0.78 ? 'OCCUPIED' : r < 0.86 ? 'MAINTENANCE' : 'VACANT' },
      });
      if (unit.status !== 'OCCUPIED') continue;

      const tenant = await prisma.tenant.create({
        data: {
          hotelId,
          name: type === 'COMMERCIAL' ? `${pick(LAST)} ${pick(['Trading', 'Electronics', 'Pharmacy', 'Textiles', 'General Store'])}` : `${pick(FIRST)} ${pick(LAST)}`,
          phone: `+252 61 ${int(100, 999)} ${int(1000, 9999)}`,
          email: rand() > 0.5 ? `tenant${int(1000, 9999)}@example.com` : null,
        },
      });
      const start = `${addMonths(today, -int(1, 14)).slice(0, 8)}01`;
      const end = addDays(`${addMonths(today, int(1, 12)).slice(0, 8)}01`, -1);
      const lease = await prisma.lease.create({
        data: {
          hotelId, unitId: unit.id, tenantId: tenant.id, startDate: parseIsoDate(start), endDate: parseIsoDate(end),
          monthlyRentCents: monthly, depositCents: monthly,
        },
      });
      leases++;

      // A few tenants are behind on rent; everyone else is paid up except possibly this month.
      const arrears = rand() < 0.2 ? int(1, 2) : 0;
      const periods: string[] = [];
      for (let p = monthStart(start); p <= monthStart(today); p = nextMonth(p)) periods.push(p);
      for (const [idx, period] of periods.entries()) {
        const due = addDays(period, 4);
        const fromEnd = periods.length - 1 - idx;
        const unpaid = (fromEnd >= 1 && fromEnd <= arrears) || (fromEnd === 0 && due >= today && rand() < 0.5);
        const paidAt = new Date(Math.min(Date.now() - 3_600_000, Date.parse(`${addDays(period, int(0, 6))}T${String(int(8, 17)).padStart(2, '0')}:15:00Z`)));
        await prisma.rentPayment.create({
          data: {
            hotelId, leaseId: lease.id, period: parseIsoDate(period), dueDate: parseIsoDate(due), amountCents: monthly,
            status: unpaid ? 'PENDING' : 'PAID',
            method: unpaid ? null : pick(['MOBILE_MONEY', 'MOBILE_MONEY', 'CASH', 'CARD'] as const),
            paidAt: unpaid ? null : paidAt,
          },
        });
      }
    }
  }
  return leases;
}

async function seedSales(hotelId: string, slug: string, agentId: string | null) {
  const listings = [];
  for (const [title, type, bedrooms, areaSqm, price] of LISTINGS[slug] ?? []) {
    listings.push(
      await prisma.saleListing.create({
        data: {
          hotelId, title, type, bedrooms, areaSqm, askingPriceCents: price, address: pick(STREETS),
          city: slug === 'suites-hargeisa' ? 'Hargeisa' : 'Mogadishu',
          listedAt: new Date(Date.now() - int(5, 120) * 86_400_000),
        },
      }),
    );
  }

  // Close a few sales over the last two months.
  const soldCount = Math.min(3, Math.floor(listings.length / 3));
  for (const listing of listings.slice(0, soldCount)) {
    const price = Math.round((listing.askingPriceCents * (0.9 + rand() * 0.08)) / 10_000) * 10_000;
    const closedAt = new Date(Date.now() - int(2, 55) * 86_400_000);
    const lead = await prisma.saleLead.create({
      data: {
        hotelId, listingId: listing.id, agentId, name: `${pick(FIRST)} ${pick(LAST)}`, phone: `+252 61 ${int(100, 999)} ${int(1000, 9999)}`,
        stage: 'WON', offerCents: price, createdAt: new Date(closedAt.getTime() - int(10, 40) * 86_400_000),
      },
    });
    await prisma.saleListing.update({ where: { id: listing.id }, data: { status: 'SOLD' } });
    await prisma.saleTransaction.create({
      data: { hotelId, listingId: listing.id, leadId: lead.id, priceCents: price, commissionBps: 300, commissionCents: Math.round(price * 0.03), closedAt },
    });
  }

  const onMarket = listings.slice(soldCount);
  const stages = ['NEW', 'NEW', 'CONTACTED', 'CONTACTED', 'VIEWING', 'VIEWING', 'NEGOTIATION', 'LOST'] as const;
  for (let i = 0; i < onMarket.length * 2; i++) {
    const listing = rand() < 0.85 ? pick(onMarket) : null;
    const stage = pick(stages);
    await prisma.saleLead.create({
      data: {
        hotelId, listingId: listing?.id ?? null, agentId, name: `${pick(FIRST)} ${pick(LAST)}`,
        phone: `+252 61 ${int(100, 999)} ${int(1000, 9999)}`, email: rand() > 0.5 ? `buyer${int(1000, 9999)}@example.com` : null,
        stage,
        offerCents: stage === 'NEGOTIATION' && listing ? Math.round((listing.askingPriceCents * (0.85 + rand() * 0.1)) / 10_000) * 10_000 : null,
        notes: stage === 'VIEWING' ? 'Viewing booked for this week' : stage === 'LOST' ? 'Bought elsewhere' : null,
        createdAt: new Date(Date.now() - int(1, 45) * 86_400_000),
      },
    });
    if (stage === 'NEGOTIATION' && listing) await prisma.saleListing.update({ where: { id: listing.id }, data: { status: 'UNDER_OFFER' } });
  }
  return listings.length;
}

async function seedHotel(cfg: HotelSeed, passwordHash: string, primary: boolean) {
  const today = todayInTimezone(cfg.timezone);
  const hotel = await prisma.hotel.create({
    data: {
      name: cfg.name,
      slug: cfg.slug,
      city: cfg.city,
      country: cfg.country,
      currency: 'USD',
      timezone: cfg.timezone,
      taxRateBps: cfg.taxRateBps,
    },
  });

  const types = await Promise.all(
    [
      { name: 'Standard Queen', code: 'STQ', baseRateCents: 9500, capacity: 2 },
      { name: 'Deluxe King', code: 'DLK', baseRateCents: 14500, capacity: 2 },
      { name: 'Family Suite', code: 'FST', baseRateCents: 21000, capacity: 4 },
      { name: 'Presidential Suite', code: 'PRS', baseRateCents: 48000, capacity: 4 },
    ].map((t) => prisma.roomType.create({ data: { ...t, hotelId: hotel.id } })),
  );
  const typeFor = (floor: number, idx: number) => {
    if (floor === cfg.floors && idx === 1) return types[3]!;
    if (floor >= cfg.floors - 1 && idx <= 3) return types[2]!;
    return idx % 2 === 0 ? types[1]! : types[0]!;
  };

  const prefix = cfg.emailDomain.split('.')[0];
  const staff = {
    owner: await prisma.user.create({
      data: { email: primary ? 'owner@guryeeye.com' : `owner@${cfg.emailDomain}`, name: primary ? 'Hamza Warsame' : 'Khadra Osman', role: 'HOTEL_OWNER', hotelId: hotel.id, passwordHash },
    }),
    manager: await prisma.user.create({
      data: { email: primary ? 'manager@guryeeye.com' : `manager@${cfg.emailDomain}`, name: 'Ayaan Jama', role: 'MANAGER', hotelId: hotel.id, passwordHash },
    }),
    frontDesk: await prisma.user.create({
      data: { email: primary ? 'frontdesk@guryeeye.com' : `frontdesk@${cfg.emailDomain}`, name: 'Mustafe Ali', role: 'FRONT_DESK', hotelId: hotel.id, passwordHash },
    }),
    cashier: await prisma.user.create({
      data: { email: primary ? 'cashier@guryeeye.com' : `cashier@${cfg.emailDomain}`, name: 'Deeqa Nur', role: 'POS_CASHIER', hotelId: hotel.id, passwordHash },
    }),
    propertyManager: await prisma.user.create({
      data: { email: primary ? 'property@guryeeye.com' : `property@${cfg.emailDomain}`, name: 'Ilhan Abdi', role: 'PROPERTY_MANAGER', hotelId: hotel.id, passwordHash },
    }),
    salesAgent: await prisma.user.create({
      data: { email: primary ? 'sales@guryeeye.com' : `sales@${cfg.emailDomain}`, name: 'Bashir Yusuf', role: 'SALES_AGENT', hotelId: hotel.id, passwordHash },
    }),
  };
  const housekeepers = await Promise.all(
    ['Asha Farah', 'Mohamed Adan', 'Hibo Ismail'].map((name, i) =>
      prisma.user.create({
        data: {
          email: primary && i === 0 ? 'housekeeping@guryeeye.com' : `hk${i + 1}.${prefix}@guryeeye.com`,
          name,
          role: 'HOUSEKEEPER',
          hotelId: hotel.id,
          passwordHash,
        },
      }),
    ),
  );

  const rooms = [];
  for (let floor = 1; floor <= cfg.floors; floor++) {
    for (let i = 1; i <= cfg.roomsPerFloor; i++) {
      const t = typeFor(floor, i);
      rooms.push(
        await prisma.room.create({
          data: { hotelId: hotel.id, roomTypeId: t.id, number: `${floor}${String(i).padStart(2, '0')}`, floor },
        }),
      );
    }
  }

  const newGuest = () =>
    prisma.guest.create({
      data: {
        hotelId: hotel.id,
        firstName: pick(FIRST),
        lastName: pick(LAST),
        email: rand() > 0.3 ? `guest${int(1000, 9999)}@example.com` : null,
        phone: rand() > 0.4 ? `+252 61 ${int(100, 999)} ${int(1000, 9999)}` : null,
      },
    });

  // ---- 30 days of history: checked-out stays with posted folios ----
  for (const room of rooms) {
    const t = types.find((x) => x.id === room.roomTypeId)!;
    let cursor = addDays(today, -32 + int(0, 3));
    while (true) {
      const nights = int(1, 4);
      const out = addDays(cursor, nights);
      if (out >= addDays(today, -1)) break;
      if (rand() < 0.68) {
        const guest = await newGuest();
        const rate = Math.round(t.baseRateCents * (0.85 + rand() * 0.3));
        await prisma.reservation.create({
          data: {
            hotelId: hotel.id,
            guestId: guest.id,
            roomTypeId: t.id,
            roomId: room.id,
            status: 'CHECKED_OUT',
            checkIn: parseIsoDate(cursor),
            checkOut: parseIsoDate(out),
            adults: int(1, t.capacity),
            rateCents: rate,
            source: pick(SOURCES),
            checkedInAt: new Date(`${cursor}T14:00:00Z`),
            checkedOutAt: new Date(`${out}T09:30:00Z`),
            folioLines: {
              create: { description: `Room ${room.number} — ${nights} night${nights === 1 ? '' : 's'}`, amountCents: nights * rate, source: 'ROOM', postedAt: new Date(`${out}T09:30:00Z`) },
            },
          },
        });
      }
      cursor = addDays(out, int(0, 2));
    }
  }

  // ---- Current state: in-house guests, arrivals, out of order, dirty rooms ----
  const inHouse: { reservationId: string; roomNumber: string }[] = [];
  for (const room of rooms) {
    const t = types.find((x) => x.id === room.roomTypeId)!;
    const r = rand();
    let status: RoomStatus = 'AVAILABLE';
    let cleanliness: Cleanliness = rand() < 0.75 ? 'CLEAN' : 'INSPECTED';

    if (r < 0.55) {
      const guest = await newGuest();
      const daysIn = int(0, 3);
      let daysOut = int(0, 4);
      if (daysIn === 0 && daysOut === 0) daysOut = 1;
      const checkIn = addDays(today, -daysIn);
      const res = await prisma.reservation.create({
        data: {
          hotelId: hotel.id, guestId: guest.id, roomTypeId: t.id, roomId: room.id, status: 'CHECKED_IN',
          checkIn: parseIsoDate(checkIn), checkOut: parseIsoDate(addDays(today, daysOut)),
          adults: int(1, t.capacity), rateCents: t.baseRateCents, source: pick(SOURCES), checkedInAt: new Date(`${checkIn}T14:00:00Z`),
        },
      });
      inHouse.push({ reservationId: res.id, roomNumber: room.number });
      status = 'OCCUPIED';
      cleanliness = rand() < 0.4 ? 'DIRTY' : 'CLEAN';
    } else if (r < 0.68) {
      const guest = await newGuest();
      await prisma.reservation.create({
        data: {
          hotelId: hotel.id, guestId: guest.id, roomTypeId: t.id, roomId: room.id, status: 'CONFIRMED',
          checkIn: parseIsoDate(today), checkOut: parseIsoDate(addDays(today, int(1, 5))),
          adults: int(1, t.capacity), rateCents: t.baseRateCents, source: pick(SOURCES),
        },
      });
      status = 'RESERVED';
      cleanliness = pick(['CLEAN', 'INSPECTED', 'DIRTY'] as const);
    } else if (r < 0.72) {
      status = 'OUT_OF_ORDER';
      cleanliness = 'DIRTY';
    } else if (r < 0.75) {
      status = 'MAINTENANCE';
    } else if (r < 0.85) {
      cleanliness = 'DIRTY';
    }
    await prisma.room.update({
      where: { id: room.id },
      data: {
        status,
        cleanliness,
        notes: status === 'OUT_OF_ORDER' ? 'AC unit replacement scheduled' : status === 'MAINTENANCE' ? 'Bathroom re-grouting' : null,
      },
    });
    if (status === 'MAINTENANCE') {
      await prisma.housekeepingTask.create({
        data: { hotelId: hotel.id, roomId: room.id, type: 'MAINTENANCE', status: 'IN_PROGRESS', priority: 'HIGH', startedAt: new Date(), notes: 'Bathroom re-grouting' },
      });
    }
  }

  // Future confirmed bookings (unassigned) so forward occupancy isn't empty.
  for (let d = 1; d <= 14; d++) {
    for (let k = 0; k < int(2, Math.ceil(rooms.length / 5)); k++) {
      const t = pick(types.slice(0, 3));
      const guest = await newGuest();
      await prisma.reservation.create({
        data: {
          hotelId: hotel.id, guestId: guest.id, roomTypeId: t.id, status: 'CONFIRMED',
          checkIn: parseIsoDate(addDays(today, d)), checkOut: parseIsoDate(addDays(today, d + int(1, 4))),
          adults: int(1, t.capacity), rateCents: t.baseRateCents, source: pick(SOURCES),
        },
      });
    }
  }

  // ---- Housekeeping: a realistic board, plus completed history for productivity reports ----
  const dirty = await prisma.room.findMany({ where: { hotelId: hotel.id, cleanliness: 'DIRTY', status: { not: 'OUT_OF_ORDER' } } });
  for (const [i, room] of dirty.entries()) {
    const hk = housekeepers[i % housekeepers.length]!;
    const inProgress = i % 4 === 0;
    await prisma.housekeepingTask.create({
      data: {
        hotelId: hotel.id, roomId: room.id, type: room.status === 'OCCUPIED' ? 'STAYOVER' : 'CHECKOUT_CLEAN',
        status: inProgress ? 'IN_PROGRESS' : 'PENDING', priority: room.status === 'RESERVED' ? 'URGENT' : i % 3 === 0 ? 'HIGH' : 'NORMAL',
        assigneeId: i % 5 === 4 ? null : hk.id, startedAt: inProgress ? new Date(Date.now() - 15 * 60_000) : null,
      },
    });
    if (inProgress) await prisma.room.update({ where: { id: room.id }, data: { cleanliness: 'CLEANING' } });
  }
  for (let d = 1; d <= 30; d++) {
    for (let k = 0; k < int(6, 14); k++) {
      const day = addDays(today, -d);
      const started = new Date(`${day}T${String(int(8, 15)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00Z`);
      const completed = new Date(started.getTime() + int(18, 55) * 60_000);
      await prisma.housekeepingTask.create({
        data: {
          hotelId: hotel.id, roomId: pick(rooms).id, type: pick(['CHECKOUT_CLEAN', 'STAYOVER', 'STAYOVER', 'DEEP_CLEAN', 'TURNDOWN'] as const),
          status: 'VERIFIED', assigneeId: pick(housekeepers).id, startedAt: started, completedAt: completed,
          verifiedAt: new Date(completed.getTime() + 20 * 60_000), createdAt: new Date(started.getTime() - 60 * 60_000),
        },
      });
    }
  }

  // ---- POS outlets, menus and sales history ----
  for (const [name, type] of cfg.outlets) {
    const outlet = await prisma.posOutlet.create({
      data: {
        hotelId: hotel.id, name, type,
        items: { create: MENUS[type].map(([itemName, category, priceCents]) => ({ name: itemName, category, priceCents })) },
      },
      include: { items: true },
    });
    for (let d = 30; d >= 0; d--) {
      for (let k = 0; k < int(3, type === 'SPA' ? 4 : 12); k++) {
        const lines = Array.from({ length: int(1, 3) }, () => {
          const item = pick(outlet.items);
          const quantity = int(1, 3);
          return { itemId: item.id, name: item.name, quantity, unitPriceCents: item.priceCents, lineTotalCents: quantity * item.priceCents };
        });
        const totals = computeOrderTotals(lines, cfg.taxRateBps);
        const closedAt = new Date(`${addDays(today, -d)}T${String(int(7, 21)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00Z`);
        if (closedAt > new Date()) continue;
        const toRoom = d === 0 && inHouse.length > 0 && rand() < 0.4 ? pick(inHouse) : null;
        const order = await prisma.posOrder.create({
          data: {
            hotelId: hotel.id, outletId: outlet.id, createdById: staff.cashier.id, ...totals,
            status: toRoom ? 'CHARGED_TO_ROOM' : 'PAID',
            paymentMethod: toRoom ? 'ROOM_CHARGE' : pick(['CASH', 'CARD', 'MOBILE_MONEY', 'MOBILE_MONEY'] as const),
            reservationId: toRoom?.reservationId ?? null, createdAt: closedAt, closedAt,
            lines: { create: lines },
          },
        });
        if (toRoom) {
          await prisma.folioLine.create({
            data: { reservationId: toRoom.reservationId, description: `${outlet.name} — order #${order.number}`, amountCents: totals.totalCents, source: 'POS', posOrderId: order.id, postedAt: closedAt },
          });
        }
      }
    }
  }

  const leases = await seedRentals(hotel.id, cfg.slug, today);
  const listings = await seedSales(hotel.id, cfg.slug, staff.salesAgent.id);

  return { hotel, rooms: rooms.length, leases, listings, staff, housekeepers };
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed a production database');

  console.log('Clearing existing data…');
  await prisma.$transaction([
    prisma.saleTransaction.deleteMany(),
    prisma.saleLead.deleteMany(),
    prisma.saleListing.deleteMany(),
    prisma.rentPayment.deleteMany(),
    prisma.lease.deleteMany(),
    prisma.tenant.deleteMany(),
    prisma.rentalUnit.deleteMany(),
    prisma.rentalProperty.deleteMany(),
    prisma.folioLine.deleteMany(),
    prisma.posOrderLine.deleteMany(),
    prisma.posOrder.deleteMany(),
    prisma.posItem.deleteMany(),
    prisma.posOutlet.deleteMany(),
    prisma.housekeepingTask.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.guest.deleteMany(),
    prisma.room.deleteMany(),
    prisma.roomType.deleteMany(),
    prisma.user.deleteMany(),
    prisma.hotel.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.create({
    data: { email: 'admin@guryeeye.com', name: 'Platform Admin', role: 'PLATFORM_ADMIN', passwordHash },
  });

  for (const [i, cfg] of HOTELS.entries()) {
    const { hotel, rooms, leases, listings } = await seedHotel(cfg, passwordHash, i === 0);
    console.log(`Seeded ${hotel.name} (${rooms} rooms, ${leases} active leases, ${listings} sale listings)`);
  }

  console.log(`\nDemo logins (password: ${PASSWORD})`);
  for (const e of ['admin', 'owner', 'manager', 'frontdesk', 'housekeeping', 'cashier', 'property', 'sales']) console.log(`  ${e}@guryeeye.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
