import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
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
import { CreateSalonPhotoDto } from './dto/create-salon-photo.dto';
import { CreateSalonPhotoUploadDto } from './dto/create-salon-photo-upload.dto';
import { SalonPhotoResponseDto } from './dto/salon-photo-response.dto';
import { SalonPhotoUploadResponseDto } from './dto/salon-photo-upload-response.dto';
import { UpdateSalonPhotoDto } from './dto/update-salon-photo.dto';
import { UploadSalonPhotoDto } from './dto/upload-salon-photo.dto';
import { SalonPhotosService } from './salon-photos.service';

const READ_ROLES = [
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
] as const;

@ApiTags('Salon photos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Insufficient role or salon scope' })
@Controller('salons/:salonId/photos')
export class SalonPhotosController {
  constructor(private readonly photos: SalonPhotosService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List public, mobile-optimized salon images' })
  @ApiResponse({ status: 200, type: [SalonPhotoResponseDto] })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
  ) {
    return this.photos.list(user, salonId);
  }

  @Post('upload-url')
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Create a signed direct-upload request for a public salon image',
    description:
      'POST a multipart form to uploadUrl containing uploadFields plus file. This path is only for public salon imagery, never bills or private documents.',
  })
  @ApiResponse({ status: 201, type: SalonPhotoUploadResponseDto })
  createUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateSalonPhotoUploadDto,
  ) {
    return this.photos.createUpload(user, salonId, dto);
  }

  @Post('upload')
  @Roles(...WRITE_ROLES)
  @ApiConsumes('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  @ApiOperation({
    summary:
      'Upload or replace a public salon image through the authenticated API',
  })
  @ApiResponse({ status: 201, type: SalonPhotoResponseDto })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Query() dto: UploadSalonPhotoDto,
    @Req() req: Request,
  ) {
    return this.photos.upload(
      user,
      salonId,
      dto,
      req,
      req.headers['content-type'] ?? '',
      requestContext(req),
    );
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOperation({
    summary: 'Verify an uploaded salon image and persist its metadata',
    description:
      'Set isPrimary=true to make this the cover image. All other photos are gallery images ordered by displayOrder.',
  })
  @ApiResponse({ status: 201, type: SalonPhotoResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Body() dto: CreateSalonPhotoDto,
    @Req() req: Request,
  ) {
    return this.photos.create(user, salonId, dto, requestContext(req));
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiResponse({ status: 200, type: SalonPhotoResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalonPhotoDto,
    @Req() req: Request,
  ) {
    return this.photos.update(user, salonId, id, dto, requestContext(req));
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salonId', ParseUUIDPipe) salonId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.photos.remove(user, salonId, id, requestContext(req));
  }
}
