import { Controller, Get, Header, Put, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { LocalFilesystemStorageProvider } from './storage/local-filesystem-storage.provider';
import { SignedObjectQueryDto } from './dto/signed-object-query.dto';

/**
 * Signed local-upload/download endpoints used when STORAGE_PROVIDER=local.
 * Auth is the HMAC query signature, not JWT — mirrors private-bucket URLs.
 */
@ApiExcludeController()
@Controller('media/objects')
export class MediaObjectsController {
  constructor(private readonly localStorage: LocalFilesystemStorageProvider) {}

  @Put('upload')
  @Public()
  async upload(
    @Query() query: SignedObjectQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.localStorage.assertValidSignature(
      'upload',
      query.key,
      query.exp,
      query.sig,
    );
    await this.localStorage.writeObject(query.key, req);
    res.status(200).json({ ok: true });
  }

  @Get('download')
  @Public()
  @Header('Cache-Control', 'private, no-store')
  download(@Query() query: SignedObjectQueryDto, @Res() res: Response): void {
    this.localStorage.assertValidSignature(
      'download',
      query.key,
      query.exp,
      query.sig,
    );
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    const stream = this.localStorage.openReadStream(query.key);
    stream.once('error', () => res.destroy());
    stream.pipe(res);
  }
}
