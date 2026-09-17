import type { LucideIcon } from 'lucide-react';

import type { RoleCode } from '@/constants/roles';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Presentation only — not a security boundary. */
  roles?: RoleCode[];
};

export type NavSection = {
  id: string;
  label?: string;
  items: NavItem[];
};
