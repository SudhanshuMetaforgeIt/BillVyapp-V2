import { describe, expect, it } from 'vitest';

import { scopeKey } from './query-scope';
import { keyTouchesDomain, INVALIDATION_MAP } from './query-invalidation';
import { scopeChanged, toSessionUser } from '@/services/session';
import type { AuthMeUser } from '@/services/auth.service';
import type { AuthUser } from '@/types/user.types';

const admin: AuthUser = {
  id: 'admin-1',
  email: 'a@x.com',
  firstName: 'Ada',
  lastName: 'Admin',
  role: 'ADMIN',
  franchiseId: 'fr-1',
  salonId: null,
};

const otherAdmin: AuthUser = { ...admin, id: 'admin-2', franchiseId: 'fr-2' };

describe('query scope', () => {
  it('includes identity and tenant ids in the key', () => {
    expect(scopeKey(admin)).toEqual(['scope', 'admin-1', 'ADMIN', 'fr-1', '-']);
  });

  it('does not share keys across users or franchises', () => {
    expect(scopeKey(admin)).not.toEqual(scopeKey(otherAdmin));
  });

  it('uses a dedicated anonymous prefix when signed out', () => {
    expect(scopeKey(null)).toEqual(['anonymous']);
  });
});

describe('scopeChanged', () => {
  it('detects user, role, franchise and salon changes', () => {
    expect(scopeChanged(admin, admin)).toBe(false);
    expect(scopeChanged(admin, otherAdmin)).toBe(true);
    expect(scopeChanged(admin, { ...admin, role: 'MANAGER', salonId: 's1' })).toBe(true);
    expect(scopeChanged(null, admin)).toBe(true);
  });
});

describe('toSessionUser', () => {
  it('maps GET /auth/me and rejects unknown roles', () => {
    const me: AuthMeUser = {
      ...admin,
      phone: '9999999999',
      profilePhoto: null,
      isActive: true,
    };
    expect(toSessionUser(me)).toMatchObject({ id: 'admin-1', role: 'ADMIN' });
    expect(toSessionUser({ ...me, role: 'NOT_A_ROLE' as AuthMeUser['role'] })).toBeNull();
  });
});

describe('invalidation map', () => {
  it('invalidates bills and dashboard after a payment', () => {
    expect(INVALIDATION_MAP.payments).toEqual(
      expect.arrayContaining(['payments', 'bills', 'dashboard']),
    );
    expect(keyTouchesDomain(['scope', 'u1', 'bills', 'mine'], 'bills')).toBe(true);
    expect(keyTouchesDomain(['scope', 'u1', 'customers'], 'bills')).toBe(false);
  });
});
