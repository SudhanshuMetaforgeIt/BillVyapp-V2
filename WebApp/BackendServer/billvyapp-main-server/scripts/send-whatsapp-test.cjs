// Sends exactly one explicitly requested test; never retries automatically.
const { SparklebotService } = require('../dist/whatsapp/sparklebot.service');
const recipient = process.argv[2];
if (process.argv[3] !== '--send' || !/^\+[1-9]\d{7,14}$/.test(recipient || '')) {
  console.error('Usage: node --env-file=.env scripts/send-whatsapp-test.cjs +COUNTRYCODE_NUMBER --send');
  process.exit(1);
}
const nativeFetch = globalThis.fetch;
let receipt;
globalThis.fetch = async (...args) => {
  const response = await nativeFetch(...args);
  try {
    const data = await response.clone().json();
    receipt = { httpStatus: response.status, responseKeys: Object.keys(data),
      success: data.success === true, status: ['success', 'error', 'sent', 'failed'].includes(data.status) ? data.status : undefined,
      messageId: data.data?.message_id || data.data?.whatsapp_response?.messages?.[0]?.id,
      dataKeys: data.data && typeof data.data === 'object' ? Object.keys(data.data) : [],
    };
  } catch { receipt = { httpStatus: response.status }; }
  return response;
};
const config = { get: key => key === 'WHATSAPP_ENABLED' ? 'true' : process.env[key] };
new SparklebotService(config).sendTemplate({
  phone: recipient, templateName: 'billvy_v2_bill_confirmation', language: 'en_IN',
  bodyFields: ['Test Recipient', 'Billvy V2 TEST (no real payment)', 'TEST-ONLY-NOT-A-REAL-BILL', 'INR 0.00 (test only)'],
}).then(messageId => {
  console.log(JSON.stringify({ accepted: true, messageId, receipt, automaticSendingEnabled: false }));
}).catch(() => {
  console.log(JSON.stringify({ clientAccepted: false, receipt, automaticRetry: false }));
  process.exitCode = 1;
});
