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
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { PaginatedUsersDto } from './dto/paginated-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List platform users',
    description: 'Excludes CUSTOMER accounts. Never returns passwordHash.',
  })
  @ApiResponse({ status: 200, type: PaginatedUsersDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(user, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a platform user',
    description:
      'Creates SUPER_ADMIN, ADMIN, MANAGER or STAFF. Password is hashed with Argon2id. CUSTOMER is rejected.',
  })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid role or scope combination',
  })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a platform user by id' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a platform user',
    description:
      'Does not accept password, passwordHash, id, createdAt or updatedAt.',
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Unsafe self-modification rejected',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.usersService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a platform user',
    description:
      'Cannot deactivate your own Super Admin account or the last Super Admin.',
  })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Unsafe self-modification rejected',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.usersService.updateStatus(user, id, dto, requestContext(req));
  }
}
