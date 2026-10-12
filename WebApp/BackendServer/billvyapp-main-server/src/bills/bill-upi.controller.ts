import { Controller, Get, Header, Param, ParseUUIDPipe } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { BillUpiService } from './bill-upi.service';

@Controller('bills')
@Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF)
export class BillUpiController {
  constructor(private readonly upi: BillUpiService) {}
  @Get(':id/upi-payment')
  @Header('Cache-Control', 'private, no-store')
  paymentQr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.upi.paymentQr(user, id);
  }
}
