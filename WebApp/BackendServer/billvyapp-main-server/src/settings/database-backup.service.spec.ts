import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DatabaseBackupService } from './database-backup.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../redis/redis.service';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DATABASE_RESTORE_KEY } from './maintenance.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

class TestBackups extends DatabaseBackupService {
  tool = jest.fn(
    async (
      _tool: string,
      _args: string[],
      files: { input?: string; output?: string },
    ) => {
      if (files.output)
        await fs.writeFile(
          files.output,
          '-- SQL dump\nCREATE TABLE bills(id int);\n',
        );
    },
  );
  protected runTool(tool: 'mysql' | 'mysqldump', args: string[], files = {}) {
    return this.tool(tool, args, files);
  }
}

describe('Full database backups', () => {
  const actor = {
    userId: 'super-user',
    role: RoleCode.SUPER_ADMIN,
  } as AuthenticatedUser;
  const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };
  const client = {
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
    scan: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: TestBackups;
  let directory: string;
  let previousRoot: string | undefined;
  beforeEach(async () => {
    jest.clearAllMocks();
    client.set.mockResolvedValue('OK');
    client.scan.mockResolvedValue(['0', ['cache:test']]);
    previousRoot = process.env.STORAGE_LOCAL_ROOT;
    directory = await fs.mkdtemp(join(tmpdir(), 'billvy-backup-test-'));
    process.env.STORAGE_LOCAL_ROOT = directory;
    service = new TestBackups(
      new ConfigService({
        database: { url: 'mysql://user:secret@localhost:3306/test_db' },
      }),
      audit as unknown as AuditService,
      { client } as unknown as RedisService,
    );
  });
  afterEach(async () => {
    if (previousRoot === undefined) delete process.env.STORAGE_LOCAL_ROOT;
    else process.env.STORAGE_LOCAL_ROOT = previousRoot;
    await fs.rm(directory, { recursive: true, force: true });
  });
  it('exports the whole database, publishes a checksum, and lists only completed SQL backups', async () => {
    const backup = await service.createBackup(actor, ctx);
    expect(service.tool).toHaveBeenCalledWith(
      'mysqldump',
      expect.arrayContaining([
        '--single-transaction',
        '--routines',
        '--events',
        'test_db',
      ]),
      expect.anything(),
    );
    expect(service.tool.mock.calls[0][1].join(' ')).not.toContain('secret');
    const manifest = JSON.parse(
      await fs.readFile(
        join(directory, 'backups/database', `${backup.id}.json`),
        'utf8',
      ),
    ) as { kind: string; sha256: string };
    expect(manifest.kind).toBe('mysql-database');
    expect(manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(await service.listBackups()).toEqual([
      expect.objectContaining({ id: backup.id }),
    ]);
  });
  it('rejects corrupt SQL before creating a recovery backup or modifying the database', async () => {
    const backup = await service.createBackup(actor, ctx);
    await fs.appendFile(
      join(directory, 'backups/database', `${backup.id}.sql`),
      'corrupt',
    );
    service.tool.mockClear();
    await expect(
      service.restoreBackup(
        actor,
        { confirm: true, confirmationPhrase: 'RESTORE', backupId: backup.id },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.tool).not.toHaveBeenCalled();
    expect(client.set).not.toHaveBeenCalledWith(
      DATABASE_RESTORE_KEY,
      expect.anything(),
    );
  });
  it('requires explicit confirmation and rejects path traversal', async () => {
    await expect(
      service.restoreBackup(
        actor,
        { confirm: true, confirmationPhrase: 'restore' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.restoreBackup(
        actor,
        {
          confirm: true,
          confirmationPhrase: 'RESTORE',
          backupId: '../../secret',
        },
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.tool).not.toHaveBeenCalled();
  });
  it('creates a recovery backup before importing the selected database and clears cached business data', async () => {
    const backup = await service.createBackup(actor, ctx);
    service.tool.mockClear();
    const result = await service.restoreBackup(
      actor,
      { confirm: true, confirmationPhrase: 'RESTORE', backupId: backup.id },
      ctx,
    );
    expect(service.tool.mock.calls.map(([tool]) => tool)).toEqual([
      'mysql',
      'mysqldump',
      'mysql',
    ]);
    expect(result.message).toContain('Full database restored');
    expect(client.del).toHaveBeenCalledWith('cache:test');
    expect(client.del).toHaveBeenCalledWith(DATABASE_RESTORE_KEY);
    expect(await service.listBackups()).toHaveLength(2);
  });
  it('recovers the previous database if import fails', async () => {
    const backup = await service.createBackup(actor, ctx);
    service.tool.mockClear();
    service.tool
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(async (_tool, _args, files) => {
        await fs.writeFile(files.output!, '-- recovery SQL');
      })
      .mockRejectedValueOnce(new Error('import failed'))
      .mockResolvedValueOnce(undefined);
    await expect(
      service.restoreBackup(
        actor,
        { confirm: true, confirmationPhrase: 'RESTORE', backupId: backup.id },
        ctx,
      ),
    ).rejects.toThrow('preserved or recovered');
    expect(service.tool.mock.calls.map(([tool]) => tool)).toEqual([
      'mysql',
      'mysqldump',
      'mysql',
      'mysql',
    ]);
    expect(client.del).toHaveBeenCalledWith(DATABASE_RESTORE_KEY);
  });
  it('keeps maintenance enabled if both restoration and recovery fail', async () => {
    const backup = await service.createBackup(actor, ctx);
    service.tool.mockClear();
    service.tool
      .mockImplementationOnce(async () => {})
      .mockImplementationOnce(async (_tool, _args, files) => {
        await fs.writeFile(files.output!, '-- recovery SQL');
      })
      .mockRejectedValueOnce(new Error('import failed'))
      .mockRejectedValueOnce(new Error('recovery failed'));
    await expect(
      service.restoreBackup(
        actor,
        { confirm: true, confirmationPhrase: 'RESTORE', backupId: backup.id },
        ctx,
      ),
    ).rejects.toThrow('Maintenance remains enabled');
    expect(client.del).not.toHaveBeenCalledWith(DATABASE_RESTORE_KEY);
  });
  it('reports unavailable tools and never publishes a failed backup', async () => {
    service.tool.mockRejectedValue(new Error('ENOENT'));
    await expect(service.createBackup(actor, ctx)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(await service.listBackups()).toHaveLength(0);
  });
  it('prevents concurrent operations', async () => {
    client.set.mockResolvedValue(null);
    await expect(service.createBackup(actor, ctx)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(service.tool).not.toHaveBeenCalled();
  });
  it('rejects franchise users before opening files or running database tools', async () => {
    await expect(
      service.createBackup({ ...actor, role: RoleCode.ADMIN }, ctx),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(client.set).not.toHaveBeenCalled();
  });
});
