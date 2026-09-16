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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { PaginatedCustomersDto } from './dto/paginated-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(
    RoleCode.SUPER_ADMIN,
    RoleCode.ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  )
  @ApiOperation({
    summary: 'List customers',
    description:
      'CUSTOMER callers only see their own profile. Search matches firstName, lastName, email, phone and customerCode. Never returns passwordHash.',
  })
  @ApiResponse({ status: 200, type: PaginatedCustomersDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customersService.list(user, query);
  }

  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.STAFF)
  @ApiOperation({
    summary: 'Create a customer',
    description:
      'Creates a CUSTOMER User (phone + OTP auth) and linked Customer row in a transaction. If a User already exists for the phone, it is linked rather than duplicated. passwordHash is never returned.',
  })
  @ApiResponse({ status: 201, type: CustomerResponseDto })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
    @Req() req: Request,
  ) {
    return this.customersService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(
    RoleCode.SUPER_ADMIN,
    RoleCode.ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Get a customer by id',
    description: 'A CUSTOMER may only read their own profile.',
  })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Customer record outside your scope',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(
    RoleCode.SUPER_ADMIN,
    RoleCode.ADMIN,
    RoleCode.MANAGER,
    RoleCode.STAFF,
    RoleCode.CUSTOMER,
  )
  @ApiOperation({
    summary: 'Update a customer profile',
    description:
      'Accepts firstName, lastName, email, phone, dateOfBirth, gender and profilePhoto. Does not accept id, userId, customerCode, passwordHash, roleId, createdAt or updatedAt. A CUSTOMER may only update their own profile.',
  })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Customer record outside your scope',
  })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Phone or email already exists' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: Request,
  ) {
    return this.customersService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER)
  @ApiOperation({
    summary: 'Activate or deactivate a customer',
    description:
      'Updates User.isActive. Customer has no isActive column. Soft status only — customers are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: CustomerResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.customersService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
