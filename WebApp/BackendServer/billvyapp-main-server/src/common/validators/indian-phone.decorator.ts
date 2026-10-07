import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

/** Local input or canonical international number. Services resolve the country. */
export const INDIAN_PHONE_PATTERN = /^(?:[0-9]{10}|\+[1-9][0-9]{7,14})$/;

const PHONE_DESCRIPTION =
  '10 local digits (franchise calling code added automatically), or an international number including +country code.';

/**
 * Shared phone validation. Auth DTOs must use this decorator rather than
 * copying the regex into each controller or DTO.
 */
export function IsIndianMobileNumber() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().replace(/[\s().-]/g, '') : value,
    ),
    ApiProperty({
      example: '9876543210',
      description: PHONE_DESCRIPTION,
    }),
    Matches(INDIAN_PHONE_PATTERN, {
      message:
        'phone must contain 10 local digits or a valid international number',
    }),
  );
}

export function IsOptionalIndianMobileNumber() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().replace(/[\s().-]/g, '') : value,
    ),
    ApiPropertyOptional({
      example: '9876543210',
      nullable: true,
      description: PHONE_DESCRIPTION,
    }),
    IsOptional(),
    ValidateIf(
      (_, value) => value !== null && value !== undefined && value !== '',
    ),
    Matches(INDIAN_PHONE_PATTERN, {
      message:
        'phone must contain 10 local digits or a valid international number',
    }),
  );
}
