import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthUser, Capability } from '@guryeeye/shared';

export const IS_PUBLIC_KEY = 'isPublic';
export const CAPABILITY_KEY = 'capability';
export const PLATFORM_ADMIN_KEY = 'platformAdmin';

/** Skip authentication for this route. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Require the caller's role to grant a capability (see ROLE_CAPABILITIES in @guryeeye/shared). */
export const RequireCapability = (capability: Capability) => SetMetadata(CAPABILITY_KEY, capability);

export const PlatformAdminOnly = () => SetMetadata(PLATFORM_ADMIN_KEY, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
