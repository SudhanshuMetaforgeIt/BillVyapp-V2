import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';

export class BillDocumentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() billId: string;
  @ApiProperty() storageKey: string;
  @ApiProperty() fileName: string;
  @ApiPropertyOptional({ nullable: true }) fileUrl: string | null;
  @ApiProperty() mimeType: string;
  @ApiProperty() fileSize: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedBillDocumentsDto {
  @ApiProperty({ type: [BillDocumentResponseDto] })
  data: BillDocumentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
