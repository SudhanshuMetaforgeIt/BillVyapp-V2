import { describe, expect, it } from 'vitest';

import { can, CAPABILITIES, type Capability } from './capabilities';
import type { RoleCode } from '@/constants/roles';

const roles: RoleCode[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'];

function user(role: RoleCode) {
  return {
    id: 'u1',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    role,
    franchiseId: role === 'SUPER_ADMIN' || role === 'CUSTOMER' ? null : 'f1',
    salonId: role === 'MANAGER' || role === 'STAFF' ? 's1' : null,
  };
}

describe('capabilities', () => {
  it('permits salon photo writes for managers and existing admins, not staff or customers', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const) expect(can(user(role), 'salonPhotos.write')).toBe(true);
    for (const role of ['STAFF', 'CUSTOMER'] as const) expect(can(user(role), 'salonPhotos.write')).toBe(false);
  });
  it('hides staff from audit and vendor write', () => {
    expect(can(user('STAFF'), 'audit.read')).toBe(false);
    expect(can(user('STAFF'), 'vendors.write')).toBe(false);
    expect(can(user('STAFF'), 'inventory.adjust')).toBe(false);
    expect(can(user('STAFF'), 'catalog.write')).toBe(false);
    expect(can(user('STAFF'), 'salons.geocode')).toBe(false);
  });

  it('lets staff operate day-to-day endpoints', () => {
    expect(can(user('STAFF'), 'customers.read')).toBe(true);
    expect(can(user('STAFF'), 'appointments.manage')).toBe(true);
    expect(can(user('STAFF'), 'bills.write')).toBe(true);
    expect(can(user('STAFF'), 'bills.status')).toBe(true);
    expect(can(user('STAFF'), 'purchases.manage')).toBe(true);
    expect(can(user('STAFF'), 'loyalty.write')).toBe(true);
  });

  it('restricts settings and audit to super admin', () => {
    expect(can(user('SUPER_ADMIN'), 'settings.manage')).toBe(true);
    expect(can(user('SUPER_ADMIN'), 'audit.read')).toBe(true);
    expect(can(user('ADMIN'), 'settings.manage')).toBe(false);
    expect(can(user('ADMIN'), 'audit.read')).toBe(false);
    expect(can(user('MANAGER'), 'settings.manage')).toBe(false);
    expect(can(user('MANAGER'), 'audit.read')).toBe(false);
  });

  it('lets customers read their own operational data', () => {
    expect(can(user('CUSTOMER'), 'appointments.manage')).toBe(true);
    expect(can(user('CUSTOMER'), 'bills.read')).toBe(true);
    expect(can(user('CUSTOMER'), 'loyalty.read')).toBe(true);
    expect(can(user('CUSTOMER'), 'customers.create')).toBe(false);
    expect(can(user('CUSTOMER'), 'audit.read')).toBe(false);
  });

  it('covers every capability for every role without throwing', () => {
    const keys = Object.keys(CAPABILITIES) as Capability[];
    for (const role of roles) {
      for (const capability of keys) {
        expect(typeof can(user(role), capability)).toBe('boolean');
      }
    }
  });

  it('denies when there is no user', () => {
    expect(can(null, 'search.use')).toBe(false);
  });
});
