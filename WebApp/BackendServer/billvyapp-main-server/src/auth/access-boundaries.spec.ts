import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { Server } from 'node:http';
import { BillsController } from '../bills/bills.controller';
import { BillsService } from '../bills/bills.service';
import { ServicesController } from '../services/services.controller';
import { ServicesService } from '../services/services.service';
import { RolesController } from '../roles/roles.controller';
import { RolesService } from '../roles/roles.service';
import { AuditLogsController } from '../audit/audit-logs.controller';
import { AuditLogsService } from '../audit/audit-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeService } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';
import { JwtStrategy } from './strategies/jwt.strategy';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('HTTP access boundaries with signed JWTs and real authorization services', () => {
  let app: INestApplication<Server>;
  const secret = 'test-only-access-secret-with-at-least-32-chars';
  const jwt = new JwtService();
  const billId = '22222222-2222-4222-8222-222222222222';
  const prisma = {
    user: { findUnique: jest.fn() },
    bill: { findUnique: jest.fn() },
    salon: { findUnique: jest.fn() },
  };
  const sessions = { isActive: jest.fn() };
  const bulk = jest.fn();
  const scope = new ScopeService(prisma as never);
  const bills = new BillsService(
    prisma as never,
    scope,
    {} as never,
    { resolveForUser: jest.fn().mockResolvedValue('Asia/Kolkata') } as never,
  );
  const token = (
    payload: Record<string, unknown> = {},
    options: Record<string, unknown> = {},
  ) =>
    jwt.sign(
      {
        sub: 'staff-a',
        sessionId: 'session-a',
        type: 'access',
        role: 'SUPER_ADMIN',
        salonId: 'salon-b',
        ...payload,
      },
      {
        secret,
        algorithm: 'HS256',
        issuer: 'billvy-api',
        audience: 'billvy-access',
        expiresIn: '15m',
        ...options,
      },
    );
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        BillsController,
        ServicesController,
        RolesController,
        AuditLogsController,
      ],
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: SessionService, useValue: sessions },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        { provide: BillsService, useValue: bills },
        { provide: ServicesService, useValue: { bulkCreate: bulk } },
        { provide: RolesService, useValue: { findAll: () => [] } },
        { provide: AuditLogsService, useValue: { list: jest.fn() } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(
      new JwtAuthGuard(app.get(Reflector)),
      new RolesGuard(app.get(Reflector)),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'staff-a',
      email: 'staff@example.com',
      isActive: true,
      role: { code: 'STAFF', isActive: true },
      franchiseId: 'fr-a',
      salonId: 'salon-a',
      franchise: { isActive: true },
      salon: { isActive: true, franchiseId: 'fr-a' },
    });
    prisma.bill.findUnique.mockResolvedValue({
      id: billId,
      salonId: 'salon-b',
      customerId: 'customer-b',
    });
    prisma.salon.findUnique.mockResolvedValue({
      id: 'salon-b',
      franchiseId: 'fr-b',
      isActive: true,
    });
    sessions.isActive.mockImplementation((id: string, userId: string) =>
      Promise.resolve(id === 'session-a' && userId === 'staff-a'),
    );
  });
  it('rejects direct unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get('/api/bills/' + billId)
      .expect(401);
    expect(prisma.bill.findUnique).not.toHaveBeenCalled();
  });
  it.each([
    ['expired', () => token({}, { expiresIn: -1 })],
    ['wrong signature', () => token({}, { secret: 'wrong-signing-secret' })],
    ['wrong audience', () => token({}, { audience: 'billvy-refresh' })],
    ['wrong algorithm', () => token({}, { algorithm: 'HS384' })],
    [
      'no expiry',
      () =>
        jwt.sign(
          { sub: 'staff-a', sessionId: 'session-a', type: 'access' },
          { secret, issuer: 'billvy-api', audience: 'billvy-access' },
        ),
    ],
    ['missing session', () => token({ sessionId: null })],
    ['other user session', () => token({ sessionId: 'session-b' })],
    ['refresh token', () => token({ type: 'refresh' })],
  ])('rejects %s credentials', async (_label, getToken) => {
    await request(app.getHttpServer())
      .get('/api/bills/' + billId)
      .set('Authorization', 'Bearer ' + getToken())
      .expect(401);
    expect(prisma.bill.findUnique).not.toHaveBeenCalled();
  });
  it('denies Salon B bill to Salon A staff despite forged scope claims', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bills/' + billId)
      .set('Authorization', 'Bearer ' + token())
      .expect(403);
    expect(res.body).not.toHaveProperty('customerId');
  });
  it('denies administrative and bulk operations to staff', async () => {
    await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', 'Bearer ' + token())
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', 'Bearer ' + token())
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/services/bulk')
      .set('Authorization', 'Bearer ' + token())
      .send({ salonId: 'salon-b', services: [] })
      .expect(403);
    expect(bulk).not.toHaveBeenCalled();
  });
  it('denies an unauthorized salon in a bill creation body without writing', async () => {
    await request(app.getHttpServer())
      .post('/api/bills')
      .set('Authorization', 'Bearer ' + token())
      .send({
        idempotencyKey: 'foreign-bill-request',
        salonId: 'salon-b',
        customerId: 'customer-b',
        items: [],
      })
      .expect(403);
  });
  it('allows the legitimate current database role despite differing token claims', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'staff-a',
      email: 'admin@example.com',
      isActive: true,
      role: { code: 'ADMIN', isActive: true },
      franchiseId: 'fr-a',
      salonId: null,
      franchise: { isActive: true },
    });
    await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', 'Bearer ' + token({ role: 'CUSTOMER' }))
      .expect(200);
  });
});
