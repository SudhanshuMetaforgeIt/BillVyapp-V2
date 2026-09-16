import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginatedPaymentsDto } from './dto/paginated-payments.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

const PAYMENT_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const PAYMENT_STATUS_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

@ApiTags('Payments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Roles(...PAYMENT_ROLES)
  @ApiOperation({
    summary: 'List payments',
    description:
      'Scoped via parent bill salon. CUSTOMER callers only see payments on their own bills. Filters: billId, status, paymentMethod, date range.',
  })
  @ApiResponse({ status: 200, type: PaginatedPaymentsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaymentQueryDto,
  ) {
    return this.paymentsService.list(user, query);
  }

  @Post()
  @Roles(...PAYMENT_ROLES)
  @ApiOperation({
    summary: 'Create a payment',
    description:
      'Only COMPLETED bills accept payments. Amount must be > 0 and must not exceed dueAmount. SUCCESS payments recalculate bill paid/due/paymentStatus in a transaction. CUSTOMER may pay only their own bills.',
  })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Bill not completed, invalid amount, or overpayment',
  })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...PAYMENT_ROLES)
  @ApiOperation({
    summary: 'Get a payment by id',
    description: 'A CUSTOMER may only read payments on their own bills.',
  })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 403, description: 'Payment outside your scope' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(...PAYMENT_STATUS_ROLES)
  @ApiOperation({
    summary: 'Change payment status',
    description:
      'PENDING→SUCCESS|FAILED|CANCELLED|REFUNDED; SUCCESS→FAILED|CANCELLED|REFUNDED. Transitions involving SUCCESS recalculate bill settlement amounts.',
  })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or overpayment',
  })
  @ApiResponse({ status: 403, description: 'Payment outside your scope' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @Req() req: Request,
  ) {
    return this.paymentsService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
