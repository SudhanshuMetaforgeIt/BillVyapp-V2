import { Logger } from '@nestjs/common';
import { RequestValidationPipe } from './common/security/request-validation.pipe';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  allowedBrowserOrigins,
  browserOriginMiddleware,
  isBrowserOriginAllowed,
} from './common/security/browser-origin-policy';
import {
  baselineMiddleware,
  startBaseline,
} from './common/performance/baseline';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Stack traces stay in the server log; the exception filter decides what
    // the client is allowed to see.
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  startBaseline();
  app.use(baselineMiddleware);

  // ---------------------------------------------------------------- security

  app.use(
    helmet({
      // The API serves JSON, not HTML, so the default CSP only gets in the way
      // of Swagger UI. Everything else (HSTS, nosniff, frameguard, etc.) stays on.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // Share the same origin policy for CORS and cookie request verification.
  // Development permits local/LAN IP origins; production uses exact configured origins.
  const production = config.get<string>('nodeEnv') === 'production';
  const origins = allowedBrowserOrigins(
    config.get<string>('cors.origin', '*'),
    production,
  );
  app.use(browserOriginMiddleware(origins, production));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      callback(
        null,
        !origin || isBrowserOriginAllowed(origin, origins, production),
      );
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // -------------------------------------------------------------- validation

  app.useGlobalPipes(new RequestValidationPipe());

  // ------------------------------------------------------------------ routing

  app.setGlobalPrefix('api');

  // ------------------------------------------------------------------ swagger

  if (!production) {
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
      swaggerOptions: { persistAuthorization: false },
    });
  }

  // ----------------------------------------------------------------- listen

  const port = config.get<number>('port', 3000);
  await app.listen(port);

  logger.log(`API      -> http://localhost:${port}/api`);
  logger.log(`Swagger  -> http://localhost:${port}/api/docs`);
  logger.log(`Health   -> http://localhost:${port}/api/health`);
}

void bootstrap();
