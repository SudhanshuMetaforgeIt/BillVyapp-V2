// Read-only provider check. Never print tokens, message payloads or response bodies.
const expected = [
  'billvy_v2_login_otp', 'billvy_v2_bill_confirmation',
  'billvy_v2_membership_activated', 'billvy_v2_appointment_confirmation',
  'billvy_v2_appointment_reminder', 'billvy_v2_membership_expiry',
];
async function main() {
  const base = (process.env.WHATSAPP_API_BASE_URL || '').replace(/\/+$/, '');
  const tenant = process.env.WHATSAPP_TENANT_SUBDOMAIN || '';
  if (base !== 'https://sparklebot.in/api/v1' || !/^[a-z0-9_-]+$/i.test(tenant)) throw new Error('Invalid provider configuration');
  if (!process.env.WHATSAPP_ACCESS_TOKEN) throw new Error('Missing provider token');
  const response = await fetch(`${base}/${tenant}/templates`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, Accept: 'application/json' },
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  console.log(`Template listing HTTP ${response.status}`);
  if (!response.ok) { process.exitCode = 1; return; }
  const data = await response.json();
  const found = new Map();
  function buttonTypes(raw) {
    try {
      const buttons = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(buttons) ? buttons.map(button => ({ type: button.type, otpType: button.otp_type })) : [];
    } catch { return []; }
  }
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    const name = value.name || value.template_name;
    if (expected.includes(name)) {
      const components = Array.isArray(value.components) ? value.components : [];
      found.set(name, { name, language: value.language || value.template_language || 'unknown', status: value.status || 'unknown', category: value.category,
        bodyParameterCount: value.body_params_count, headerFormat: value.header_data_format, headerParameterCount: value.header_params_count,
        buttons: buttonTypes(value.buttons_data), hasOtpButtonConfig: Boolean(value.otp_button_config),
        components: components.map(c => ({ type: c.type, bodyVariableCount: typeof c.text === 'string' ? new Set(c.text.match(/\{\{\d+\}\}/g) || []).size : undefined,
          buttonTypes: Array.isArray(c.buttons) ? c.buttons.map(b => b.type) : undefined })) });
    }
    Object.values(value).forEach(walk);
  }
  walk(data);
  console.log(JSON.stringify({ templates: [...found.values()], missingFromThisResponse: expected.filter(name => !found.has(name)), responseKeys: Object.keys(data) }));
}
main().catch(() => { console.error('Provider template check failed; no message was sent.'); process.exitCode = 1; });
