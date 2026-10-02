import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipSubscription } from '../common/decorators/skip-subscription.decorator';
import { ALL_ROLE_CODES } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { requestContext } from '../common/http/request-context';
import {
  FinalizeProfilePhotoDto,
  InitializeProfilePhotoDto,
  ProfilePhotoResponseDto,
  ProfilePhotoUploadResponseDto,
} from './profile-photo.dto';
import { ProfilePhotosService } from './profile-photos.service';

@ApiTags('Profile photo')
@ApiBearerAuth()
@Roles(...ALL_ROLE_CODES)
@SkipSubscription()
@Controller('auth/me/profile-photo')
export class ProfilePhotosController {
  constructor(private readonly photos: ProfilePhotosService) {}

  @Get()
  @ApiResponse({ status: 200, type: ProfilePhotoResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.photos.get(user);
  }

  @Post('upload-url')
  @ApiOperation({
    summary: 'Initialize your profile photo upload (valid for 15 minutes)',
  })
  @ApiResponse({ status: 201, type: ProfilePhotoUploadResponseDto })
  initialize(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitializeProfilePhotoDto,
  ) {
    return this.photos.initialize(user, dto);
  }

  @Put('uploads/:mediaId')
  @ApiConsumes('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  @ApiOperation({
    summary: 'Upload validated raw image bytes using your bearer token',
  })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Req() req: Request,
  ) {
    return this.photos.upload(
      user,
      mediaId,
      req,
      req.headers['content-type'] ?? '',
    );
  }

  @Post('confirm')
  @ApiResponse({ status: 201, type: ProfilePhotoResponseDto })
  finalize(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FinalizeProfilePhotoDto,
    @Req() req: Request,
  ) {
    return this.photos.finalize(user, dto.mediaId, requestContext(req));
  }

  @Delete()
  @ApiResponse({ status: 200, type: ProfilePhotoResponseDto })
  remove(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.photos.remove(user, requestContext(req));
  }
}

/** Public capability URL for avatar display; only current attached avatars qualify. */
@Controller('media/avatars')
export class ProfileAvatarController {
  constructor(private readonly photos: ProfilePhotosService) {}

  @Get(':mediaId')
  @Public()
  async display(
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const image = await this.photos.readDisplayImage(mediaId, sig);
    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    // Avatar capability URLs are embedded by web/mobile clients on other origins.
    // Override Helmet's same-origin default here, never on private document routes.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(image.bytes);
  }
}
