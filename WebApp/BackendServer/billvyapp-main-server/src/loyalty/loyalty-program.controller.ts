import { Body, Controller, Get, Header, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { LoyaltyProgramDto, LoyaltyQuoteDto } from './dto/loyalty-program.dto';
import { LoyaltyProgramService } from './loyalty-program.service';
@Controller('loyalty')
export class LoyaltyProgramController {
  constructor(private readonly program: LoyaltyProgramService) {}
  @Get('settings')
  @Roles(RoleCode.ADMIN)
  @Header('Cache-Control', 'private, no-store')
  settings(@CurrentUser() user: AuthenticatedUser) {
    return this.program.settings(user);
  }
  @Patch('settings')
  @Roles(RoleCode.ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LoyaltyProgramDto,
  ) {
    return this.program.update(user, dto);
  }
  @Get('quote')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF)
  @Header('Cache-Control', 'private, no-store')
  quote(@CurrentUser() user: AuthenticatedUser, @Query() dto: LoyaltyQuoteDto) {
    return this.program.quote(user, dto);
  }
}
