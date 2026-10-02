import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { CampaignStatusDto } from './campaign-status.dto';
export class CampaignQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatusDto }) @IsOptional() @IsEnum(CampaignStatusDto) status?: CampaignStatusDto;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() salonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(191) search?: string;
}
