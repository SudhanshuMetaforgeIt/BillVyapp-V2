import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreateProductVendorDto } from './dto/create-product-vendor.dto';
import {
  PaginatedProductVendorsDto,
  ProductVendorResponseDto,
} from './dto/product-vendor-response.dto';
import { UpdateProductVendorDto } from './dto/update-product-vendor.dto';
import { ProductVendorsService } from './product-vendors.service';

const READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

const WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Product Vendors')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role or product scope' })
@Controller('products/:productId/vendors')
export class ProductVendorsController {
  constructor(private readonly productVendorsService: ProductVendorsService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({
    summary: 'List vendors linked to a product',
    description: 'Requires salon access to the product.',
  })
  @ApiResponse({ status: 200, type: PaginatedProductVendorsDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.productVendorsService.list(
      user,
      productId,
      query.page,
      query.limit,
    );
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Link a vendor to a product',
    description: 'Unique (productId, vendorId) — duplicate links return 409.',
  })
  @ApiResponse({ status: 201, type: ProductVendorResponseDto })
  @ApiResponse({ status: 404, description: 'Product or vendor not found' })
  @ApiResponse({
    status: 409,
    description: 'Vendor is already linked to this product',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductVendorDto,
    @Req() req: Request,
  ) {
    return this.productVendorsService.create(
      user,
      productId,
      dto,
      requestContext(req),
    );
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Update a product–vendor link' })
  @ApiResponse({ status: 200, type: ProductVendorResponseDto })
  @ApiResponse({ status: 404, description: 'Product or link not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVendorDto,
    @Req() req: Request,
  ) {
    return this.productVendorsService.update(
      user,
      productId,
      id,
      dto,
      requestContext(req),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  @ApiOperation({ summary: 'Unlink a vendor from a product' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product or link not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.productVendorsService.remove(
      user,
      productId,
      id,
      requestContext(req),
    );
  }
}
