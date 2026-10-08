import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpensePaymentMethod } from '../../generated/prisma/enums';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';

export class ExpenseCategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() businessId: string;
  @ApiPropertyOptional({ nullable: true }) parentId: string | null;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
export class ExpenseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() businessId: string;
  @ApiProperty() branchId: string;
  @ApiProperty() categoryId: string;
  @ApiProperty({ example: 'EXP-2026-000001' }) expenseNumber: string;
  @ApiProperty({
    example: '25000.00',
    description: 'Exact decimal serialized as a string.',
  })
  amount: string;
  @ApiProperty({ example: '2026-10-08' }) expenseDate: string;
  @ApiProperty({ enum: ExpensePaymentMethod })
  paymentMethod: ExpensePaymentMethod;
  @ApiPropertyOptional({ nullable: true }) vendorName: string | null;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiPropertyOptional({ nullable: true }) receiptUrl: string | null;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ example: { id: 'uuid', name: 'Business', code: 'BUS01' } })
  business: object;
  @ApiProperty({ example: { id: 'uuid', name: 'Branch', code: 'BR01' } })
  branch: object;
  @ApiProperty({
    example: { id: 'uuid', name: 'Electricity', parentId: 'uuid' },
  })
  category: object;
  @ApiProperty({
    example: { id: 'uuid', firstName: 'Manager', lastName: 'Name' },
  })
  createdByUser: object;
}
export class PaginatedExpensesDto {
  @ApiProperty({ type: [ExpenseResponseDto] }) data: ExpenseResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
export class PaginatedExpenseCategoriesDto {
  @ApiProperty({ type: [ExpenseCategoryResponseDto] })
  data: ExpenseCategoryResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
export class ExpenseSummaryDto {
  @ApiProperty() count: number;
  @ApiProperty({ example: '25000.00' }) amount: string;
  @ApiProperty({
    example: [{ categoryId: 'uuid', count: 1, amount: '25000.00' }],
  })
  byCategory: object[];
  @ApiProperty({
    example: [{ paymentMethod: 'BANK_TRANSFER', count: 1, amount: '25000.00' }],
  })
  byPaymentMethod: object[];
}
