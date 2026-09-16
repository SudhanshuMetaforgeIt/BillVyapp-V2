import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches, ValidateIf } from 'class-validator';

/** Indian mobile number stored on users.phone: 10 digits, no +91. */
export const INDIAN_PHONE_PATTERN = /^[0-9]{10}$/;

const PHONE_DESCRIPTION =
  'Indian mobile number: exactly 10 digits, no +91 prefix, no spaces or symbols.';

/**
 * Shared phone validation. Auth DTOs must use this decorator rather than
 * copying the regex into each controller or DTO.
 */
export function IsIndianMobileNumber() {
  return applyDecorators(
    ApiProperty({
      example: '9876543210',
      description: PHONE_DESCRIPTION,
    }),
    Matches(INDIAN_PHONE_PATTERN, {
      message: 'phone must be exactly 10 digits with no country code',
    }),
  );
}

export function IsOptionalIndianMobileNumber() {
  return applyDecorators(
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
      message: 'phone must be exactly 10 digits with no country code',
    }),
  );
}
