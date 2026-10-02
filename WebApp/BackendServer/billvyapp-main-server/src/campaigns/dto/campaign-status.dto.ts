import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
export enum CampaignStatusDto { DRAFT = 'DRAFT', SCHEDULED = 'SCHEDULED', ACTIVE = 'ACTIVE', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }
export class PublishCampaignDto { @ApiProperty({ enum: ['SCHEDULED', 'ACTIVE'] }) @IsEnum({ SCHEDULED: 'SCHEDULED', ACTIVE: 'ACTIVE' }) status: 'SCHEDULED' | 'ACTIVE'; }
