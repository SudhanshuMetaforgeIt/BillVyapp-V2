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
import { SkipSubscription } from '../common/decorators/skip-subscription.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  EnrollFranchiseSubscriptionDto,
  FranchiseSubscriptionResponseDto,
  ListFranchiseSubscriptionsQueryDto,
  PaginatedFranchiseSubscriptionsDto,
  RequestSubscriptionDto,
} from './dto/franchise-subscription.dto';
import { FranchiseSubscriptionsService } from './franchise-subscriptions.service';

@ApiTags('Franchise Subscriptions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role or subscription' })
@Controller('franchise-subscriptions')
export class FranchiseSubscriptionsController {
  constructor(
    private readonly subscriptionsService: FranchiseSubscriptionsService,
  ) {}

  @Get()
  @Roles(RoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'List franchise plan enrollments' })
  @ApiResponse({ status: 200, type: PaginatedFranchiseSubscriptionsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFranchiseSubscriptionsQueryDto,
  ) {
    return this.subscriptionsService.list(user, query);
  }

  @Post()
  @Roles(RoleCode.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Enroll a franchise on a platform plan',
    description:
      'Cancels any prior ACTIVE subscription for the franchise, then creates a new ACTIVE enrollment (monthly / yearly / custom dates).',
  })
  @ApiResponse({ status: 201, type: FranchiseSubscriptionResponseDto })
  enroll(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EnrollFranchiseSubscriptionDto,
    @Req() req: Request,
  ) {
    return this.subscriptionsService.enroll(user, dto, requestContext(req));
  }

  @Get('me')
  @SkipSubscription()
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF)
  @ApiOperation({
    summary: 'Current franchise subscription for the logged-in user',
  })
  @ApiResponse({ status: 200, type: FranchiseSubscriptionResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.me(user);
  }

  @Post('request')
  @SkipSubscription()
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF)
  @ApiOperation({
    summary: 'Request Super Admin to enroll this franchise',
    description:
      'Creates a high-priority SUBSCRIPTION support ticket. Allowed while gated.',
  })
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestSubscriptionDto,
    @Req() req: Request,
  ) {
    return this.subscriptionsService.requestSubscription(
      user,
      dto,
      requestContext(req),
    );
  }

  @Patch(':id/cancel')
  @Roles(RoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel a franchise subscription' })
  @ApiResponse({ status: 200, type: FranchiseSubscriptionResponseDto })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.subscriptionsService.cancel(user, id, requestContext(req));
  }
}
