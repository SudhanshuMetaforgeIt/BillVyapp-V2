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
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { PaginatedVendorsDto } from './dto/paginated-vendors.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorQueryDto } from './dto/vendor-query.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { VendorsService } from './vendors.service';

const VENDOR_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

const VENDOR_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Vendors')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @Roles(...VENDOR_READ_ROLES)
  @ApiOperation({
    summary: 'List vendors',
    description:
      'Global supplier directory — no salon filter. Search matches name, code, phone and email. STAFF is read-only. CUSTOMER has no access.',
  })
  @ApiResponse({ status: 200, type: PaginatedVendorsDto })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: VendorQueryDto) {
    return this.vendorsService.list(user, query);
  }

  @Post()
  @Roles(...VENDOR_WRITE_ROLES)
  @ApiOperation({ summary: 'Create a vendor' })
  @ApiResponse({ status: 201, type: VendorResponseDto })
  @ApiResponse({ status: 409, description: 'Vendor code already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVendorDto,
    @Req() req: Request,
  ) {
    return this.vendorsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...VENDOR_READ_ROLES)
  @ApiOperation({ summary: 'Get a vendor by id' })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendorsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...VENDOR_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a vendor',
    description: 'Does not accept id, createdAt, updatedAt or isActive.',
  })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  @ApiResponse({ status: 409, description: 'Vendor code already exists' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
    @Req() req: Request,
  ) {
    return this.vendorsService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...VENDOR_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a vendor',
    description:
      'Soft status change only. Vendors are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: VendorResponseDto })
  @ApiResponse({ status: 404, description: 'Vendor not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.vendorsService.updateStatus(user, id, dto, requestContext(req));
  }
}
