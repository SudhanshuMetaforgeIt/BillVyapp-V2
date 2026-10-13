import { ConfigService } from '@nestjs/config';
import { GraphMailService, MailDeliveryError } from './graph-mail.service';

describe('Graph mail transport', () => {
  const settings = {
    MAIL_DELIVERY_ENABLED: 'true',
    MAIL_PROVIDER: 'graph',
    GRAPH_TENANT_ID: 'c720d8bf-7e4f-4ab6-9e14-e71acd886b13',
    GRAPH_CLIENT_ID: '45eda2e9-2e42-4c6d-8a0d-92fe976f47c0',
    GRAPH_CLIENT_SECRET: 'test-secret',
    GRAPH_FROM_EMAIL: 'sender@example.com',
  };
  const message = {
    recipient: 'customer@example.com',
    subject: 'Bill',
    html: '<p>Receipt</p>',
  };
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let service: GraphMailService;
  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    service = new GraphMailService(new ConfigService(settings));
  });
  afterEach(() => jest.restoreAllMocks());
  const token = () =>
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'test-token', expires_in: 3600 }),
        { status: 200 },
      ),
    );
  it('uses app-only authentication, the configured mailbox and caches the token', async () => {
    token();
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    await service.send(message);
    await service.send(message);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const auth = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(auth.get('scope')).toBe('https://graph.microsoft.com/.default');
    expect(auth.get('grant_type')).toBe('client_credentials');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://graph.microsoft.com/v1.0/users/sender%40example.com/sendMail',
    );
    const payload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string) as {
      message: { toRecipients: unknown; body: unknown };
      saveToSentItems: boolean;
    };
    expect(payload.message.toRecipients).toEqual([
      { emailAddress: { address: message.recipient } },
    ]);
    expect(payload.saveToSentItems).toBe(true);
  });
  it('rejects invalid recipients before authenticating', async () => {
    await expect(
      service.send({ ...message, recipient: 'not-an-email' }),
    ).rejects.toThrow('Invalid email');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not include provider error payloads or secrets in errors', async () => {
    fetchMock.mockResolvedValue(
      new Response('private-secret-provider-details', { status: 400 }),
    );
    await expect(service.send(message)).rejects.toThrow(
      'authentication rejected (400)',
    );
  });
  it.each([429, 401])(
    'permits retry after explicit rejection %s',
    async (status) => {
      token();
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));
      await expect(service.send(message)).rejects.toMatchObject({
        retryable: true,
        uncertain: false,
      });
    },
  );
  it.each([500, 503])(
    'quarantines ambiguous server rejection %s',
    async (status) => {
      token();
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));
      await expect(service.send(message)).rejects.toMatchObject({
        retryable: false,
        uncertain: true,
      });
    },
  );
  it('quarantines send timeouts rather than blindly retrying', async () => {
    token();
    fetchMock.mockRejectedValueOnce(new Error('network timeout with secret'));
    await expect(service.send(message)).rejects.toMatchObject({
      uncertain: true,
      message: 'Email acceptance is unknown; reconcile before retrying',
    });
  });
  it('refuses unconfigured mail without exposing configuration', async () => {
    service = new GraphMailService(
      new ConfigService({ MAIL_PROVIDER: 'graph' }),
    );
    await expect(service.send(message)).rejects.toBeInstanceOf(
      MailDeliveryError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
