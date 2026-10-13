// Authentication-only check. Never sends mail or prints tokens/provider response bodies.
const { resolve } = require('node:path');
process.loadEnvFile(resolve('.env'));
async function main() {
  const tenant = process.env.GRAPH_TENANT_ID || '';
  const client = process.env.GRAPH_CLIENT_ID || '';
  if (!/^[a-f0-9-]{36}$/i.test(tenant) || !/^[a-f0-9-]{36}$/i.test(client) || !process.env.GRAPH_CLIENT_SECRET)
    throw new Error('Graph configuration incomplete');
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method:'POST', signal:AbortSignal.timeout(15000),
    body:new URLSearchParams({client_id:client,client_secret:process.env.GRAPH_CLIENT_SECRET,grant_type:'client_credentials',scope:'https://graph.microsoft.com/.default'}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.log(`Graph authentication rejected (HTTP ${response.status}; code ${Number(error.error_codes?.[0]) || 'unavailable'}). No email sent.`);
    process.exitCode=1; return;
  }
  const token = await response.json();
  const claims = JSON.parse(Buffer.from(token.access_token.split('.')[1], 'base64url').toString('utf8'));
  console.log(`PASS Graph authentication. Mail.Send application permission present: ${Array.isArray(claims.roles) && claims.roles.includes('Mail.Send')}. No email sent; mailbox access and delivery have not been tested.`);
}
main().catch(() => {console.error('Graph readiness check could not complete. No email sent.');process.exitCode=1;});
