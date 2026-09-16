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
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { FranchiseResponseDto } from './dto/franchise-response.dto';
import { ListFranchisesQueryDto } from './dto/list-franchises-query.dto';
import { PaginatedFranchisesDto } from './dto/paginated-franchises.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import { FranchisesService } from './franchises.service';

@ApiTags('Franchises')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN)
@Controller('franchises')
export class FranchisesController {
  constructor(private readonly franchisesService: FranchisesService) {}

  @Get()
  @ApiOperation({ summary: 'List franchises' })
  @ApiResponse({ status: 200, type: PaginatedFranchisesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFranchisesQueryDto,
  ) {
    return this.franchisesService.list(user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a franchise' })
  @ApiResponse({ status: 201, type: FranchiseResponseDto })
  @ApiResponse({ status: 409, description: 'Franchise code already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFranchiseDto,
    @Req() req: Request,
  ) {
    return this.franchisesService.create(user, dto, requestContext(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a franchise by id' })
  @ApiResponse({ status: 200, type: FranchiseResponseDto })
  @ApiResponse({ status: 404, description: 'Franchise not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.franchisesService.findOne(user, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a franchise',
    description: 'Does not accept id, createdAt, updatedAt or isActive.',
  })
  @ApiResponse({ status: 200, type: FranchiseResponseDto })
  @ApiResponse({ status: 404, description: 'Franchise not found' })
  @ApiResponse({ status: 409, description: 'Franchise code already exists' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFranchiseDto,
    @Req() req: Request,
  ) {
    return this.franchisesService.update(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a franchise',
    description:
      'Soft status change only. Franchises are never physically deleted.',
  })
  @ApiResponse({ status: 200, type: FranchiseResponseDto })
  @ApiResponse({ status: 404, description: 'Franchise not found' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.franchisesService.updateStatus(
      user,
      id,
      dto,
      requestContext(req),
    );
  }
}
