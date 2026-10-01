import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginResponse, RegisterRequest } from '@guryeeye/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.guard';

// Compared against when the email is unknown so response timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('guryeeye-timing-equaliser', 10);

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'account'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active) throw new UnauthorizedException('Invalid email or password');

    const payload: JwtPayload = { sub: user.id };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hotelId: user.hotelId },
    };
  }

  /** Self-service sign-up: creates a business account and its owner, then signs them in. */
  async register(body: RegisterRequest): Promise<LoginResponse> {
    const email = body.email.toLowerCase().trim();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('An account with this email already exists — sign in instead');
    }
    const base = slugify(body.businessName);
    const taken = await this.prisma.hotel.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
    const used = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: body.name.trim(),
        role: 'HOTEL_OWNER',
        passwordHash,
        hotel: {
          create: {
            name: body.businessName.trim(),
            slug,
            city: body.city.trim(),
            country: body.country.trim(),
            timezone: 'Africa/Mogadishu',
          },
        },
      },
    });
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id } satisfies JwtPayload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, hotelId: user.hotelId },
    };
  }
}
