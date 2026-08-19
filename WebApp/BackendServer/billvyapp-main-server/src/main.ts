import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Stack traces stay in the server log; the exception filter decides what
    // the client is allowed to see.
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ---------------------------------------------------------------- security

  app.use(
    helmet({
      // The API serves JSON, not HTML, so the default CSP only gets in the way
      // of Swagger UI. Everything else (HSTS, nosniff, frameguard, etc.) stays on.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    origin: config.get<string>('cors.origin', '*'),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // -------------------------------------------------------------- validation

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ------------------------------------------------------------------ routing

  app.setGlobalPrefix('api');

  // ------------------------------------------------------------------ swagger

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BillVyApp V2 API')
    .setDescription(
      'Salon management backend. Billing documents are "bills" throughout - there is no invoice resource.',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste the accessToken returned by /api/auth/login',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Absolute path: setup() is not affected by setGlobalPrefix.
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ----------------------------------------------------------------- listen

  const port = config.get<number>('port', 3000);
  await app.listen(port);

  logger.log(`API      -> http://localhost:${port}/api`);
  logger.log(`Swagger  -> http://localhost:${port}/api/docs`);
  logger.log(`Health   -> http://localhost:${port}/api/health`);
}

void bootstrap();
