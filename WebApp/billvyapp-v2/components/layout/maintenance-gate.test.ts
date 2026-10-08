import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  role: 'ADMIN',
  data: {
    enabled: true,
    message: 'The application is in maintenance mode. It will be live soon.',
  } as { enabled: boolean; message: string } | undefined,
  error: false,
}));
vi.mock('@/hooks/use-current-user', () => ({
  useCurrentUser: () => ({ role: state.role }),
}));
vi.mock('@/hooks/use-scoped-query', () => ({
  useScopedQuery: () => ({
    data: state.data,
    isError: state.error,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/features/auth/hooks/use-logout', () => ({
  useLogout: () => ({ logout: vi.fn(), isPending: false }),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: unknown }) =>
    createElement('button', null, children as string),
}));
vi.mock('@/services/api-client', () => ({ api: { get: vi.fn() } }));
import { MaintenanceGate } from './maintenance-gate';

const render = () =>
  renderToStaticMarkup(
    createElement(
      MaintenanceGate,
      null,
      createElement('p', null, 'Business dashboard'),
    ),
  );
describe('Maintenance notice', () => {
  beforeEach(() => {
    state.role = 'ADMIN';
    state.error = false;
    state.data = {
      enabled: true,
      message: 'The application is in maintenance mode. It will be live soon.',
    };
  });
  it.each(['ADMIN', 'MANAGER', 'STAFF'])(
    'shows the prompt and hides business content for %s',
    (role) => {
      state.role = role;
      const html = render();
      expect(html).toContain(
        'The application is in maintenance mode. It will be live soon.',
      );
      expect(html).toContain('reopen automatically');
      expect(html).not.toContain('Business dashboard');
    },
  );
  it.each(['SUPER_ADMIN', 'CUSTOMER'])(
    'preserves the dashboard for %s',
    (role) => {
      state.role = role;
      expect(render()).toContain('Business dashboard');
    },
  );
  it('reopens the dashboard when the refreshed DB status is disabled', () => {
    expect(render()).not.toContain('Business dashboard');
    state.data = { enabled: false, message: '' };
    expect(render()).toContain('Business dashboard');
  });
  it('waits for a verified status on initial entry', () => {
    state.data = undefined;
    expect(render()).toContain('Checking application availability');
    expect(render()).not.toContain('Business dashboard');
  });
  it('keeps the maintenance prompt during a temporary polling failure', () => {
    state.error = true;
    expect(render()).toContain('Application under maintenance');
  });
});
