import { describe, expect, it } from 'vitest';
import { getLikelyNextRoutes } from './prefetch-predictions';
import { ROUTES } from '@/constants/routes';

describe('getLikelyNextRoutes', () => {
  it('returns likely next routes for admin dashboard home', () => {
    const routes = getLikelyNextRoutes(ROUTES.dashboard.admin.root, 'ADMIN');
    expect(routes).toContain(ROUTES.dashboard.admin.walkInBilling);
    expect(routes).toContain(ROUTES.dashboard.admin.bills);
    expect(routes).toContain(ROUTES.dashboard.admin.customers);
    expect(routes).toContain(ROUTES.dashboard.admin.reports);
    expect(routes.length).toBeLessThanOrEqual(4);
    // Should never include current page
    expect(routes).not.toContain(ROUTES.dashboard.admin.root);
  });

  it('returns likely next routes for manager dashboard home', () => {
    const routes = getLikelyNextRoutes(ROUTES.dashboard.manager.root, 'MANAGER');
    expect(routes).toContain(ROUTES.dashboard.manager.walkInBilling);
    expect(routes).toContain(ROUTES.dashboard.manager.appointments);
    expect(routes).toContain(ROUTES.dashboard.manager.bills);
    expect(routes.length).toBeLessThanOrEqual(4);
    expect(routes).not.toContain(ROUTES.dashboard.manager.root);
  });

  it('returns walk-in billing for staff dashboard home', () => {
    const routes = getLikelyNextRoutes(ROUTES.dashboard.staff.root, 'STAFF');
    expect(routes).toContain(ROUTES.dashboard.staff.walkInBilling);
    expect(routes).toContain(ROUTES.dashboard.staff.appointments);
  });

  it('returns salons and booking for customer dashboard home', () => {
    const routes = getLikelyNextRoutes(ROUTES.dashboard.customer.root, 'CUSTOMER');
    expect(routes).toContain(ROUTES.dashboard.customer.salons);
    expect(routes).toContain(ROUTES.dashboard.customer.myBookings);
    expect(routes).toContain(ROUTES.dashboard.customer.booking);
  });

  it('predicts booking for customer salon detail page', () => {
    const routes = getLikelyNextRoutes('/dashboard/customer/salons/salon-123', 'CUSTOMER');
    expect(routes).toContain(ROUTES.dashboard.customer.booking);
    expect(routes).toContain(ROUTES.dashboard.customer.myBookings);
  });

  it('returns auth alternatives for login page', () => {
    const routes = getLikelyNextRoutes(ROUTES.auth.login);
    expect(routes).toContain(ROUTES.auth.otp);
    expect(routes).toContain(ROUTES.auth.register);
    expect(routes).not.toContain(ROUTES.auth.login);
  });

  it('handles trailing slashes gracefully', () => {
    const routes = getLikelyNextRoutes(`${ROUTES.auth.login}/`);
    expect(routes).toContain(ROUTES.auth.otp);
  });

  it('returns role-based fallbacks for unknown subpaths', () => {
    const routes = getLikelyNextRoutes('/dashboard/admin/unknown-page', 'ADMIN');
    expect(routes).toContain(ROUTES.dashboard.admin.walkInBilling);
    expect(routes).toContain(ROUTES.dashboard.admin.bills);
  });

  it('returns empty array when no predictions and no role', () => {
    const routes = getLikelyNextRoutes('/random-untracked-page');
    expect(routes).toEqual([]);
  });
});
