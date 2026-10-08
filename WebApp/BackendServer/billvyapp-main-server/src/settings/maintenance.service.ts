import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PLATFORM_SETTINGS_ID } from './settings.constants';

export const MAINTENANCE_MESSAGE =
  'The application is in maintenance mode. It will be live soon.';
export const DATABASE_RESTORE_KEY = 'settings:database:restoring';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getStatus() {
    // During a full restore the settings table can be temporarily unavailable.
    const restoring = await this.redis.client.get(DATABASE_RESTORE_KEY);
    if (restoring) return { enabled: true, message: MAINTENANCE_MESSAGE };
    const settings = await this.prisma.platformSettings.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
      select: { maintenanceMode: true },
    });
    return {
      enabled: settings?.maintenanceMode ?? false,
      message: MAINTENANCE_MESSAGE,
    };
  }
}
