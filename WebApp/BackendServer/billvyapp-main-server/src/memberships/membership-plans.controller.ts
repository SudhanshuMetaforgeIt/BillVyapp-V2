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
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { MembershipPlanQueryDto } from './dto/membership-plan-query.dto';
import { MembershipPlanResponseDto } from './dto/membership-plan-response.dto';
import { PaginatedMembershipPlansDto } from './dto/paginated-membership-plans.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { MembershipPlansService } from './membership-plans.service';

const PLAN_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const PLAN_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Membership Plans')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('membership-plans')
export class MembershipPlansController {
  constructor(
    private readonly membershipPlansService: MembershipPlansService,
  ) {}

  @Get()
  @Roles(...PLAN_READ_ROLES)
  @ApiOperation({
    summary: 'List membership plans',
    description:
      'CUSTOMER callers receive active plans only. Scoped by salon for staff roles.',
  })
  @ApiResponse({ status: 200, type: PaginatedMembershipPlansDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MembershipPlanQueryDto,
  ) {
    return this.membershipPlansService.list(user, query);
  }

  @Post()
  @Roles(...PLAN_WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a membership plan',
    description:
      'Requires salonId, name, price and durationDays. Duplicate names in a salon return 409.',
  })
  @ApiResponse({ status: 201, type: MembershipPlanResponseDto })
  @ApiResponse({ status: 400, description: 'Inactive salon' })
  @ApiResponse({ status: 404, description: 'Salon not found' })
  @ApiResponse({
    status: 409,
    description: 'Plan name already exists in this salon',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMembershipPlanDto,
    @Req() req: Request,
  ) {
    return this.membershipPlansService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...PLAN_READ_ROLES)
  @ApiOperation({ summary: 'Get a membership plan by id' })
  @ApiResponse({ status: 200, type: MembershipPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipPlansService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...PLAN_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a membership plan',
    description:
      'Does not accept id, salonId, createdAt, updatedAt or isActive.',
  })
  @ApiResponse({ status: 200, type: MembershipPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  @ApiResponse({
    status: 409,
    description: 'Plan name already exists in this salon',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipPlanDto,
    @Req() req: Request,
  ) {
    return this.membershipPlansService.update(
      user,
      id,
      dto,
      requestContext(req),
    );
  }

  @Patch(':id/status')
  @Roles(...PLAN_WRITE_ROLES)
  @ApiOperation({
    summary: 'Activate or deactivate a membership plan',
    description:
      'Soft status change only. Plans are never physically deleted so membership history stays intact.',
  })
  @ApiResponse({ status: 200, type: MembershipPlanResponseDto })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.membershipPlansService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
