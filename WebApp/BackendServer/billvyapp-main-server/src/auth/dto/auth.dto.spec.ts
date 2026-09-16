import { validate } from 'class-validator';
import { SendOtpDto } from './send-otp.dto';
import { VerifyOtpDto } from './verify-otp.dto';

describe('auth DTOs', () => {
  describe('SendOtpDto phone validation', () => {
    async function errorsFor(phone: string) {
      const dto = Object.assign(new SendOtpDto(), { phone });
      return validate(dto);
    }

    it('accepts a 10-digit Indian number', async () => {
      expect(await errorsFor('9876543210')).toHaveLength(0);
    });

    it.each([
      '+919876543210',
      '919876543210',
      '98765',
      '98765432101',
      'abcdefghij',
    ])('rejects %s', async (phone) => {
      expect(await errorsFor(phone)).not.toHaveLength(0);
    });
  });

  describe('VerifyOtpDto', () => {
    it('requires a 6-digit otp', async () => {
      const dto = Object.assign(new VerifyOtpDto(), {
        phone: '9876543210',
        otp: '48291',
      });
      expect(await validate(dto)).not.toHaveLength(0);
    });

    it('accepts a valid phone and otp', async () => {
      const dto = Object.assign(new VerifyOtpDto(), {
        phone: '9876543210',
        otp: '482913',
      });
      expect(await validate(dto)).toHaveLength(0);
    });
  });
});
