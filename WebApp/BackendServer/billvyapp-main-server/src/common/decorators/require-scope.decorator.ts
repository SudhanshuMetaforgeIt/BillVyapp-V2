import { SetMetadata } from '@nestjs/common';

export type ScopeKind = 'franchise' | 'salon' | 'own-customer';

export interface ScopeMetadata {
  kind: ScopeKind;
  /** Route param name. Defaults: franchiseId, salonId, customerId. */
  param?: string;
}

export const SCOPE_KEY = 'scope';

/**
 * Declares the row-level scope a route requires. Enforced by ScopeGuard.
 *
 * @example @RequireScope('salon')
 * @example @RequireScope('own-customer', 'id')
 */
export const RequireScope = (kind: ScopeKind, param?: string) =>
  SetMetadata(SCOPE_KEY, { kind, param } satisfies ScopeMetadata);
