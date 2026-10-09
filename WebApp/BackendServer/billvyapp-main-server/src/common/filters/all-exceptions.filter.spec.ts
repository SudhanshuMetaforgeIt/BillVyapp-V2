import {
  ArgumentsHost,
  InternalServerErrorException,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
jest.mock('../../generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {},
    PrismaClientValidationError: class extends Error {},
  },
}));

describe('Public API error confidentiality', () => {
  const send = (exception: unknown) => {
    const json = jest.fn(),
      status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'GET',
          url: '/api/private?sig=secret&password=private',
        }),
      }),
    };
    new AllExceptionsFilter().catch(
      exception,
      host as unknown as ArgumentsHost,
    );
    const calls = json.mock.calls as unknown[][];
    return calls[0][0] as { message: string; path: string };
  };
  afterEach(() => jest.restoreAllMocks());
  it.each([
    new Error('SELECT passwordHash FROM users token=secret'),
    new InternalServerErrorException('mysql://root:secret@db/private'),
    new ServiceUnavailableException('Private SMTP password'),
  ])('redacts server exception details and query credentials', (exception) => {
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const body = send(exception);
    expect(JSON.stringify(body)).not.toMatch(
      /password|SELECT|mysql:|SMTP|secret/,
    );
    expect(body.path).toBe('/api/private');
    expect(JSON.stringify(error.mock.calls)).not.toMatch(
      /password|SELECT|mysql:|SMTP|secret/,
    );
  });
  it('preserves actionable validation errors without echoing query credentials', () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    expect(send(new BadRequestException('Invalid quantity')).message).toBe(
      'Invalid quantity',
    );
  });
  it('maps parser rejection without echoing raw request content', () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    expect(send({ type: 'entity.too.large', body: 'private' }).message).toBe(
      'Request body is too large',
    );
    expect(
      send({ type: 'entity.parse.failed', body: 'password=private' }).message,
    ).toBe('Invalid JSON request body');
  });
});
