import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AdminReportQueryDto } from './dto/admin-report-query.dto';
import { AdminReportsService } from './admin-reports.service';
import { XLSX_CONTENT_TYPE } from './admin-report-workbook';

@ApiTags('Franchise Admin Reports')
@ApiBearerAuth()
@Roles(RoleCode.ADMIN)
@Controller('admin-reports')
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  @Get('analytics')
  @Header('Cache-Control', 'private, no-store')
  analytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminReportQueryDto,
  ) {
    return this.reports.analytics(user, query);
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.history(user);
  }

  @Post('generate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() query: AdminReportQueryDto,
  ) {
    return this.reports.generate(user, query);
  }

  @Get(':id/download')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiProduces(XLSX_CONTENT_TYPE)
  @Header('Cache-Control', 'private, no-store')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const file = await this.reports.download(user, id);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );
    res.send(file.body);
  }
}
