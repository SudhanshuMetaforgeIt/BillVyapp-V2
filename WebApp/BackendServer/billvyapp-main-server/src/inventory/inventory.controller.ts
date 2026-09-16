import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { InventoryResponseDto } from './dto/inventory-response.dto';
import { PaginatedInventoryDto } from './dto/paginated-inventory.dto';
import { PaginatedStockMovementsDto } from './dto/paginated-stock-movements.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';
import { InventoryService } from './inventory.service';

const INVENTORY_READ_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

const INVENTORY_WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
] as const;

@ApiTags('Inventory')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Roles(...INVENTORY_READ_ROLES)
  @ApiOperation({
    summary: 'List inventory',
    description:
      'Scoped to the caller franchise/salon. Supports salonId, productId and lowStock (quantityOnHand <= product.reorderLevel).',
  })
  @ApiResponse({ status: 200, type: PaginatedInventoryDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InventoryQueryDto,
  ) {
    return this.inventoryService.list(user, query);
  }

  @Get('movements')
  @Roles(...INVENTORY_READ_ROLES)
  @ApiOperation({
    summary: 'List stock movements',
    description:
      'Append-only ledger. Filter by salonId, productId and movementType.',
  })
  @ApiResponse({ status: 200, type: PaginatedStockMovementsDto })
  listMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StockMovementQueryDto,
  ) {
    return this.inventoryService.listMovements(user, query);
  }

  @Post('adjust')
  @Roles(...INVENTORY_WRITE_ROLES)
  @ApiOperation({
    summary: 'Adjust inventory',
    description:
      'Applies a signed quantity delta and appends a StockMovement (ADJUSTMENT|DAMAGE|RETURN|TRANSFER_IN|TRANSFER_OUT). Rejects if resulting quantityOnHand would be negative. availableQuantity is recomputed as onHand - reserved.',
  })
  @ApiResponse({ status: 201, type: InventoryResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid movement type, product or negative stock result',
  })
  @ApiResponse({ status: 404, description: 'Salon or product not found' })
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AdjustInventoryDto,
    @Req() req: Request,
  ) {
    return this.inventoryService.adjust(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...INVENTORY_READ_ROLES)
  @ApiOperation({ summary: 'Get an inventory record by id' })
  @ApiResponse({ status: 200, type: InventoryResponseDto })
  @ApiResponse({ status: 403, description: 'Inventory outside your scope' })
  @ApiResponse({ status: 404, description: 'Inventory record not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.findOne(user, id);
  }

  @Get(':id/movements')
  @Roles(...INVENTORY_READ_ROLES)
  @ApiOperation({
    summary: 'List stock movements for an inventory row',
    description:
      'Filters movements to the salon/product pair of the inventory record.',
  })
  @ApiResponse({ status: 200, type: PaginatedStockMovementsDto })
  @ApiResponse({ status: 404, description: 'Inventory record not found' })
  listMovementsForInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StockMovementQueryDto,
  ) {
    return this.inventoryService.listMovementsForInventory(user, id, query);
  }
}
