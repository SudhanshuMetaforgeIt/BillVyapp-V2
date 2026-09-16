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
import { CreateMembershipDto } from './dto/create-membership.dto';
import { MembershipQueryDto } from './dto/membership-query.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { PaginatedMembershipsDto } from './dto/paginated-memberships.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { UpdateMembershipStatusDto } from './dto/update-membership-status.dto';
import { MembershipsService } from './memberships.service';

const MEMBERSHIP_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const MEMBERSHIP_CREATE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

const MEMBERSHIP_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Memberships')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @Roles(...MEMBERSHIP_READ_ROLES)
  @ApiOperation({
    summary: 'List memberships',
    description:
      'CUSTOMER callers only see their own memberships. Filter by customerId, status, or salonId (via plan).',
  })
  @ApiResponse({ status: 200, type: PaginatedMembershipsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MembershipQueryDto,
  ) {
    return this.membershipsService.list(user, query);
  }

  @Post()
  @Roles(...MEMBERSHIP_CREATE_ROLES, RoleCode.CUSTOMER)
  @ApiOperation({
    summary: 'Create a membership',
    description:
      'endDate is computed as startDate + plan.durationDays. CUSTOMER callers use their own customer id. Default status is ACTIVE.',
  })
  @ApiResponse({ status: 201, type: MembershipResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Inactive plan or missing customerId',
  })
  @ApiResponse({ status: 404, description: 'Plan or customer not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMembershipDto,
    @Req() req: Request,
  ) {
    return this.membershipsService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...MEMBERSHIP_READ_ROLES)
  @ApiOperation({ summary: 'Get a membership by id' })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membershipsService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...MEMBERSHIP_WRITE_ROLES)
  @ApiOperation({
    summary: 'Update a membership',
    description:
      'Limited fields: membershipPlanId and startDate. Status changes use PATCH :id/status.',
  })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipDto,
    @Req() req: Request,
  ) {
    return this.membershipsService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...MEMBERSHIP_WRITE_ROLES)
  @ApiOperation({
    summary: 'Change membership status',
    description:
      'Soft status only. Allowed transitions: PENDING→ACTIVE|CANCELLED; ACTIVE→EXPIRED|CANCELLED. EXPIRED and CANCELLED are terminal.',
  })
  @ApiResponse({ status: 200, type: MembershipResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipStatusDto,
    @Req() req: Request,
  ) {
    return this.membershipsService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
