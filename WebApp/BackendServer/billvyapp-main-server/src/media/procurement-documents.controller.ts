import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ProcurementDocumentsService } from './procurement-documents.service';

export class ProcurementDocumentQueryDto {
  @IsOptional()
  @IsUUID()
  salonId?: string;
}
export class UploadProcurementDocumentQueryDto extends ProcurementDocumentQueryDto {
  @IsString()
  @MaxLength(255)
  fileName: string;
}

@ApiTags('Purchase bills')
@ApiBearerAuth()
@Roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.MANAGER)
@Controller('procurement-documents')
export class ProcurementDocumentsController {
  constructor(private readonly documents: ProcurementDocumentsService) {}

  @Get('files/:mediaId/download-url')
  download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
  ) {
    return this.documents.download(user, mediaId);
  }

  @Get(':type/:id')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ProcurementDocumentQueryDto,
  ) {
    return this.documents.list(user, type, id, query.salonId);
  }

  @Post(':type/:id')
  @ApiConsumes(
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: UploadProcurementDocumentQueryDto,
    @Req() req: Request,
  ) {
    return this.documents.upload(
      user,
      type,
      id,
      query.fileName,
      req.headers['content-type'] ?? '',
      req,
      query.salonId,
    );
  }
}
