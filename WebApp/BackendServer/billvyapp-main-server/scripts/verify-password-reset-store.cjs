// Uses only isolated test Redis keys; sends no emails and changes no user accounts.
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { RedisService } = require('../dist/redis/redis.service');
const { PasswordResetStore } = require('../dist/auth/password-reset.store');
async function main() {
 const url=new URL(process.env.REDIS_URL);
 if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Local Redis only');
 const redis=new RedisService(new ConfigService({redis:{url:process.env.REDIS_URL},nodeEnv:'development'}));
 const store=new PasswordResetStore(redis), ids=[], identity=randomBytes(32).toString('hex');
 const email=`reset-test-${identity}@example.invalid`, codeHash=createHash('sha256').update('test-only-code').digest('hex');
 const fresh=async()=>{const id=randomBytes(32).toString('hex');ids.push(id);await store.save(id,email,identity);await store.prepareCode(id,identity,'test-user','version',codeHash);return id;};
 try {
  await redis.client.connect();
  assert.equal(await store.rateLimit(identity),true);assert.equal(await store.rateLimit(identity),false);
  let id=await fresh();for(let i=0;i<5;i++)assert.equal(await store.verify(id,identity,'wrong','token'),false);
  assert.equal(await store.verify(id,identity,codeHash,'token'),false);
  id=await fresh();const results=await Promise.all([store.verify(id,identity,codeHash,'token1'),store.verify(id,identity,codeHash,'token2')]);
  assert.equal(results.filter(Boolean).length,1);const token=results[0]?'token1':'token2';
  assert.equal(await store.consume(id,identity,'wrong'),false);
  const consumed=await Promise.all([store.consume(id,identity,token),store.consume(id,identity,token)]);assert.equal(consumed.filter(Boolean).length,1);
  id=await fresh();await store.verify(id,identity,codeHash,'old-token');await fresh();assert.equal(await store.consume(id,identity,'old-token'),false);
  id=await fresh();await redis.client.expire(`password-reset:challenge:${id}`,0);assert.equal(await store.verify(id,identity,codeHash,'token'),false);
  id=randomBytes(32).toString('hex');ids.push(id);await store.save(id,email,identity);assert.equal(await store.claimMail(id,identity),true);assert.equal(await store.claimMail(id,identity),false);
  console.log('PASS real Redis: cooldown, five-attempt limit, expiry, resend invalidation, single-use verification/token and duplicate mail claim');
 } finally {
  if(redis.client.status==='ready')await redis.client.del(...ids.map(id=>`password-reset:challenge:${id}`),`password-reset:latest:${identity}`,`password-reset:cooldown:${identity}`,`password-reset:hour:${identity}`);
  redis.client.disconnect();
 }
}
main().catch(()=>{console.error('Password reset store verification failed; no user accounts were changed or emails sent');process.exitCode=1;});
