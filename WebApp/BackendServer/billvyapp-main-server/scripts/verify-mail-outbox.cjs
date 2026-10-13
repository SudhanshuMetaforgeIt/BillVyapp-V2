// Synthetic disposable database and fake mail only. Never loads .env or contacts Graph.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { MailOutboxService } = require('../dist/mail/mail-outbox.service');
const connection = process.env.MAIL_TEST_DATABASE_URL;
if (!connection) throw new Error('Explicit disposable mail database required');
const url = new URL(connection);
if (url.hostname !== '127.0.0.1' || url.port !== '33091' || url.pathname !== '/billvy_security_test_mail') throw new Error('Only disposable mail test database is permitted');
globalThis.fetch = async () => { throw new Error('NETWORK EMAIL IS FORBIDDEN IN THIS TEST'); };
const db = new PrismaService(new ConfigService({nodeEnv:'test',database:{url:connection}}));
const sent = [];
const transport = {enabled:true,deliveryEnabled:true,send: async mail => { sent.push(mail.eventKey); await new Promise(resolve => setTimeout(resolve,30)); }};
const config = new ConfigService({MAIL_START_AT:new Date().toISOString()});
const worker = new MailOutboxService(db,transport,config), other = new MailOutboxService(db,transport,config);
let checks = 0;
async function check(name, work) {await work(); checks++; console.log(`PASS ${name}`);}
async function main() {
  await db.emailOutbox.deleteMany();
  const role = await db.role.upsert({where:{code:'CUSTOMER'},create:{code:'CUSTOMER',name:'Customer'},update:{}});
  const user = await db.user.create({data:{roleId:role.id,firstName:'Synthetic',lastName:'Customer',email:`${randomUUID()}@example.test`,passwordHash:'inert-fixture'}});
  const customer = await db.customer.create({data:{userId:user.id,customerCode:randomUUID()}});
  const franchise = await db.franchise.create({data:{name:'Synthetic',code:randomUUID()}});
  const salon = await db.salon.create({data:{franchiseId:franchise.id,name:'Synthetic salon',code:randomUUID(),addressLine1:'Test',city:'Test',state:'Test',country:'India',postalCode:'00000',latitude:0,longitude:0}});
  const bill = await db.bill.create({data:{salonId:salon.id,customerId:customer.id,billNumber:randomUUID(),billDate:new Date(),status:'COMPLETED',total:'100',subtotal:'100',dueAmount:'100'}});
  await check('concurrent bill capture creates and sends one email', async () => {
    await Promise.all([worker.tick(),other.tick()]);
    assert.equal(await db.emailOutbox.count({where:{eventKey:{startsWith:`bill:${bill.id}:`}}}),1);
    assert.equal(sent.length,1);
    const saved = await db.bill.findUniqueOrThrow({where:{id:bill.id}});
    assert.equal(saved.updatedAt.getTime(),saved.emailQueuedAt.getTime());
    assert.equal(saved.updatedAt.getTime(),bill.updatedAt.getTime());
    assert.equal(Number(saved.total),100);
  });
  await check('repeated scans do not resend the same bill', async () => {
    await worker.tick();await other.tick();assert.equal(sent.length,1);
  });
  await check('confirmed payment generates an updated paid receipt', async () => {
    await db.$transaction(async tx => {
      await tx.payment.create({data:{billId:bill.id,amount:'100',paymentMethod:'CASH',status:'SUCCESS'}});
      await tx.bill.update({where:{id:bill.id},data:{paidAmount:'100',dueAmount:'0',paymentStatus:'PAID'}});
    });
    await Promise.all([worker.tick(),other.tick()]);assert.equal(sent.length,2);
    const receipts = await db.emailOutbox.findMany({where:{eventKey:{startsWith:`bill:${bill.id}:`}}});
    assert.ok(receipts.some(r => r.html.includes('Payment status: PAID')));
    assert.ok(receipts.some(r => r.html.includes('Payment status: UNPAID')));
  });
  await check('in-app email copies remain recipient-private and unread', async () => {
    const n = await db.notification.create({data:{userId:user.id,salonId:salon.id,channel:'IN_APP',notificationType:'LOW_STOCK',recipient:user.id,message:'Low stock <script>',status:'DELIVERED',deliveredAt:new Date()}});
    await Promise.all([worker.captureNotification(n.id),other.captureNotification(n.id)]);
    const mail = await db.emailOutbox.findUniqueOrThrow({where:{notificationId:n.id}});
    await Promise.all([worker.deliver(mail.id),other.deliver(mail.id)]);
    assert.equal(sent.filter(key => key===`notification:${n.id}`).length,1);
    assert.equal(mail.recipient,user.email);assert.ok(!mail.html.includes('<script>'));
    assert.equal((await db.notification.findUniqueOrThrow({where:{id:n.id}})).status,'DELIVERED');
  });
  await check('cancelled notifications cannot dispatch pending mail', async () => {
    const n = await db.notification.create({data:{channel:'EMAIL',notificationType:'TEST',recipient:user.email,message:'Synthetic',status:'QUEUED'}});
    await worker.captureNotification(n.id);
    await db.notification.update({where:{id:n.id},data:{status:'CANCELLED'}});
    const mail = await db.emailOutbox.findUniqueOrThrow({where:{notificationId:n.id}});
    const before = sent.length;await worker.deliver(mail.id);assert.equal(sent.length,before);
    assert.equal((await db.emailOutbox.findUniqueOrThrow({where:{id:mail.id}})).status,'CANCELLED');
  });
  await check('sending pause does not touch or email new sample records', async () => {
    transport.deliveryEnabled=false;
    const n = await db.notification.create({data:{channel:'EMAIL',notificationType:'TEST',recipient:user.email,message:'Paused sample'}});
    const before=sent.length; await worker.tick(); await worker.captureNotification(n.id);
    assert.equal(sent.length,before);assert.equal(await db.emailOutbox.count({where:{notificationId:n.id}}),0);
    transport.deliveryEnabled=true;
  });
  console.log(`PASS ${checks} real MySQL mail checks. All deliveries used a fake transport; no email sent.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
