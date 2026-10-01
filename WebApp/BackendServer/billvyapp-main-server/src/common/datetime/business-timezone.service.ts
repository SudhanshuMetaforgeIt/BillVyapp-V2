import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_SETTINGS_ID } from '../../settings/settings.constants';
import {
  DEFAULT_BUSINESS_TIMEZONE,
  resolveBusinessTimezone,
} from './datetime';

@Injectable()
export class BusinessTimezoneService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformTimezone(): Promise<string> {
    const row = await this.prisma.platformSettings.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
      select: { timezone: true },
    });
    return resolveBusinessTimezone({
      platformTimezone: row?.timezone ?? null,
    });
  }

  async resolveForUser(user: AuthenticatedUser): Promise<string> {
    let franchiseTimezone: string | null = null;
    if (user.franchiseId) {
      const franchise = await this.prisma.franchise.findUnique({
        where: { id: user.franchiseId },
        select: { preferences: true },
      });
      franchiseTimezone = extractTimezone(franchise?.preferences);
    }

    const platformTimezone = await this.getPlatformTimezone();
    return resolveBusinessTimezone({
      franchiseTimezone,
      platformTimezone,
    });
  }
}

function extractTimezone(preferences: unknown): string | null {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return null;
  }
  const value = (preferences as Record<string, unknown>).timezone;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export { DEFAULT_BUSINESS_TIMEZONE };
