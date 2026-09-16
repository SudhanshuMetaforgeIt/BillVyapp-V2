'use client';

import { useMemo } from 'react';

import type { RoleCode } from '@/constants/roles';
import {
  atLeastRole,
  canAccessFranchise,
  canAccessSalon,
  hasRole,
  isCustomer,
  isInternalUser,
  isSuperAdmin,
} from '@/lib/permissions';
import { useCurrentUser } from './use-current-user';

/**
 * Permission helpers bound to the current user.
 *
 * Components should use this instead of comparing `user.role` inline, so all
 * role logic stays in lib/permissions.ts. These control visibility only - the
 * backend enforces the real boundary.
 *
 *   const { can } = usePermissions();
 *   {can.manageStaff && <Button>Add staff</Button>}
 */
export function usePermissions() {
  const user = useCurrentUser();

  return useMemo(
    () => ({
      user,

      is: {
        superAdmin: isSuperAdmin(user),
        customer: isCustomer(user),
        internal: isInternalUser(user),
      },

      hasRole: (...roles: RoleCode[]) => hasRole(user, ...roles),
      atLeast: (minimum: RoleCode) => atLeastRole(user, minimum),

      canAccessFranchise: (franchiseId: string) =>
        canAccessFranchise(user, franchiseId),
      canAccessSalon: (salon: { id: string; franchiseId?: string | null }) =>
        canAccessSalon(user, salon),
    }),
    [user],
  );
}
