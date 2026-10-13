import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail, isUUID } from 'class-validator';

export class MailDeliveryError extends Error {
  constructor(
    message: string,
    public readonly retryable = false,
    public readonly uncertain = false,
  ) {
    super(message);
  }
}

@Injectable()
export class GraphMailService {
  private token?: { value: string; expiresAt: number };
  private tokenRequest?: Promise<string>;
  constructor(private readonly config: ConfigService) {}

  get enabled() {
    return this.config.get<string>('MAIL_PROVIDER') === 'graph';
  }
  get deliveryEnabled() {
    return (
      this.enabled &&
      this.config.get<string>('MAIL_DELIVERY_ENABLED') === 'true'
    );
  }
  get sender() {
    return (
      this.config.get<string>('GRAPH_FROM_EMAIL') ??
      this.config.get<string>('MAIL_FROM_EMAIL') ??
      null
    );
  }
  get configured() {
    try {
      this.settings();
      return true;
    } catch {
      return false;
    }
  }

  private settings() {
    const tenant = this.config.get<string>('GRAPH_TENANT_ID') ?? '';
    const client = this.config.get<string>('GRAPH_CLIENT_ID') ?? '';
    const secret = this.config.get<string>('GRAPH_CLIENT_SECRET') ?? '';
    const sender =
      this.config.get<string>('GRAPH_FROM_EMAIL') ??
      this.config.get<string>('MAIL_FROM_EMAIL') ??
      '';
    if (
      !this.enabled ||
      !isUUID(tenant) ||
      !isUUID(client) ||
      !secret ||
      !isEmail(sender)
    )
      throw new MailDeliveryError(
        'Microsoft Graph mail configuration is incomplete',
      );
    return { tenant, client, secret, sender };
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now())
      return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = this.fetchToken();
    try {
      return await this.tokenRequest;
    } finally {
      this.tokenRequest = undefined;
    }
  }

  private async fetchToken(): Promise<string> {
    const { tenant, client, secret } = this.settings();
    let response: Response;
    try {
      response = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          body: new URLSearchParams({
            client_id: client,
            client_secret: secret,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
        },
      );
    } catch {
      throw new MailDeliveryError(
        'Microsoft Graph authentication unavailable',
        true,
      );
    }
    if (!response.ok)
      throw new MailDeliveryError(
        `Microsoft Graph authentication rejected (${response.status})`,
        response.status === 429 || response.status >= 500,
      );
    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (
      !data.access_token ||
      !Number.isFinite(data.expires_in) ||
      Number(data.expires_in) <= 60
    )
      throw new MailDeliveryError(
        'Microsoft Graph returned an invalid authentication response',
      );
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000,
    };
    return data.access_token;
  }

  async send(input: {
    recipient: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.deliveryEnabled)
      throw new MailDeliveryError('Email sending is paused');
    const { sender } = this.settings();
    if (
      !isEmail(input.recipient) ||
      input.recipient.length > 191 ||
      input.subject.length > 255 ||
      Buffer.byteLength(input.html) > 1000000
    )
      throw new MailDeliveryError('Invalid email recipient or message size');
    const token = await this.accessToken();
    let response: Response;
    try {
      response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(20000),
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              subject: input.subject,
              body: { contentType: 'HTML', content: input.html },
              toRecipients: [{ emailAddress: { address: input.recipient } }],
            },
            saveToSentItems: true,
          }),
        },
      );
    } catch {
      throw new MailDeliveryError(
        'Email acceptance is unknown; reconcile before retrying',
        false,
        true,
      );
    }
    if (response.status === 202) return;
    if (response.status === 401) this.token = undefined;
    // Only explicit rejections are retried. A server error may have occurred after acceptance.
    throw new MailDeliveryError(
      `Microsoft Graph rejected email (${response.status})`,
      response.status === 429 || response.status === 401,
      response.status >= 500,
    );
  }
}
