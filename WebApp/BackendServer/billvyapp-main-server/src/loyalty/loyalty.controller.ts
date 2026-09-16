import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateLoyaltyTransactionDto } from './dto/create-loyalty-transaction.dto';
import { LoyaltyBalanceQueryDto } from './dto/loyalty-balance-query.dto';
import { LoyaltyBalanceResponseDto } from './dto/loyalty-balance-response.dto';
import { LoyaltyQueryDto } from './dto/loyalty-query.dto';
import { LoyaltyTransactionResponseDto } from './dto/loyalty-transaction-response.dto';
import { PaginatedLoyaltyTransactionsDto } from './dto/paginated-loyalty-transactions.dto';
import { LoyaltyService } from './loyalty.service';

const LOYALTY_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const LOYALTY_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

@ApiTags('Loyalty')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  @Roles(...LOYALTY_READ_ROLES)
  @ApiOperation({
    summary: 'List loyalty transactions',
    description:
      'Append-only ledger. CUSTOMER callers only see their own transactions. Filter by customerId, salonId, transactionType.',
  })
  @ApiResponse({ status: 200, type: PaginatedLoyaltyTransactionsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LoyaltyQueryDto,
  ) {
    return this.loyaltyService.list(user, query);
  }

  @Get('balance')
  @Roles(...LOYALTY_READ_ROLES)
  @ApiOperation({
    summary: 'Get loyalty point balance for a customer',
    description:
      'Returns the sum of all transaction points. CUSTOMER callers are forced to their own customer id.',
  })
  @ApiResponse({ status: 200, type: LoyaltyBalanceResponseDto })
  balance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LoyaltyBalanceQueryDto,
  ) {
    return this.loyaltyService.balance(user, query);
  }

  @Post()
  @Roles(...LOYALTY_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a loyalty transaction',
    description:
      'Append-only. REDEEMED requires points < 0 and sufficient balance. EARNED/BONUS require points > 0. ADJUSTED may be either sign.',
  })
  @ApiResponse({ status: 201, type: LoyaltyTransactionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid points sign or insufficient balance',
  })
  @ApiResponse({ status: 404, description: 'Customer or salon not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLoyaltyTransactionDto,
    @Req() req: Request,
  ) {
    return this.loyaltyService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...LOYALTY_READ_ROLES)
  @ApiOperation({ summary: 'Get a loyalty transaction by id' })
  @ApiResponse({ status: 200, type: LoyaltyTransactionResponseDto })
  @ApiResponse({ status: 404, description: 'Loyalty transaction not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.loyaltyService.findOne(user, id);
  }
}
