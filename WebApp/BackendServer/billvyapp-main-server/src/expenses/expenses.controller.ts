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
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { requestContext } from '../common/http/request-context';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  ExpenseCategoryQueryDto,
} from './dto/expense.dto';
import {
  ExpenseResponseDto,
  ExpenseCategoryResponseDto,
  PaginatedExpensesDto,
  PaginatedExpenseCategoriesDto,
  ExpenseSummaryDto,
} from './dto/expense-response.dto';
import { ExpensesService } from './expenses.service';

const MANAGEMENT = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;
const EXPENSE_WRITE = [RoleCode.ADMIN, RoleCode.MANAGER] as const;
const CATEGORY_WRITE = [RoleCode.ADMIN] as const;

@ApiTags('Expenses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({
  description: 'Business/branch outside your scope or insufficient role',
})
@Roles(...MANAGEMENT)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @ApiOperation({
    summary: 'List recorded expenses',
    description:
      'Manager: assigned branch. Admin: assigned business. Super Admin: platform-wide. Filters never widen authenticated scope.',
  })
  @ApiResponse({ status: 200, type: PaginatedExpensesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseQueryDto,
  ) {
    return this.service.list(user, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Expense totals by category and payment method',
    description:
      'Uses the same scope and filters as the list; totals cover all matching records, not just one page.',
  })
  @ApiResponse({ status: 200, type: ExpenseSummaryDto })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseQueryDto,
  ) {
    return this.service.summary(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recorded expense' })
  @ApiResponse({ status: 200, type: ExpenseResponseDto })
  @ApiResponse({ status: 404, description: 'Expense not found in your scope' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles(...EXPENSE_WRITE)
  @ApiOperation({
    summary: 'Record an expense immediately',
    description:
      'Admin/Manager only. Super Admin has read-only access. Backend assigns creator and expense number; no approval is required.',
  })
  @ApiResponse({ status: 201, type: ExpenseResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid amount/date/receipt, inactive category or mismatched business',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    return this.service.create(user, dto, requestContext(req));
  }

  @Patch(':id')
  @Roles(...EXPENSE_WRITE)
  @ApiOperation({
    summary: 'Correct an existing expense',
    description:
      'Business, branch, creator and expense number are immutable. Financial history is retained; there is no delete or approval endpoint.',
  })
  @ApiResponse({ status: 200, type: ExpenseResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
    @Req() req: Request,
  ) {
    return this.service.update(user, id, dto, requestContext(req));
  }
}

@ApiTags('Expense Categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({
  description: 'Business outside your scope or insufficient role',
})
@Roles(...MANAGEMENT)
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @ApiOperation({
    summary: 'List business expense categories',
    description:
      'Use rootsOnly=true for top-level categories or parentId for children. Hierarchy is returned as parentId references. Manager sees categories in their branch’s business.',
  })
  @ApiResponse({ status: 200, type: PaginatedExpenseCategoriesDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ExpenseCategoryQueryDto,
  ) {
    return this.service.listCategories(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a business expense category' })
  @ApiResponse({ status: 200, type: ExpenseCategoryResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findCategory(user, id);
  }

  @Post()
  @Roles(...CATEGORY_WRITE)
  @ApiOperation({
    summary: 'Create a business expense category',
    description:
      'Admin only. Parent must belong to the same business. Duplicate sibling names are rejected. Super Admin has read-only access.',
  })
  @ApiResponse({ status: 201, type: ExpenseCategoryResponseDto })
  @ApiResponse({ status: 409, description: 'Duplicate sibling category name' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseCategoryDto,
    @Req() req: Request,
  ) {
    return this.service.createCategory(user, dto, requestContext(req));
  }

  @Patch(':id')
  @Roles(...CATEGORY_WRITE)
  @ApiOperation({
    summary: 'Edit or reparent an expense category',
    description:
      'Business is immutable. parentId=null moves a category to the top level. Cycles and parents in another business are rejected.',
  })
  @ApiResponse({ status: 200, type: ExpenseCategoryResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseCategoryDto,
    @Req() req: Request,
  ) {
    return this.service.updateCategory(user, id, dto, requestContext(req));
  }

  @Patch(':id/status')
  @Roles(...CATEGORY_WRITE)
  @ApiOperation({
    summary: 'Activate/deactivate an expense category',
    description:
      'This is category availability, not expense approval. An inactive category or ancestor cannot be used for new expenses. Existing financial history remains visible.',
  })
  @ApiResponse({ status: 200, type: ExpenseCategoryResponseDto })
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request,
  ) {
    return this.service.categoryStatus(
      user,
      id,
      dto.isActive,
      requestContext(req),
    );
  }
}
