import { ConfigService } from '@nestjs/config';
import { SparklebotService } from './sparklebot.service';
import { sparklebotSettings } from './sparklebot.config';

const settings = {
  WHATSAPP_ENABLED: 'true',
  WHATSAPP_PROVIDER: 'sparklebot',
  WHATSAPP_TENANT_SUBDOMAIN: 'test-tenant',
  WHATSAPP_ACCESS_TOKEN: 'test-secret',
  WHATSAPP_OTP_TEMPLATE_NAME: 'test_otp',
  WHATSAPP_OTP_TEMPLATE_LANGUAGE: 'en_IN',
  WHATSAPP_TEMPLATE_LANGUAGE: 'en_IN',
  LOGIN_OTP_RETURN_IN_RESPONSE: 'false',
};
const config = (values: Record<string, unknown>) =>
  ({ get: (key: string) => values[key] }) as ConfigService;

describe('Sparklebot delivery', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends OTP to the tenant with country code and one ordered body field', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { message_id: 'wamid.test' },
        }),
        { status: 200 },
      ),
    );
    await new SparklebotService(config(settings)).sendOtp(
      '+919876543210',
      '123456',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sparklebot.in/api/v1/test-tenant/messages/template',
      expect.objectContaining({
        redirect: 'error',
        headers: {
          Authorization: 'Bearer test-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: '919876543210',
          template_name: 'test_otp',
          template_language: 'en_IN',
          field_1: '123456',
        }),
      }),
    );
  });

  it('never contacts the provider when disabled', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(
      new SparklebotService(
        config({ ...settings, WHATSAPP_ENABLED: 'false' }),
      ).sendOtp('+919876543210', '123456'),
    ).rejects.toThrow('disabled');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    new Response('test-secret 123456', { status: 401 }),
    new Response(
      JSON.stringify({ success: false, message: 'test-secret 123456' }),
      { status: 200 },
    ),
    new Response(
      JSON.stringify({
        status: 'success',
        data: { whatsapp_response: { error: { code: 100 } } },
      }),
      { status: 200 },
    ),
  ])('requires acceptance and hides raw provider errors', async (response) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    await expect(
      new SparklebotService(config(settings)).sendOtp(
        '+919876543210',
        '123456',
      ),
    ).rejects.toThrow('WhatsApp message could not be sent. Please try again.');
  });

  it('accepts the live Sparklebot response shape and reads the WhatsApp reference', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            whatsapp_response: { messages: [{ id: 'wamid.live-shape' }] },
          },
        }),
        { status: 200 },
      ),
    );
    await expect(
      new SparklebotService(config(settings)).sendTemplate({
        phone: '+919876543210',
        templateName: 'test_bill',
        bodyFields: ['Test'],
      }),
    ).resolves.toBe('wamid.live-shape');
  });

  it('does not turn confirmed acceptance into a retry when the reference is absent', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {},
        }),
        { status: 200 },
      ),
    );
    await expect(
      new SparklebotService(config(settings)).sendTemplate({
        phone: '+919876543210',
        templateName: 'test_bill',
        bodyFields: ['Test'],
      }),
    ).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redacts network errors and refuses invalid recipients before sending', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('test-secret 123456'));
    const service = new SparklebotService(config(settings));
    await expect(service.sendOtp('+919876543210', '123456')).rejects.toThrow(
      'WhatsApp message could not be sent',
    );
    fetchMock.mockClear();
    await expect(service.sendOtp('not-a-phone', '123456')).rejects.toThrow(
      'Invalid WhatsApp',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('validates credentials, URL format and OTP response policy', () => {
    expect(() =>
      sparklebotSettings({ ...settings, WHATSAPP_ACCESS_TOKEN: '' }),
    ).toThrow('requires tenant');
    expect(() =>
      sparklebotSettings({
        ...settings,
        WHATSAPP_API_BASE_URL:
          '[https://sparklebot.in/api/v1](https://sparklebot.in/api/v1)',
      }),
    ).toThrow('API_BASE_URL');
    expect(() =>
      sparklebotSettings({ ...settings, LOGIN_OTP_RETURN_IN_RESPONSE: 'true' }),
    ).toThrow('RETURN_IN_RESPONSE=false');
    expect(sparklebotSettings(settings).enabled).toBe(true);
  });
});
