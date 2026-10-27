// Real Redis + database verification. Mail is captured in memory; SQL writes roll back.
const assert=require('node:assert/strict');
const {randomBytes,createHash}=require('node:crypto');
const {ConfigService}=require('@nestjs/config');
const {RedisService}=require('../dist/redis/redis.service');
const {PrismaService}=require('../dist/prisma/prisma.service');
const {PasswordService}=require('../dist/auth/password.service');
const {PasswordResetStore}=require('../dist/auth/password-reset.store');
const {PasswordResetService}=require('../dist/auth/password-reset.service');
async function main(){
 const dbUrl=new URL(process.env.DATABASE_URL),redisUrl=new URL(process.env.REDIS_URL);
 if(!['localhost','127.0.0.1'].includes(dbUrl.hostname)||dbUrl.pathname!=='/billvyapp_v2'||!['localhost','127.0.0.1'].includes(redisUrl.hostname))throw new Error('Local development services only');
 const config=new ConfigService({database:{url:process.env.DATABASE_URL},redis:{url:process.env.REDIS_URL},jwt:{accessSecret:'isolated-verification-secret-for-tests-only'},nodeEnv:'development'});
 const db=new PrismaService(config),redis=new RedisService(config),store=new PasswordResetStore(redis);
 const email=`reset-flow-${randomBytes(12).toString('hex')}@example.invalid`,identity=createHash('sha256').update(email).digest('hex'),rollback=new Error('ROLLBACK_VERIFICATION');
 let challengeId;
 try{
  await redis.client.connect();
  try{await db.$transaction(async tx=>{
   const role=await tx.role.findUniqueOrThrow({where:{code:'CUSTOMER'},select:{id:true}});
   const passwords=new PasswordService(tx);
   const old='Old!Verification12345',next='New!Verification1234567890'.repeat(6).slice(0,128);
   const user=await tx.user.create({data:{firstName:'Recovery',lastName:'Verification',email,passwordHash:await passwords.hash(old),roleId:role.id}});
   const session=await tx.userSession.create({data:{userId:user.id,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+600000)}});
   let code;
   const mail={configured:true,deliveryEnabled:true,send:async message=>{code=/letter-spacing:6px">(\d{6})</.exec(message.html)?.[1];}};
   const client=new Proxy(tx,{get(target,key){if(key==='$transaction')return async fn=>fn(tx);return target[key];}});
   const service=new PasswordResetService(client,store,passwords,mail,config,{successfulLogin:async()=>{}},{add:async()=>{}});
   const challenge=await service.requestCode(email);challengeId=challenge.challengeId;
   assert.ok(!('code' in challenge));await service.sendCode(challengeId);assert.match(code,/^\d{6}$/);
   const state=await store.read(challengeId);assert.notEqual(state.codeHash,code);assert.ok(!Object.values(state).includes(code));
   const proof=await service.verifyCode({challengeId,code});
   await assert.rejects(()=>service.verifyCode({challengeId,code}));
   await service.resetPassword({challengeId,resetToken:proof.resetToken,newPassword:next},{});
   const changed=await tx.user.findUniqueOrThrow({where:{id:user.id}});
   assert.equal(await passwords.verify(changed.passwordHash,next),true);assert.equal(await passwords.verify(changed.passwordHash,old),false);
   assert.ok((await tx.userSession.findUniqueOrThrow({where:{id:session.id}})).revokedAt);
   assert.equal(await tx.auditLog.count({where:{entityId:user.id,action:'PASSWORD_RESET_COMPLETED'}}),1);
   assert.equal(await tx.emailOutbox.count({where:{eventKey:`password-reset:${challengeId}:completed`}}),1);
   await assert.rejects(()=>service.resetPassword({challengeId,resetToken:proof.resetToken,newPassword:next},{}));
   throw rollback;
  },{timeout:60000});}catch(error){if(error!==rollback)throw error;}
  assert.equal(await db.user.count({where:{email}}),0);assert.equal(await db.emailOutbox.count({where:{eventKey:`password-reset:${challengeId}:completed`}}),0);
  console.log('PASS real recovery flow: emailed OTP captured, single-use verification/reset, password changed, sessions revoked, audit/confirmation queued; all database writes rolled back and no live email sent');
 }finally{
  if(redis.client.status==='ready')await redis.client.del(`password-reset:challenge:${challengeId}`,`password-reset:latest:${identity}`,`password-reset:cooldown:${identity}`,`password-reset:hour:${identity}`);
  redis.client.disconnect();await db.$disconnect();
 }
}
main().catch(()=>{console.error('Password reset integration verification failed; no live email was sent');process.exitCode=1;});
