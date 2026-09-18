import { ROLE_LABELS, isRoleCode } from '@/constants/roles';
import type { AuthMeUser } from '@/services/auth.service';
import { api } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import type { UserApiItem } from '@/features/users/types/users.types';
import type { ProfileUser, UpdateProfilePayload } from '../types/profile.types';

function fromUserDetail(detail: UserApiItem): ProfileUser {
  const role = isRoleCode(detail.role.code) ? detail.role.code : 'SUPER_ADMIN';

  return {
    id: detail.id,
    firstName: detail.firstName,
    lastName: detail.lastName,
    email: detail.email,
    phone: detail.phone,
    profilePhoto: detail.profilePhoto,
    role,
    roleLabel: ROLE_LABELS[role],
    isActive: detail.isActive,
    createdAt: detail.createdAt,
    lastLoginAt: detail.lastLoginAt,
  };
}

function toProfileUser(me: AuthMeUser, detail: UserApiItem | null): ProfileUser {
  const role = isRoleCode(me.role) ? me.role : 'SUPER_ADMIN';

  return {
    id: me.id,
    firstName: me.firstName,
    lastName: me.lastName,
    email: me.email,
    phone: me.phone ?? detail?.phone ?? null,
    profilePhoto: me.profilePhoto ?? detail?.profilePhoto ?? null,
    role,
    roleLabel: ROLE_LABELS[role],
    isActive: me.isActive,
    createdAt: detail?.createdAt ?? null,
    lastLoginAt: detail?.lastLoginAt ?? null,
  };
}

/**
 * Loads the signed-in profile.
 * Prefers GET /auth/me; falls back to GET /users/:id when a session user id is known.
 */
export async function fetchProfile(userId?: string | null): Promise<ProfileUser> {
  try {
    const me = await authService.me();

    let detail: UserApiItem | null = null;
    try {
      detail = await api.get<UserApiItem>(`/users/${me.id}`);
    } catch {
      // Joined / last-login metadata is best-effort.
    }

    return toProfileUser(me, detail);
  } catch (meError) {
    if (!userId) throw meError;

    const detail = await api.get<UserApiItem>(`/users/${userId}`);
    return fromUserDetail(detail);
  }
}

export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<ProfileUser> {
  const updated = await api.patch<UserApiItem>(`/users/${userId}`, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
  });

  try {
    const me = await authService.me();
    return toProfileUser(me, updated);
  } catch {
    return fromUserDetail(updated);
  }
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }
  const space = trimmed.indexOf(' ');
  if (space === -1) {
    return { firstName: trimmed, lastName: trimmed };
  }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  };
}

/** Normalize UI phone input to the 10-digit value the API expects. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local.length === 10 ? local : null;
}

export function profileInitials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  return value || '?';
}
