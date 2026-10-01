import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { hasCapability, type AuthUser, type Capability } from '@guryeeye/shared';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CAPABILITY_KEY, IS_PUBLIC_KEY, PLATFORM_ADMIN_KEY } from './auth.decorators';

export interface JwtPayload {
  sub: string;
}

type AuthedRequest = Request & { user?: AuthUser };

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  // EventSource cannot set headers, so the SSE stream alone accepts a query token.
  if (req.path.endsWith('/events') && typeof req.query.access_token === 'string') {
    return req.query.access_token;
  }
  return null;
}

/**
 * Global guard: authenticates the bearer token, re-loads the user so that
 * deactivated accounts lose access immediately, then enforces capability and
 * hotel-tenancy rules declared on the route.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException('Missing access token');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, hotelId: true, active: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('Account is disabled');

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hotelId: user.hotelId,
    };
    req.user = authUser;

    const isAdmin = authUser.role === 'PLATFORM_ADMIN';

    if (this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, targets) && !isAdmin) {
      throw new ForbiddenException('Platform administrator access required');
    }

    const hotelId = req.params?.hotelId;
    if (hotelId && !isAdmin && authUser.hotelId !== hotelId) {
      throw new ForbiddenException('You do not have access to this hotel');
    }

    const capability = this.reflector.getAllAndOverride<Capability | undefined>(CAPABILITY_KEY, targets);
    if (capability && !hasCapability(authUser.role, capability)) {
      throw new ForbiddenException(`Your role (${authUser.role}) cannot perform this action`);
    }

    return true;
  }
}
