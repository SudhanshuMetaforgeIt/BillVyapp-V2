import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the globally registered JwtAuthGuard.
 * Authentication is deny-by-default, so this must be explicit.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
