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
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { PaginatedProductCategoriesDto } from './dto/paginated-product-categories.dto';
import { ProductCategoryQueryDto } from './dto/product-category-query.dto';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

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

@ApiTags('Product Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get()
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({
    summary: 'List product categories',
    description:
      'CUSTOMER callers receive active categories only. STAFF is read-only. Designed for later consumption by the customer mobile app.',
  })
  @ApiResponse({ status: 200, type: PaginatedProductCategoriesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProductCategoryQueryDto,
  ) {
    return this.productCategoriesService.list(user, query);
  }

  @Post()
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a product category',
    description: 'Name is unique per salon. Duplicate names return 409.',
  })
  @ApiResponse({ status: 201, type: ProductCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({
    status: 409,
    description: 'Category name already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductCategoryDto,
    @Req() req: Request,
  ) {
    return this.productCategoriesService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({ summary: 'Get a product category by id' })
  @ApiResponse({ status: 200, type: ProductCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productCategoriesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a product category',
    description:
      'Does not accept id, salonId, createdAt, updatedAt or isActive.',
  })
  @ApiResponse({ status: 200, type: ProductCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  @ApiResponse({
    status: 409,
    description: 'Category name already exists in this salon',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
    @Req() req: Request,
  ) {
    return this.productCategoriesService.update(
      user,
      id,
      dto,
      requestContext(req),
    );
  }

  @Patch(':id/status')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a product category',
    description:
      'Soft status change only. Categories are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: ProductCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Product category not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.productCategoriesService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
