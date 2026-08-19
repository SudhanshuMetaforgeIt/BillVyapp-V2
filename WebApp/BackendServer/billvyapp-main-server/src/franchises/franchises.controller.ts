import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FranchisesService } from './franchises.service';

/**
 * PHASE 1 SKELETON - no routes are exposed yet.
 *
 * Routes are added in Phase 2. Every handler must carry @Roles(...) with
 * @UseGuards(RolesGuard) and delegate to the service; controllers stay thin and
 * never query Prisma directly.
 */
@ApiTags('Franchises')
@ApiBearerAuth()
@Controller('franchises')
export class FranchisesController {
  constructor(private readonly franchisesService: FranchisesService) {}
}
