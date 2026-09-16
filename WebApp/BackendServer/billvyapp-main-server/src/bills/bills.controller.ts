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
import { BillQueryDto } from './dto/bill-query.dto';
import { BillResponseDto } from './dto/bill-response.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { PaginatedBillsDto } from './dto/paginated-bills.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';
import { BillsService } from './bills.service';

const BILL_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const BILL_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

const BILL_STATUS_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Bills')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  @Roles(...BILL_READ_ROLES)
  @ApiOperation({
    summary: 'List bills',
    description:
      'CUSTOMER callers only see their own bills. Staff roles are limited to salon scope. Supports salonId, customerId, status, paymentStatus, date range and billNumber search. Bills are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: PaginatedBillsDto })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: BillQueryDto) {
    return this.billsService.list(user, query);
  }

  @Post()
  @Roles(...BILL_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a DRAFT bill',
    description:
      'Creates a draft bill with line items. Unit prices and tax rates are snapshotted from catalog when omitted. Stock is not deducted until status becomes COMPLETED.',
  })
  @ApiResponse({ status: 201, type: BillResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid salon, customer, service, product or line data',
  })
  @ApiResponse({
    status: 404,
    description: 'Salon, customer, service or product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Bill number already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBillDto,
    @Req() req: Request,
  ) {
    return this.billsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...BILL_READ_ROLES)
  @ApiOperation({
    summary: 'Get a bill by id',
    description:
      'Includes line items and a payments summary. A CUSTOMER may only read their own bills.',
  })
  @ApiResponse({ status: 200, type: BillResponseDto })
  @ApiResponse({ status: 403, description: 'Bill outside your scope' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...BILL_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a DRAFT bill',
    description:
      'Only DRAFT bills may be updated. salonId and status are immutable here; use PATCH /bills/:id/status for status.',
  })
  @ApiResponse({ status: 200, type: BillResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Bill is not DRAFT or invalid data',
  })
  @ApiResponse({ status: 403, description: 'Bill outside your scope' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillDto,
    @Req() req: Request,
  ) {
    return this.billsService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...BILL_STATUS_ROLES)
  @ApiOperation({
    summary: 'Change bill status',
    description:
      'Soft status only. DRAFT→COMPLETED|CANCELLED; COMPLETED→REFUNDED|CANCELLED. CANCELLED is rejected when paidAmount > 0. Completing a bill deducts PRODUCT inventory and writes SALE stock movements in a transaction.',
  })
  @ApiResponse({ status: 200, type: BillResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid transition, payments exist, or insufficient stock',
  })
  @ApiResponse({ status: 403, description: 'Bill outside your scope' })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBillStatusDto,
    @Req() req: Request,
  ) {
    return this.billsService.updateStatus(user, id, dto, requestContext(req));
  }
}
