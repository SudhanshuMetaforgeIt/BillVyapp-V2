import { describe, expect, it } from 'vitest';

import { navigationForRole } from './navigation';
import { dashboardHomeFor, ROUTES } from './routes';
import type { RoleCode } from './roles';

function hrefs(role: RoleCode): string[] {
  return navigationForRole(role).flatMap((section) => section.items.map((item) => item.href));
}

describe('role navigation', () => {
  it('sends each role to its own dashboard home', () => {
    expect(dashboardHomeFor('SUPER_ADMIN')).toBe(ROUTES.dashboard.superAdmin.root);
    expect(dashboardHomeFor('ADMIN')).toBe(ROUTES.dashboard.admin.root);
    expect(dashboardHomeFor('MANAGER')).toBe(ROUTES.dashboard.manager.root);
    expect(dashboardHomeFor('STAFF')).toBe(ROUTES.dashboard.staff.walkInBilling);
    expect(dashboardHomeFor('CUSTOMER')).toBe(ROUTES.dashboard.customer.root);
  });

  it('gives super admin platform tools including audit and search', () => {
    const links = hrefs('SUPER_ADMIN');
    expect(links).toContain(ROUTES.dashboard.superAdmin.audit);
    expect(links).toContain(ROUTES.dashboard.superAdmin.search);
    expect(links).toContain(ROUTES.dashboard.superAdmin.businesses);
  });

  it('gives admin franchise operations without inventory', () => {
    const links = hrefs('ADMIN');
    expect(links).toContain(ROUTES.dashboard.admin.staff);
    expect(links).not.toContain(`${ROUTES.dashboard.admin.root}/inventory`);
    expect(links.some((href) => href.includes('/audit'))).toBe(false);
    expect(links).not.toContain(ROUTES.dashboard.superAdmin.users);
  });

  it('gives manager salon operations and hides staff-only omissions', () => {
    const links = hrefs('MANAGER');
    expect(links).toContain(ROUTES.dashboard.manager.walkInBilling);
    expect(links).toContain(ROUTES.dashboard.manager.vendors);
    expect(links).toContain(ROUTES.dashboard.manager.salonPhotos);
    expect(links).toContain(ROUTES.dashboard.manager.salonLocation);
    expect(links.some((href) => href.includes('/audit'))).toBe(false);
  });

  it('adds the Salon Photos sidebar entry only for managers', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'] as const) {
      expect(hrefs(role)).not.toContain(ROUTES.dashboard.manager.salonPhotos);
      expect(hrefs(role)).not.toContain(ROUTES.dashboard.manager.salonLocation);
    }
    expect(navigationForRole('MANAGER').flatMap((section) => section.items).find((item) => item.href === ROUTES.dashboard.manager.salonPhotos)?.label).toBe('Salon Photos');
  });

  it('limits staff nav to walk-in billing and appointments', () => {
    const links = hrefs('STAFF');
    expect(links).toEqual([
      ROUTES.dashboard.staff.walkInBilling,
      ROUTES.dashboard.staff.appointments,
    ]);
  });

  it('gives customers self-service links only', () => {
    const links = hrefs('CUSTOMER');
    expect(links).toEqual(
      expect.arrayContaining([
        ROUTES.dashboard.customer.root,
        ROUTES.dashboard.customer.salons,
        ROUTES.dashboard.customer.myBookings,
        ROUTES.dashboard.customer.bills,
        ROUTES.dashboard.customer.rewards,
        ROUTES.dashboard.customer.profile,
      ]),
    );
    expect(links.some((href) => href.includes('/walk-in-billing'))).toBe(false);
  });
});
