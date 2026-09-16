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
import { CreateProductDto } from './dto/create-product.dto';
import { PaginatedProductsDto } from './dto/paginated-products.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const CATALOG_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const CATALOG_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Products')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({
    summary: 'List products',
    description:
      'CUSTOMER callers receive active products only (selling price included). STAFF is read-only. Designed for later consumption by the customer mobile app.',
  })
  @ApiResponse({ status: 200, type: PaginatedProductsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.list(user, query);
  }

  @Post()
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a product',
    description:
      'Requires salonId, categoryId, name, sku and sellingPrice. The category must belong to the same salon. Duplicate SKU or barcode in a salon return 409.',
  })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid salon/category pairing or inactive salon',
  })
  @ApiResponse({ status: 404, description: 'Salon or category not found' })
  @ApiResponse({
    status: 409,
    description: 'SKU or barcode already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @Req() req: Request,
  ) {
    return this.productsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a product',
    description:
      'Does not accept id, salonId, createdAt, updatedAt or isActive. A new categoryId must belong to the same salon.',
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'SKU or barcode already exists in this salon',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: Request,
  ) {
    return this.productsService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a product',
    description:
      'Soft status change only. Products are never physically deleted so inventory and bill history stay intact.',
  })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.productsService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
