export function sparklebotSettings(env: Record<string, unknown>) {
  const value = (key: string, fallback = '') => {
    const raw = env[key] ?? fallback;
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw === 'boolean' || typeof raw === 'number')
      return raw.toString();
    throw new Error(`Invalid ${key} configuration`);
  };
  const enabledValue = value('WHATSAPP_ENABLED', 'false');
  if (!['true', 'false'].includes(enabledValue))
    throw new Error('WHATSAPP_ENABLED must be true or false');
  const enabled = enabledValue === 'true';
  const provider = value('WHATSAPP_PROVIDER', 'sparklebot');
  if (provider !== 'sparklebot')
    throw new Error('WHATSAPP_PROVIDER must be sparklebot');
  const baseUrl = value(
    'WHATSAPP_API_BASE_URL',
    'https://sparklebot.in/api/v1',
  ).replace(/\/+$/, '');
  // Keep bearer credentials on the official provider endpoint, without redirects.
  if (baseUrl !== 'https://sparklebot.in/api/v1')
    throw new Error(
      'WHATSAPP_API_BASE_URL must be https://sparklebot.in/api/v1',
    );
  const tenant = value('WHATSAPP_TENANT_SUBDOMAIN');
  const token = value('WHATSAPP_ACCESS_TOKEN');
  const otpTemplate = value('WHATSAPP_OTP_TEMPLATE_NAME');
  const language = value('WHATSAPP_TEMPLATE_LANGUAGE', 'en_IN');
  const otpLanguage = value('WHATSAPP_OTP_TEMPLATE_LANGUAGE', language);
  if (tenant && !/^[a-z0-9][a-z0-9_-]*$/i.test(tenant))
    throw new Error('Invalid WHATSAPP_TENANT_SUBDOMAIN');
  if (otpTemplate && !/^[a-z0-9_]+$/.test(otpTemplate))
    throw new Error('Invalid WHATSAPP_OTP_TEMPLATE_NAME');
  if (![language, otpLanguage].every((v) => /^[a-z]{2}(?:_[A-Z]{2})?$/.test(v)))
    throw new Error('Invalid WhatsApp template language');
  if (value('WHATSAPP_OTP_BODY_FIELD_COUNT', '1') !== '1')
    throw new Error('WHATSAPP_OTP_BODY_FIELD_COUNT must be 1');
  const returnOtp = value('LOGIN_OTP_RETURN_IN_RESPONSE', 'false');
  if (!['true', 'false'].includes(returnOtp))
    throw new Error('LOGIN_OTP_RETURN_IN_RESPONSE must be true or false');
  if (enabled && (!tenant || !token || !otpTemplate))
    throw new Error(
      'WhatsApp requires tenant, access token and approved OTP template name',
    );
  if (enabled && returnOtp === 'true')
    throw new Error(
      'WhatsApp delivery requires LOGIN_OTP_RETURN_IN_RESPONSE=false',
    );
  return {
    enabled,
    provider,
    baseUrl,
    tenant,
    token,
    otpTemplate,
    language,
    otpLanguage,
  };
}

export const SPARKLEBOT_ENV_KEYS = [
  'WHATSAPP_ENABLED',
  'WHATSAPP_PROVIDER',
  'WHATSAPP_API_BASE_URL',
  'WHATSAPP_TENANT_SUBDOMAIN',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_OTP_TEMPLATE_NAME',
  'WHATSAPP_TEMPLATE_LANGUAGE',
  'WHATSAPP_OTP_TEMPLATE_LANGUAGE',
  'WHATSAPP_OTP_BODY_FIELD_COUNT',
  'LOGIN_OTP_RETURN_IN_RESPONSE',
] as const;
