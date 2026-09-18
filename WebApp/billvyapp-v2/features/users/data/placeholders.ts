import type { RoleCode } from '@/constants/roles';

/** Presentation colors for the role distribution donut. */
export const ROLE_DONUT_COLORS: Partial<Record<RoleCode, string>> = {
  SUPER_ADMIN: 'var(--bv-brand-orange)',
  ADMIN: 'var(--bv-champagne)',
  MANAGER: 'var(--bv-emerald)',
  STAFF: '#35507a',
};
