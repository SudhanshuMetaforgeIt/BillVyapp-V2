import { validate } from 'class-validator';
import { RegisterCustomerDto } from './register-customer.dto';
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

  describe('RegisterCustomerDto', () => {
    it('accepts a valid customer registration payload', async () => {
      const dto = Object.assign(new RegisterCustomerDto(), {
        firstName: 'Riya',
        lastName: 'Kapoor',
        email: 'riya@example.com',
        phone: '9876543210',
        password: 'Password1',
      });
      expect(await validate(dto)).toHaveLength(0);
    });

    it('rejects a short password', async () => {
      const dto = Object.assign(new RegisterCustomerDto(), {
        firstName: 'Riya',
        lastName: 'Kapoor',
        email: 'riya@example.com',
        phone: '9876543210',
        password: 'short',
      });
      expect(await validate(dto)).not.toHaveLength(0);
    });

    it('does not declare role or scope fields on the DTO prototype', () => {
      const dto = new RegisterCustomerDto();
      expect(dto).not.toHaveProperty('role');
      expect(dto).not.toHaveProperty('roleId');
      expect(dto).not.toHaveProperty('franchiseId');
      expect(dto).not.toHaveProperty('salonId');
    });
  });
});
