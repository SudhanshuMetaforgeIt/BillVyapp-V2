import type { RoleCode } from '@/constants/roles';

export type ProfileUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
  role: RoleCode;
  roleLabel: string;
  isActive: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
};

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};
