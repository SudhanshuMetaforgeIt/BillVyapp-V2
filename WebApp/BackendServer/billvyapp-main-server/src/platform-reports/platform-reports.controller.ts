import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { requestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { GeneratePlatformReportDto } from './dto/generate-platform-report.dto';
import { ListPlatformReportsQueryDto } from './dto/list-platform-reports-query.dto';
import { PaginatedPlatformReportsDto } from './dto/paginated-platform-reports.dto';
import { PlatformReportResponseDto } from './dto/platform-report-response.dto';
import { PlatformReportsService } from './platform-reports.service';

@ApiTags('Platform Reports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Roles(RoleCode.SUPER_ADMIN)
@Controller('platform-reports')
export class PlatformReportsController {
  constructor(private readonly platformReportsService: PlatformReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List generated platform reports' })
  @ApiResponse({ status: 200, type: PaginatedPlatformReportsDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPlatformReportsQueryDto,
  ) {
    return this.platformReportsService.list(user, query);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate a platform report snapshot',
    description:
      'Aggregates live metrics for the date range (and optional franchise), persists a snapshot, and returns the report row. Downloads are CSV in v1 regardless of format.',
  })
  @ApiResponse({ status: 201, type: PlatformReportResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid dates or franchise' })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneratePlatformReportDto,
    @Req() req: Request,
  ) {
    return this.platformReportsService.generate(
      user,
      dto,
      requestContext(req),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a platform report by id' })
  @ApiResponse({ status: 200, type: PlatformReportResponseDto })
  @ApiResponse({ status: 404, description: 'Platform report not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.platformReportsService.findOne(user, id);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download a platform report as CSV',
    description: 'Always returns text/csv in v1 (even when format is pdf).',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'CSV attachment' })
  @ApiResponse({ status: 404, description: 'Platform report not found' })
  @Header('Cache-Control', 'private, no-store')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.platformReportsService.download(user, id);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName.replace(/"/g, '')}"`,
    );
    res.send(file.body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a generated platform report' })
  @ApiResponse({ status: 200, description: 'Deleted report id' })
  @ApiResponse({ status: 404, description: 'Platform report not found' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.platformReportsService.remove(user, id, requestContext(req));
  }
}
