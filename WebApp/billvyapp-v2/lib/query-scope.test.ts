import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { sameQueryScope, scopeKey } from './query-scope';
import { invalidateAfter, invalidatePaths, keyHasPath, keyTouchesDomain, INVALIDATION_MAP } from './query-invalidation';
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

  it('keeps paginated placeholders only within the verified scope', () => {
    const previous = [...scopeKey(admin), 'appointments', { page: 1 }];
    expect(sameQueryScope(previous, scopeKey(admin))).toBe(true);
    expect(sameQueryScope(previous, scopeKey(otherAdmin))).toBe(false);
    expect(sameQueryScope(previous, scopeKey({ ...admin, salonId: 'salon-2' }))).toBe(false);
    expect(sameQueryScope(previous, scopeKey(null))).toBe(false);
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
    expect(keyTouchesDomain([...scopeKey(admin), 'bills', 'mine'], 'bills')).toBe(true);
    expect(keyTouchesDomain([...scopeKey(admin), 'customers'], 'bills')).toBe(false);
  });

  it('matches feature roots without crossing into another feature section', () => {
    const scoped = [...scopeKey(admin), 'settings', 'notifications'];
    expect(keyTouchesDomain(scoped, 'settings')).toBe(true);
    expect(keyTouchesDomain(scoped, 'notifications')).toBe(false);
    expect(keyTouchesDomain([...scopeKey(admin), 'bill-documents', 'list'], 'bills')).toBe(false);
    expect(keyTouchesDomain([...scopeKey(admin), 'admin', 'my-business', 'salons', 'bills', 'payments'], 'bills')).toBe(true);
    expect(keyHasPath(scoped, ['settings', 'notifications'])).toBe(true);
    expect(keyHasPath(scoped, ['notifications'])).toBe(false);
  });

  it('invalidates bill-linked membership entitlements and leaves documents and settings alone', async () => {
    const client = new QueryClient();
    const keys = {
      bills: [...scopeKey(admin), 'bills', 'list'],
      payments: [...scopeKey(admin), 'payments', 'list'],
      customers: [...scopeKey(admin), 'customers', 'manager'],
      dashboard: [...scopeKey(admin), 'dashboard', 'admin'],
      documents: [...scopeKey(admin), 'bill-documents', 'list'],
      memberships: [...scopeKey(admin), 'memberships', 'plans'],
      settings: [...scopeKey(admin), 'settings', 'notifications'],
    };
    Object.values(keys).forEach((key) => client.setQueryData(key, {}));
    await invalidateAfter(client, 'bills');
    for (const name of ['bills', 'payments', 'customers', 'memberships', 'dashboard'] as const) {
      expect(client.getQueryState(keys[name])?.isInvalidated).toBe(true);
    }
    for (const name of ['documents', 'settings'] as const) {
      expect(client.getQueryState(keys[name])?.isInvalidated).toBe(false);
    }
    client.clear();
  });

  it('invalidates only the changed settings section', async () => {
    const client = new QueryClient();
    const email = [...scopeKey(admin), 'settings', 'email'];
    const security = [...scopeKey(admin), 'settings', 'security'];
    client.setQueryData(email, {});
    client.setQueryData(security, {});
    await invalidatePaths(client, [['settings', 'email']]);
    expect(client.getQueryState(email)?.isInvalidated).toBe(true);
    expect(client.getQueryState(security)?.isInvalidated).toBe(false);
    client.clear();
  });
});
