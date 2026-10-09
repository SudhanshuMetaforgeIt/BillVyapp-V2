import { BadRequestException } from '@nestjs/common';
import { RequestValidationPipe } from './request-validation.pipe';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { CustomerQueryDto } from '../../customers/dto/customer-query.dto';
import { UpdateCustomerDto } from '../../customers/dto/update-customer.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { PaginationQueryDto } from '../pagination/pagination-query.dto';
import { CreatePaymentDto } from '../../payments/dto/create-payment.dto';
import { CreateBillDto } from '../../bills/dto/create-bill.dto';

describe('Strict request boundary', () => {
  const pipe = new RequestValidationPipe();
  it.each(['true', 'false', '0', '1', 1, {}, []])(
    'rejects non-boolean body status %p',
    async (value) => {
      await expect(
        pipe.transform(
          { isActive: value },
          { type: 'body', metatype: UpdateStatusDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('preserves a real false body value and converts supported query booleans explicitly', async () => {
    await expect(
      pipe.transform(
        { isActive: false },
        { type: 'body', metatype: UpdateStatusDto },
      ),
    ).resolves.toMatchObject({ isActive: false });
    await expect(
      pipe.transform(
        { isActive: 'false', page: '2' },
        { type: 'query', metatype: CustomerQueryDto },
      ),
    ).resolves.toMatchObject({ isActive: false, page: 2 });
    await expect(
      pipe.transform(
        { isActive: 'garbage' },
        { type: 'query', metatype: CustomerQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([
    true,
    [],
    ['1'],
    {},
    '',
    '0x20',
    'Infinity',
    'NaN',
    '1e9',
    '-1',
    '1.1',
    '1000001',
  ])('rejects invalid pagination %p', async (page) => {
    await expect(
      pipe.transform({ page }, { type: 'query', metatype: PaginationQueryDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([
    'roleId',
    'userId',
    'salonId',
    'franchiseId',
    'passwordHash',
    'isActive',
    'subscriptionStatus',
  ])('rejects customer mass assignment %s', async (key) => {
    await expect(
      pipe.transform(
        { [key]: 'attacker' },
        { type: 'body', metatype: UpdateCustomerDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects account credential writes and nested bill fields', async () => {
    await expect(
      pipe.transform(
        { passwordHash: 'attacker' },
        { type: 'body', metatype: UpdateUserDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        {
          idempotencyKey: 'bill-12345',
          customerId: '11111111-1111-4111-8111-111111111111',
          items: [
            {
              itemType: 'SERVICE',
              serviceId: '22222222-2222-4222-8222-222222222222',
              quantity: 1,
              ownerId: 'attacker',
            },
          ],
        },
        { type: 'body', metatype: CreateBillDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects coerced payment amounts', async () => {
    await expect(
      pipe.transform(
        {
          idempotencyKey: 'payment-12345',
          billId: '11111111-1111-4111-8111-111111111111',
          amount: true,
          paymentMethod: 'CASH',
        },
        { type: 'body', metatype: CreatePaymentDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([
    JSON.parse('{"__proto__":{"admin":true}}'),
    { config: { password: 'a'.repeat(8193) } },
    { config: Array(1001).fill(1) },
    {
      config: Object.fromEntries(
        Array.from({ length: 201 }, (_, n) => [String(n), true]),
      ),
    },
  ])('bounds free-form values and prototype properties', async (input) => {
    await expect(
      pipe.transform(input, { type: 'body', metatype: Object }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects excessive nesting', async () => {
    let value: unknown = 'end';
    for (let i = 0; i < 14; i++) value = { nested: value };
    await expect(
      pipe.transform(value, { type: 'body', metatype: Object }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
