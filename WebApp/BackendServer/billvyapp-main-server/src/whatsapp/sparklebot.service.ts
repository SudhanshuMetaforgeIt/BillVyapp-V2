import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sparklebotSettings, SPARKLEBOT_ENV_KEYS } from './sparklebot.config';

export type WhatsAppTemplateMessage = {
  phone: string;
  templateName: string;
  language?: string;
  bodyFields: string[];
};

@Injectable()
export class SparklebotService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    return sparklebotSettings(
      Object.fromEntries(
        SPARKLEBOT_ENV_KEYS.map((key) => [key, this.config.get(key)]),
      ),
    );
  }

  get enabled() {
    return this.settings().enabled;
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const settings = this.settings();
    await this.sendTemplate({
      phone,
      templateName: settings.otpTemplate,
      language: settings.otpLanguage,
      bodyFields: [code],
    });
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<string | null> {
    const settings = this.settings();
    if (!settings.enabled)
      throw new ServiceUnavailableException('WhatsApp delivery is disabled');
    if (
      !/^\+?[1-9]\d{7,14}$/.test(message.phone) ||
      !/^[a-z0-9_]+$/.test(message.templateName) ||
      !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(message.language ?? settings.language)
    )
      throw new Error('Invalid WhatsApp template message');
    const payload = {
      phone_number: message.phone.replace(/^\+/, ''),
      template_name: message.templateName,
      template_language: message.language ?? settings.language,
      ...Object.fromEntries(
        message.bodyFields.map((field, index) => [`field_${index + 1}`, field]),
      ),
    };
    try {
      const response = await fetch(
        `${settings.baseUrl}/${settings.tenant}/messages/template`,
        {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${settings.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error('Provider rejected request');
      const result = (await response.json()) as {
        success?: boolean;
        status?: string;
        data?: {
          message_id?: string;
          whatsapp_response?: {
            error?: unknown;
            messages?: Array<{ id?: string }>;
          };
        };
      };
      if (
        (result.success !== true && result.status !== 'success') ||
        result.data?.whatsapp_response?.error
      )
        throw new Error('Provider did not confirm acceptance');
      const messageId =
        result.data?.message_id ??
        result.data?.whatsapp_response?.messages?.[0]?.id;
      // A confirmed acceptance must not be retried just because the provider
      // omitted its message reference. Delivery tracking then remains unavailable.
      return typeof messageId === 'string' && messageId ? messageId : null;
    } catch {
      // Provider responses can contain credentials, phone numbers and OTPs.
      // Keep public errors and logs free of raw request/response content.
      throw new ServiceUnavailableException(
        'WhatsApp message could not be sent. Please try again.',
      );
    }
  }
}
