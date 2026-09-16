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
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PaginatedPurchasesDto } from './dto/paginated-purchases.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { UpdatePurchaseStatusDto } from './dto/update-purchase-status.dto';
import { PurchasesService } from './purchases.service';

const PURCHASE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

@ApiTags('Purchases')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @Roles(...PURCHASE_ROLES)
  @ApiOperation({
    summary: 'List purchases',
    description:
      'Scoped to the caller franchise/salon. Supports salonId, vendorId, status, date range and purchaseNumber search. Purchases are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: PaginatedPurchasesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PurchaseQueryDto,
  ) {
    return this.purchasesService.list(user, query);
  }

  @Post()
  @Roles(...PURCHASE_ROLES)
  @ApiOperation({
    summary: 'Create a purchase (DRAFT)',
    description:
      'Creates a DRAFT purchase with one or more product lines. Vendor must be active; each product must belong to the same salon. purchaseNumber is auto-generated when omitted. Stock is not applied until status becomes RECEIVED.',
  })
  @ApiResponse({ status: 201, type: PurchaseResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid salon, vendor, product or totals',
  })
  @ApiResponse({
    status: 404,
    description: 'Salon, vendor or product not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Purchase number already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseDto,
    @Req() req: Request,
  ) {
    return this.purchasesService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...PURCHASE_ROLES)
  @ApiOperation({
    summary: 'Get a purchase by id',
    description: 'Includes line items with product names.',
  })
  @ApiResponse({ status: 200, type: PurchaseResponseDto })
  @ApiResponse({ status: 403, description: 'Purchase outside your scope' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchasesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...PURCHASE_ROLES)
  @ApiOperation({
    summary: 'Update a DRAFT purchase',
    description:
      'Header and items are editable only while status is DRAFT. salonId is immutable. Status changes use PATCH /purchases/:id/status.',
  })
  @ApiResponse({ status: 200, type: PurchaseResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Purchase is not DRAFT or payload is invalid',
  })
  @ApiResponse({ status: 403, description: 'Purchase outside your scope' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseDto,
    @Req() req: Request,
  ) {
    return this.purchasesService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...PURCHASE_ROLES)
  @ApiOperation({
    summary: 'Change purchase status',
    description:
      'Soft status change only. Allowed: DRAFT→ORDERED|CANCELLED; ORDERED→PARTIALLY_RECEIVED|RECEIVED|CANCELLED; PARTIALLY_RECEIVED→RECEIVED|CANCELLED. Transitioning to RECEIVED upserts inventory and appends PURCHASE stock movements once.',
  })
  @ApiResponse({ status: 200, type: PurchaseResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Purchase outside your scope' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseStatusDto,
    @Req() req: Request,
  ) {
    return this.purchasesService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
