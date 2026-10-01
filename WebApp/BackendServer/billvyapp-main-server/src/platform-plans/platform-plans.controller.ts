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
import { CreatePlatformPlanDto } from './dto/create-platform-plan.dto';
import { ListPlatformPlansQueryDto } from './dto/list-platform-plans-query.dto';
import { PaginatedPlatformPlansDto } from './dto/paginated-platform-plans.dto';
import { PlatformPlanResponseDto } from './dto/platform-plan-response.dto';
import { UpdatePlatformPlanDto } from './dto/update-platform-plan.dto';
import { PlatformPlansService } from './platform-plans.service';

@ApiTags('Platform Plans')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN)
@Controller('platform-plans')
export class PlatformPlansController {
  constructor(private readonly platformPlansService: PlatformPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List platform subscription plans' })
  @ApiResponse({ status: 200, type: PaginatedPlatformPlansDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPlatformPlansQueryDto,
  ) {
    return this.platformPlansService.list(user, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a platform subscription plan',
    description:
      'When isCustom is true, priceMonthly must be omitted. Duplicate names return 409.',
  })
  @ApiResponse({ status: 201, type: PlatformPlanResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid pricing combination' })
  @ApiResponse({ status: 409, description: 'Plan name already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlatformPlanDto,
    @Req() req: Request,
  ) {
    return this.platformPlansService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a platform plan by id' })
  @ApiResponse({ status: 200, type: PlatformPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Platform plan not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.platformPlansService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a platform plan',
    description: 'Does not accept isActive — use PATCH :id/status.',
  })
  @ApiResponse({ status: 200, type: PlatformPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Platform plan not found' })
  @ApiResponse({ status: 409, description: 'Plan name already exists' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformPlanDto,
    @Req() req: Request,
  ) {
    return this.platformPlansService.update(
      user,
      id,
      dto,
      requestContext(req),
    );
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a platform plan',
    description: 'Soft status change only. Plans are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: PlatformPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Platform plan not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.platformPlansService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
