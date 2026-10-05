import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export enum CampaignTypeDto { SALON = 'SALON', SERVICE = 'SERVICE', OFFER = 'OFFER', EVENT = 'EVENT' }
export enum CampaignTargetAudienceDto { ALL_CUSTOMERS = 'ALL_CUSTOMERS', NEW_CUSTOMERS = 'NEW_CUSTOMERS', EXISTING_CUSTOMERS = 'EXISTING_CUSTOMERS', SALON_CUSTOMERS = 'SALON_CUSTOMERS' }
export enum CampaignDeliveryChannelDto { PUSH = 'PUSH', IN_APP = 'IN_APP' }

export class CreateCampaignDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() salonId: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(191) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiProperty({ enum: CampaignTypeDto }) @IsEnum(CampaignTypeDto) type: CampaignTypeDto;
  @ApiProperty({ enum: CampaignTargetAudienceDto }) @IsEnum(CampaignTargetAudienceDto) targetAudience: CampaignTargetAudienceDto;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @ValidateIf((o) => o.startDate != null) @Type(() => Date) @IsDate() startDate?: Date | null;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @ValidateIf((o) => o.endDate != null) @Type(() => Date) @IsDate() endDate?: Date | null;
  @ApiPropertyOptional() @IsOptional() @IsString() offerDescription?: string | null;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() promotionalMediaFileId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string | null;
  @ApiProperty({ enum: CampaignDeliveryChannelDto, isArray: true }) @IsArray() @ArrayMinSize(1) @IsEnum(CampaignDeliveryChannelDto, { each: true }) deliveryChannels: CampaignDeliveryChannelDto[];
}
