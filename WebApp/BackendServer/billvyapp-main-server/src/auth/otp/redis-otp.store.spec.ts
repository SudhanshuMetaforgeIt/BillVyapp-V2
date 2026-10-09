import { RedisOtpStore } from './redis-otp.store';
import { RedisService } from '../../redis/redis.service';

describe('RedisOtpStore', () => {
  const client = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    eval: jest.fn(),
  };
  let store: RedisOtpStore;

  beforeEach(() => {
    jest.resetAllMocks();
    store = new RedisOtpStore({ client } as unknown as RedisService);
  });

  it('writes the hashed OTP to otp:login:{phone}', async () => {
    await store.saveHash('9876543210', 'hash', 300);
    expect(client.set).toHaveBeenCalledWith(
      'otp:login:9876543210',
      'hash',
      'EX',
      300,
    );
  });

  it('increments otp:attempts:{phone} and sets TTL on first increment', async () => {
    client.eval.mockResolvedValue(1);
    await expect(store.incrementAttempts('9876543210', 300)).resolves.toBe(1);
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('INCR'),
      1,
      'otp:attempts:9876543210',
      300,
    );
  });

  it('claims otp:resend:{phone} with NX', async () => {
    client.set.mockResolvedValue('OK');
    await expect(store.acquireResendSlot('9876543210', 60)).resolves.toBe(true);
    expect(client.set).toHaveBeenCalledWith(
      'otp:resend:9876543210',
      '1',
      'EX',
      60,
      'NX',
    );
  });
});
