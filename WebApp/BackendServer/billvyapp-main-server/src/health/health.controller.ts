import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database connectivity probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is up and MySQL is reachable',
    schema: {
      example: {
        status: 'ok',
        service: 'billvyapp-main-server',
        database: 'connected',
        redis: 'connected',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is up but MySQL or Redis is unreachable',
  })
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.check();

    res.status(
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );

    return result;
  }
}
