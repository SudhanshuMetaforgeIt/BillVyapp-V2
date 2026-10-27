export function appointmentWhatsAppSettings(env: Record<string, unknown>) {
  const value = (key: string, fallback: string) => {
    const raw = env[key] ?? fallback;
    if (typeof raw === 'string') return raw.trim();
    if (typeof raw === 'boolean' || typeof raw === 'number')
      return raw.toString();
    throw new Error(`Invalid ${key} configuration`);
  };
  const enabled = value('WHATSAPP_APPOINTMENTS_ENABLED', 'false');
  if (!['true', 'false'].includes(enabled))
    throw new Error('WHATSAPP_APPOINTMENTS_ENABLED must be true or false');
  const bookedTemplate = value(
    'WHATSAPP_APPOINTMENT_BOOKED_TEMPLATE_NAME',
    'billvy_group_appointment_booked',
  );
  const statusTemplate = value(
    'WHATSAPP_APPOINTMENT_STATUS_TEMPLATE_NAME',
    'billvy_group_appointment_status_update',
  );
  const language = value('WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE', 'en_IN');
  if (
    ![bookedTemplate, statusTemplate].every((name) =>
      /^[a-z0-9_]{1,100}$/.test(name),
    )
  )
    throw new Error('Invalid appointment WhatsApp template name');
  if (!/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language))
    throw new Error('Invalid appointment WhatsApp template language');
  return {
    enabled: enabled === 'true',
    bookedTemplate,
    statusTemplate,
    language,
  };
}

export const APPOINTMENT_WHATSAPP_ENV_KEYS = [
  'WHATSAPP_APPOINTMENTS_ENABLED',
  'WHATSAPP_APPOINTMENT_BOOKED_TEMPLATE_NAME',
  'WHATSAPP_APPOINTMENT_STATUS_TEMPLATE_NAME',
  'WHATSAPP_APPOINTMENT_TEMPLATE_LANGUAGE',
] as const;
