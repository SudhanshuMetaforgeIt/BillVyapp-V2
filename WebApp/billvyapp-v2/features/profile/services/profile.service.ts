import {
  cleanPhoneInput,
  isValidPhoneInput,
  normalizePhone as internationalPhone,
} from '@/lib/phone';
import { ROLE_LABELS, isRoleCode } from '@/constants/roles';
import type { AuthMeUser } from '@/services/auth.service';
import { api } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { can } from '@/lib/capabilities';
import type { UserApiItem } from '@/features/users/types/users.types';
import type { ProfileUser, UpdateProfilePayload } from '../types/profile.types';

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
};

function languageLabel(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  const key = code.trim().toLowerCase();
  return LANGUAGE_LABELS[key] ?? code.trim();
}

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
    salonId: detail.salonId ?? null,
    salonName: null,
    franchiseId: detail.franchiseId ?? null,
    createdAt: detail.createdAt,
    lastLoginAt: detail.lastLoginAt,
    timezone: null,
    language: null,
  };
}

function toProfileUser(
  me: AuthMeUser,
  detail: UserApiItem | null,
): ProfileUser {
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
    salonId: me.salonId ?? detail?.salonId ?? null,
    salonName: me.salonName ?? null,
    franchiseId: me.franchiseId ?? detail?.franchiseId ?? null,
    createdAt: me.createdAt ?? detail?.createdAt ?? null,
    lastLoginAt: me.lastLoginAt ?? detail?.lastLoginAt ?? null,
    timezone: me.timezone ?? null,
    language: languageLabel(me.language),
  };
}

/**
 * Loads the signed-in profile from GET /auth/me (includes join / last-login /
 * salon name / franchise locale). Optionally merges GET /users/:id when the
 * caller may administer users.
 */
export async function fetchProfile(): Promise<ProfileUser> {
  const me = await authService.me();
  const role = isRoleCode(me.role) ? me.role : null;

  let detail: UserApiItem | null = null;
  if (role && can({ role }, 'users.read')) {
    detail = await api.get<UserApiItem>(`/users/${me.id}`).catch(() => null);
  }

  return toProfileUser(me, detail);
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

/** Normalize UI phone input to the international value the API expects. */
export function normalizePhone(value: string): string | null {
  const input = cleanPhoneInput(value);
  return isValidPhoneInput(input) ? internationalPhone(input) : null;
}

export function profileInitials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  return value || '?';
}
