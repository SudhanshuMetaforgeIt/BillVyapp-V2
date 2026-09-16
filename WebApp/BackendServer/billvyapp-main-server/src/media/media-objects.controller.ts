import { Controller, Get, Header, Put, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { LocalFilesystemStorageProvider } from './storage/local-filesystem-storage.provider';

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
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.localStorage.assertValidSignature('upload', key, exp, sig);
    await this.localStorage.writeObject(key, req);
    res.status(200).json({ ok: true });
  }

  @Get('download')
  @Public()
  @Header('Cache-Control', 'private, no-store')
  download(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ): void {
    this.localStorage.assertValidSignature('download', key, exp, sig);
    const stream = this.localStorage.openReadStream(key);
    stream.pipe(res);
  }
}
