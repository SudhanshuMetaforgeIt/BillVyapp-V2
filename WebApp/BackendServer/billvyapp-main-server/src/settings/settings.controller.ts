import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { MediaUploadResponseDto } from '../media/dto/media-response.dto';
import {
  ActivityQueryDto,
  EmailSettingsResponseDto,
  GeneralSettingsResponseDto,
  IntegrationResponseDto,
  LogRetentionResponseDto,
  LogsQueryDto,
  MessageResponseDto,
  NotificationsSettingsResponseDto,
  PaginatedActivityDto,
  SecuritySettingsResponseDto,
  SystemSettingsResponseDto,
} from './dto/settings-response.dto';
import {
  BrandingUploadDto,
  ConfirmDestructiveDto,
  ConfirmResetDto,
  CreateIntegrationDto,
  TestEmailDto,
  UpdateBrandingSettingsDto,
  UpdateEmailSettingsDto,
  UpdateGeneralSettingsDto,
  UpdateIntegrationDto,
  UpdateLogRetentionDto,
  UpdateMaintenanceSettingsDto,
  UpdateNotificationsSettingsDto,
  UpdatePasswordPolicyDto,
  UpdateSessionSettingsDto,
  UpdateSystemSettingsDto,
} from './dto/settings-write.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ---------------------------------------------------------------- general

  @Get('general')
  @ApiOperation({ summary: 'Get platform general + branding settings' })
  @ApiResponse({ status: 200, type: GeneralSettingsResponseDto })
  getGeneral() {
    return this.settingsService.getGeneral();
  }

  @Patch('general')
  @ApiOperation({ summary: 'Update platform general settings' })
  @ApiResponse({ status: 200, type: GeneralSettingsResponseDto })
  updateGeneral(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateGeneralSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateGeneral(user, dto, requestContext(req));
  }

  // --------------------------------------------------------------- branding

  @Patch('branding')
  @ApiOperation({
    summary: 'Update branding colors and media file references',
  })
  @ApiResponse({ status: 200, type: GeneralSettingsResponseDto })
  updateBranding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBrandingSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateBranding(user, dto, requestContext(req));
  }

  @Post('branding/logo')
  @ApiOperation({
    summary: 'Create a logo MediaFile and private upload URL',
    description:
      'Reuses the Media upload flow. Client PUTs bytes to uploadUrl. Binary is never stored in MySQL.',
  })
  @ApiResponse({ status: 201, type: MediaUploadResponseDto })
  createLogoUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BrandingUploadDto,
    @Req() req: Request,
  ) {
    return this.settingsService.createLogoUpload(
      user,
      dto,
      requestContext(req),
    );
  }

  @Post('branding/favicon')
  @ApiOperation({
    summary: 'Create a favicon MediaFile and private upload URL',
  })
  @ApiResponse({ status: 201, type: MediaUploadResponseDto })
  createFaviconUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BrandingUploadDto,
    @Req() req: Request,
  ) {
    return this.settingsService.createFaviconUpload(
      user,
      dto,
      requestContext(req),
    );
  }

  // ------------------------------------------------------------ maintenance

  @Patch('maintenance')
  @ApiOperation({ summary: 'Enable or disable maintenance mode' })
  @ApiResponse({ status: 200, type: GeneralSettingsResponseDto })
  updateMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMaintenanceSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateMaintenance(
      user,
      dto,
      requestContext(req),
    );
  }

  // --------------------------------------------------------------- security

  @Get('security')
  @ApiOperation({ summary: 'Get password policy and session settings' })
  @ApiResponse({ status: 200, type: SecuritySettingsResponseDto })
  getSecurity() {
    return this.settingsService.getSecurity();
  }

  @Patch('security/password-policy')
  @ApiOperation({ summary: 'Update password policy' })
  @ApiResponse({ status: 200, type: SecuritySettingsResponseDto })
  updatePasswordPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePasswordPolicyDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updatePasswordPolicy(
      user,
      dto,
      requestContext(req),
    );
  }

  @Patch('security/session')
  @ApiOperation({ summary: 'Update session timeout and lockout settings' })
  @ApiResponse({ status: 200, type: SecuritySettingsResponseDto })
  updateSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSessionSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateSession(user, dto, requestContext(req));
  }

  // ---------------------------------------------------------- log retention

  @Get('logs/retention')
  @ApiOperation({ summary: 'Get audit / system log retention policy' })
  @ApiResponse({ status: 200, type: LogRetentionResponseDto })
  getLogRetention() {
    return this.settingsService.getLogRetention();
  }

  @Patch('logs/retention')
  @ApiOperation({ summary: 'Update audit / system log retention policy' })
  @ApiResponse({ status: 200, type: LogRetentionResponseDto })
  updateLogRetention(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateLogRetentionDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateLogRetention(
      user,
      dto,
      requestContext(req),
    );
  }

  @Get('logs')
  @ApiOperation({
    summary: 'List system-related audit log entries',
    description:
      'Returns settings, integration, and media audit events (not application stdout).',
  })
  @ApiResponse({ status: 200, type: PaginatedActivityDto })
  listLogs(@Query() query: LogsQueryDto) {
    return this.settingsService.listSystemLogs(query);
  }

  // ------------------------------------------------------------ destructive

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear application cache keys in Redis',
    description:
      'Requires confirm=true. Only deletes keys under cache: and settings:cache: prefixes — OTP keys are preserved.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  clearCache(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmDestructiveDto,
    @Req() req: Request,
  ) {
    return this.settingsService.clearCache(user, dto, requestContext(req));
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset platform settings to defaults',
    description:
      'Requires confirm=true and confirmationPhrase=RESET. Does not delete integrations or media objects.',
  })
  @ApiResponse({ status: 200, type: GeneralSettingsResponseDto })
  resetSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmResetDto,
    @Req() req: Request,
  ) {
    return this.settingsService.resetSettings(user, dto, requestContext(req));
  }

  // ------------------------------------------------------------------ email

  @Get('email')
  @ApiOperation({
    summary: 'Get SMTP settings',
    description: 'Never returns smtpPassword — only smtpPasswordSet.',
  })
  @ApiResponse({ status: 200, type: EmailSettingsResponseDto })
  getEmail() {
    return this.settingsService.getEmail();
  }

  @Patch('email')
  @ApiOperation({ summary: 'Update SMTP settings' })
  @ApiResponse({ status: 200, type: EmailSettingsResponseDto })
  updateEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEmailSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateEmail(user, dto, requestContext(req));
  }

  @Post('email/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate SMTP config and record a test-email request',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  testEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: TestEmailDto,
    @Req() req: Request,
  ) {
    return this.settingsService.testEmail(user, dto, requestContext(req));
  }

  // ---------------------------------------------------------- notifications

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification preference defaults' })
  @ApiResponse({ status: 200, type: NotificationsSettingsResponseDto })
  getNotifications() {
    return this.settingsService.getNotifications();
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preference defaults' })
  @ApiResponse({ status: 200, type: NotificationsSettingsResponseDto })
  updateNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationsSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateNotifications(
      user,
      dto,
      requestContext(req),
    );
  }

  // ------------------------------------------------------------------ system

  @Get('system')
  @ApiOperation({ summary: 'Get system configuration flags' })
  @ApiResponse({ status: 200, type: SystemSettingsResponseDto })
  getSystem() {
    return this.settingsService.getSystem();
  }

  @Patch('system')
  @ApiOperation({ summary: 'Update system configuration flags' })
  @ApiResponse({ status: 200, type: SystemSettingsResponseDto })
  updateSystem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSystemSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateSystem(user, dto, requestContext(req));
  }

  // ----------------------------------------------------------- integrations

  @Get('integrations')
  @ApiOperation({
    summary: 'List platform integrations',
    description: 'Secret config keys are redacted.',
  })
  @ApiResponse({ status: 200, type: [IntegrationResponseDto] })
  listIntegrations() {
    return this.settingsService.listIntegrations();
  }

  @Post('integrations')
  @ApiOperation({ summary: 'Create a platform integration' })
  @ApiResponse({ status: 201, type: IntegrationResponseDto })
  createIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIntegrationDto,
    @Req() req: Request,
  ) {
    return this.settingsService.createIntegration(
      user,
      dto,
      requestContext(req),
    );
  }

  @Patch('integrations/:id')
  @ApiOperation({ summary: 'Update a platform integration' })
  @ApiResponse({ status: 200, type: IntegrationResponseDto })
  updateIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationDto,
    @Req() req: Request,
  ) {
    return this.settingsService.updateIntegration(
      user,
      id,
      dto,
      requestContext(req),
    );
  }

  @Delete('integrations/:id')
  @ApiOperation({ summary: 'Delete a platform integration' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.settingsService.deleteIntegration(
      user,
      id,
      requestContext(req),
    );
  }

  // -------------------------------------------------------------- activity

  @Get('activity')
  @ApiOperation({ summary: 'List platform audit activity' })
  @ApiResponse({ status: 200, type: PaginatedActivityDto })
  listActivity(@Query() query: ActivityQueryDto) {
    return this.settingsService.listActivity(query);
  }
}
