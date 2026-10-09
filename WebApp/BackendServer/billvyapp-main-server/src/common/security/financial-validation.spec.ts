import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateBillDto } from '../../bills/dto/create-bill.dto';
import { CreatePaymentDto } from '../../payments/dto/create-payment.dto';

describe('Financial API input boundary', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const bill = {
    idempotencyKey: 'bill-request-123',
    salonId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    items: [
      {
        itemType: 'SERVICE',
        serviceId: '33333333-3333-4333-8333-333333333333',
        quantity: 1,
      },
    ],
  };
  const payment = {
    idempotencyKey: 'payment-request-123',
    billId: '11111111-1111-4111-8111-111111111111',
    amount: 10,
    paymentMethod: 'CARD',
  };
  it.each(['total', 'subtotal', 'paidAmount', 'dueAmount', 'currency'])(
    'rejects browser-controlled bill %s',
    async (field) => {
      await expect(
        pipe.transform(
          { ...bill, [field]: 0 },
          { type: 'body', metatype: CreateBillDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it.each(['cvv', 'cardNumber', 'provider', 'providerTransactionId'])(
    'rejects unsupported payment field %s',
    async (field) => {
      await expect(
        pipe.transform(
          { ...payment, [field]: 'untrusted' },
          { type: 'body', metatype: CreatePaymentDto },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
  it('rejects gateway claims and accepts the explicit counter-payment contract', async () => {
    await expect(
      pipe.transform(
        { ...payment, source: 'GATEWAY', status: 'SUCCESS' },
        { type: 'body', metatype: CreatePaymentDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        { ...payment, source: 'MANUAL', currency: 'INR' },
        { type: 'body', metatype: CreatePaymentDto },
      ),
    ).resolves.toBeInstanceOf(CreatePaymentDto);
  });
});
