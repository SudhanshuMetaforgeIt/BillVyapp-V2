import { ServiceUnavailableException } from '@nestjs/common';

const PUBLIC_MESSAGES = {
  NOT_CONFIGURED:
    'PDF scanning is not configured. Please contact your administrator.',
  UNAVAILABLE:
    'The PDF scanner is unavailable. Please contact your administrator.',
  TIMED_OUT: 'The PDF scan timed out. Please try again.',
  FAILED:
    'The PDF scan could not be completed. Please try again or contact your administrator.',
} as const;

/** Only fixed, safe messages are allowed through the public exception filter. */
export class FileScannerUnavailableException extends ServiceUnavailableException {
  readonly publicMessage: string;

  constructor(reason: keyof typeof PUBLIC_MESSAGES) {
    super(PUBLIC_MESSAGES[reason]);
    this.publicMessage = PUBLIC_MESSAGES[reason];
  }
}
