import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CampaignsService } from './campaigns.service';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { PublishCampaignDto } from './dto/campaign-status.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
const MANAGE = [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER] as const;
@ApiTags('Campaigns') @ApiBearerAuth() @Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}
  @Get() @Roles(...MANAGE) list(@CurrentUser() user: AuthenticatedUser, @Query() query: CampaignQueryDto) { return this.campaigns.list(user, query); }
  @Post() @Roles(...MANAGE) create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCampaignDto, @Req() req: Request) { return this.campaigns.create(user, dto, requestContext(req)); }
  @Get(':id') @Roles(...MANAGE) findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.campaigns.findOne(user, id); }
  @Patch(':id') @Roles(...MANAGE) update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto, @Req() req: Request) { return this.campaigns.update(user, id, dto, requestContext(req)); }
  @Delete(':id') @Roles(...MANAGE) remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.campaigns.remove(user, id, requestContext(req)); }
  @Post(':id/publish') @Roles(...MANAGE) publish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishCampaignDto, @Req() req: Request) { return this.campaigns.publish(user, id, dto.status, requestContext(req)); }
  @Post(':id/cancel') @Roles(...MANAGE) cancel(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) { return this.campaigns.cancel(user, id, requestContext(req)); }
}
