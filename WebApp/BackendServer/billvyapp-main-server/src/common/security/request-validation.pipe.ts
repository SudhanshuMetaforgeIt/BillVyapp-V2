import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';

/** Explicit DTO conversions only; bound even free-form JSON configuration. */
export class RequestValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    });
  }

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown> {
    if (['body', 'query', 'param'].includes(metadata.type)) inspectInput(value);
    return super.transform(value, metadata);
  }
}

function inspectInput(value: unknown, depth = 0): void {
  if (depth > 12)
    throw new BadRequestException('Request nesting exceeds the allowed limit');
  if (
    typeof value === 'string' &&
    (value.length > 8192 || value.includes('\0'))
  )
    throw new BadRequestException(
      'Request string exceeds the allowed limit or contains invalid characters',
    );
  if (Array.isArray(value)) {
    if (value.length > 1000)
      throw new BadRequestException('Request array exceeds the allowed limit');
    for (const entry of value) inspectInput(entry, depth + 1);
  } else if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 200)
      throw new BadRequestException('Request object exceeds the allowed limit');
    for (const [key, entry] of entries) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new BadRequestException('Invalid request property');
      inspectInput(entry, depth + 1);
    }
  }
}
