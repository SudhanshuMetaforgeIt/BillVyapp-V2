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
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { PaginatedServiceCategoriesDto } from './dto/paginated-service-categories.dto';
import { ServiceCategoryQueryDto } from './dto/service-category-query.dto';
import { ServiceCategoryResponseDto } from './dto/service-category-response.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { ServiceCategoriesService } from './service-categories.service';

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

@ApiTags('Service Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Get()
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({
    summary: 'List service categories',
    description:
      'CUSTOMER callers receive active categories only. STAFF is read-only. Designed for later consumption by the customer mobile app.',
  })
  @ApiResponse({ status: 200, type: PaginatedServiceCategoriesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ServiceCategoryQueryDto,
  ) {
    return this.serviceCategoriesService.list(user, query);
  }

  @Post()
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a service category',
    description: 'Name is unique per salon. Duplicate names return 409.',
  })
  @ApiResponse({ status: 201, type: ServiceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({
    status: 409,
    description: 'Category name already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceCategoryDto,
    @Req() req: Request,
  ) {
    return this.serviceCategoriesService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...CATALOG_READ_ROLES)
  @ApiOperation({ summary: 'Get a service category by id' })
  @ApiResponse({ status: 200, type: ServiceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Service category not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serviceCategoriesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a service category',
    description:
      'Does not accept id, salonId, createdAt, updatedAt or isActive.',
  })
  @ApiResponse({ status: 200, type: ServiceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Service category not found' })
  @ApiResponse({
    status: 409,
    description: 'Category name already exists in this salon',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryDto,
    @Req() req: Request,
  ) {
    return this.serviceCategoriesService.update(
      user,
      id,
      dto,
      requestContext(req),
    );
  }

  @Patch(':id/status')
  @Roles(...CATALOG_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a service category',
    description:
      'Soft status change only. Categories are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: ServiceCategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Service category not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.serviceCategoriesService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
