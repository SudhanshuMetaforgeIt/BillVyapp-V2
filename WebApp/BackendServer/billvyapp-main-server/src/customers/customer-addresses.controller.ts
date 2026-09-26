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
import { CustomerAddressesService } from './customer-addresses.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import {
  CustomerAddressResponseDto,
  PaginatedCustomerAddressesDto,
} from './dto/customer-address-response.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

const ADDRESS_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

@ApiTags('Customer Addresses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role or customer scope' })
@Controller('customers/:customerId/addresses')
export class CustomerAddressesController {
  constructor(private readonly addressesService: CustomerAddressesService) {}

  @Get()
  @Roles(...ADDRESS_ROLES)
  @ApiOperation({
    summary: 'List addresses for a customer',
    description:
      'CUSTOMER callers may only list their own addresses. Staff roles may list any customer address directory.',
  })
  @ApiResponse({ status: 200, type: PaginatedCustomerAddressesDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.addressesService.list(
      user,
      customerId,
      query.page,
      query.limit,
    );
  }

  @Post()
  @Roles(...ADDRESS_ROLES)
  @ApiOperation({
    summary: 'Create a customer address',
    description:
      'When isDefault=true, other addresses for the same customer are cleared as default. Coordinates use Decimal(10,7).',
  })
  @ApiResponse({ status: 201, type: CustomerAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: CreateCustomerAddressDto,
    @Req() req: Request,
  ) {
    return this.addressesService.create(
      user,
      customerId,
      dto,
      requestContext(req),
    );
  }

  @Get(':id')
  @Roles(...ADDRESS_ROLES)
  @ApiOperation({ summary: 'Get a customer address by id' })
  @ApiResponse({ status: 200, type: CustomerAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Customer or address not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressesService.findOne(user, customerId, id);
  }

  @Patch(':id')
  @Roles(...ADDRESS_ROLES)
  @ApiOperation({ summary: 'Update a customer address' })
  @ApiResponse({ status: 200, type: CustomerAddressResponseDto })
  @ApiResponse({ status: 404, description: 'Customer or address not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerAddressDto,
    @Req() req: Request,
  ) {
    return this.addressesService.update(
      user,
      customerId,
      id,
      dto,
      requestContext(req),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(...ADDRESS_ROLES)
  @ApiOperation({
    summary: 'Delete a customer address',
    description:
      'Hard delete of an address row. Financial history is unaffected.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Customer or address not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.addressesService.remove(
      user,
      customerId,
      id,
      requestContext(req),
    );
  }
}
