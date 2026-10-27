// Database-only verification: no provider calls; every test write is rolled back.
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { InstituteAppointmentWhatsAppService } = require('../dist/whatsapp/institute-appointment-whatsapp.service');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/billvyapp_v2' || (process.env.NODE_ENV || 'development') !== 'development') throw new Error('Local development database only');
  const prisma = new PrismaService(new ConfigService({ database: { url: process.env.DATABASE_URL }, nodeEnv: 'development' }));
  const service = new InstituteAppointmentWhatsAppService(new ConfigService({ WHATSAPP_APPOINTMENTS_ENABLED: 'true' }));
  const rollback = new Error('ROLLBACK_VERIFICATION');
  try {
    const original = await prisma.appointment.findFirst({ where: { isGroupBooking: true }, select: { id: true, status: true } });
    if (!original) throw new Error('No institute booking available for rollback verification');
    const before = await prisma.whatsAppOutbox.count();
    let report;
    try {
      await prisma.$transaction(async tx => {
        const emailBefore = await tx.emailOutbox.count();
        await service.queueAppointment(tx, original.id, 'BOOKED');
        const bookingRows = await tx.whatsAppOutbox.findMany({ where: { eventKey: { startsWith: `institute:${original.id}:BOOKED:` } }, include: { notification: { include: { user: { select: { firstName: true, lastName: true, role: { select: { code: true } } } } } } } });
        assert.ok(bookingRows.length > 0);
        assert.equal(new Set(bookingRows.filter(row => row.recipient).map(row => row.recipient)).size, bookingRows.filter(row => row.recipient).length);
        for (const row of bookingRows) {
          assert.equal(row.templateName, 'billvy_group_appointment_booked');
          assert.equal(row.language, 'en_IN');
          assert.equal(row.bodyFields.length, 10);
          assert.equal(row.notification.channel, 'WHATSAPP');
          assert.equal(row.notification.appointmentId, original.id);
          assert.equal(row.notification.status, row.recipient ? 'QUEUED' : 'FAILED');
        }
        const firstCount = await tx.whatsAppOutbox.count();
        await service.queueAppointment(tx, original.id, 'BOOKED');
        assert.equal(await tx.whatsAppOutbox.count(), firstCount);
        await tx.appointment.update({ where: { id: original.id }, data: { status: 'CONFIRMED' } });
        await service.queueAppointment(tx, original.id, 'CONFIRMED');
        const statusRows = await tx.whatsAppOutbox.findMany({ where: { eventKey: { startsWith: `institute:${original.id}:CONFIRMED:` } } });
        assert.equal(statusRows.length, bookingRows.length);
        assert.ok(statusRows.every(row => row.bodyFields.length === 11 && row.bodyFields[10] === 'Confirmed'));
        assert.equal(await tx.emailOutbox.count(), emailBefore);
        report = { bookingRecipients: bookingRows.length, validRecipientNumbers: bookingRows.filter(row => row.recipient).length, missingOrInvalidNumbers: bookingRows.filter(row => !row.recipient).length, accountsNeedingPhoneNumbers: bookingRows.filter(row => !row.recipient).map(row => ({ name: row.notification.user ? [row.notification.user.firstName, row.notification.user.lastName].filter(Boolean).join(' ') : 'Institute contact', role: row.notification.user?.role.code ?? 'CONTACT' })), statusRecipients: statusRows.length };
        throw rollback;
      }, { timeout: 30000 });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal(await prisma.whatsAppOutbox.count(), before);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: original.id }, select: { status: true } })).status, original.status);
    console.log(JSON.stringify({ result: 'PASS', ...report, rollbackVerified: true, providerCalls: 0 }));
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Institute WhatsApp database verification failed; no provider calls were made.'); process.exitCode = 1; });
