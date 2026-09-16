import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateMediaUploadDto } from './dto/create-media-upload.dto';
import {
  MediaDownloadResponseDto,
  MediaFileResponseDto,
  MediaUploadResponseDto,
} from './dto/media-response.dto';
import { MediaQueryDto } from './dto/media-query.dto';
import { PaginatedMediaDto } from './dto/paginated-media.dto';
import { MediaService } from './media.service';

const MEDIA_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
  RoleCode.CUSTOMER,
] as const;

const WRITE_ROLES = [
  RoleCode.SUPER_ADMIN,
  RoleCode.ADMIN,
  RoleCode.MANAGER,
  RoleCode.STAFF,
] as const;

@ApiTags('Media')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role for this operation' })
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @Roles(...MEDIA_ROLES)
  @ApiOperation({
    summary: 'List media metadata',
    description:
      'Returns object-storage metadata only. Binary files are never stored in MySQL.',
  })
  @ApiResponse({ status: 200, type: PaginatedMediaDto })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: MediaQueryDto) {
    return this.mediaService.list(user, query);
  }

  @Post('upload-url')
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Create media metadata and a private upload URL',
    description:
      'Persists MediaFile metadata, then returns a time-limited upload URL. With STORAGE_PROVIDER=local the URL points at this API (filesystem). With STORAGE_PROVIDER=s3 it is a private-bucket presigned PUT URL. Binary bytes are never stored in MySQL.',
  })
  @ApiResponse({ status: 201, type: MediaUploadResponseDto })
  createUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMediaUploadDto,
    @Req() req: Request,
  ) {
    return this.mediaService.createUpload(user, dto, requestContext(req));
  }

  @Get(':id')
  @Roles(...MEDIA_ROLES)
  @ApiOperation({ summary: 'Get media metadata by id' })
  @ApiResponse({ status: 200, type: MediaFileResponseDto })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mediaService.findOne(user, id);
  }

  @Get(':id/download-url')
  @Roles(...MEDIA_ROLES)
  @ApiOperation({
    summary: 'Create a private presigned download URL',
  })
  @ApiResponse({ status: 200, type: MediaDownloadResponseDto })
  createDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mediaService.createDownloadUrl(user, id);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Delete media object and metadata',
    description:
      'Removes the private object (best effort) and deletes the MediaFile row.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.mediaService.remove(user, id, requestContext(req));
  }
}
