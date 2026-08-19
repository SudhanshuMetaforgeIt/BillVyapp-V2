import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

/**
 * PHASE 1 SKELETON - no routes are exposed yet.
 *
 * Routes are added in Phase 2. Every handler must carry @Roles(...) with
 * @UseGuards(RolesGuard) and delegate to the service; controllers stay thin and
 * never query Prisma directly.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
