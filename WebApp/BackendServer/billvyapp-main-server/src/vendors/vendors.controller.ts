import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';

/**
 * PHASE 1 SKELETON - no routes are exposed yet.
 *
 * Routes are added in Phase 2. Every handler must carry @Roles(...) with
 * @UseGuards(RolesGuard) and delegate to the service; controllers stay thin and
 * never query Prisma directly.
 */
@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}
}
