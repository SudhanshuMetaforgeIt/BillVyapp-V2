import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { createHash, randomUUID } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { join, resolve, sep } from 'path';
import { databaseSecurity } from '../prisma/database-security';
import {
  backupKey,
  encryptBackup,
  decryptBackup,
  isEncryptedBackup,
} from './backup-encryption';
import { pipeline } from 'stream/promises';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../common/http/request-context';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RedisService } from '../redis/redis.service';
import type { ConfirmRestoreDto } from './dto/settings-write.dto';
import { DATABASE_RESTORE_KEY } from './maintenance.service';
import {
  PLATFORM_SETTINGS_ID,
  SETTINGS_ENTITY_TYPE,
} from './settings.constants';

type BackupManifest = {
  formatVersion: 1;
  kind: 'mysql-database';
  id: string;
  database: string;
  createdAt: string;
  createdBy: string;
  sizeBytes: number;
  sha256: string;
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCK_KEY = 'settings:database:operation';

@Injectable()
export class DatabaseBackupService {
  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async createBackup(actor: AuthenticatedUser, ctx: RequestContext) {
    this.assertSuperAdmin(actor);
    return this.withLock(async () => {
      const backup = await this.snapshot(actor.userId);
      await this.audit.record({
        userId: actor.userId,
        action: 'SETTINGS_BACKUP_CREATED',
        entityType: SETTINGS_ENTITY_TYPE,
        entityId: PLATFORM_SETTINGS_ID,
        newData: {
          backupId: backup.id,
          kind: backup.kind,
          sizeBytes: backup.sizeBytes,
        },
        ...ctx,
      });
      return {
        ...this.toResponse(backup),
        message: 'Full database backup created.',
      };
    });
  }

  async listBackups() {
    const dir = await this.directory();
    const backups: BackupManifest[] = [];
    for (const file of await fs.readdir(dir)) {
      const id = file.replace(/\.json$/, '');
      if (!file.endsWith('.json') || !UUID.test(id)) continue;
      try {
        const manifest = await this.readManifest(id);
        const stat = await fs.stat(join(dir, `${id}.sql`));
        if (stat.size === manifest.sizeBytes) backups.push(manifest);
      } catch {
        /* Incomplete, legacy settings-only, or corrupt backups are not restore targets. */
      }
    }
    return backups
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((backup) => this.toResponse(backup));
  }

  async restoreBackup(
    actor: AuthenticatedUser,
    dto: ConfirmRestoreDto,
    ctx: RequestContext,
  ) {
    this.assertSuperAdmin(actor);
    if (dto.confirm !== true || dto.confirmationPhrase !== 'RESTORE')
      throw new BadRequestException(
        'Type RESTORE and confirm to restore the entire database.',
      );
    return this.withLock(async () => {
      const id = dto.backupId ?? (await this.listBackups())[0]?.id;
      if (!id)
        throw new NotFoundException('No database backups available to restore');
      const manifest = await this.readManifest(id);
      const dir = await this.directory();
      const target = join(dir, `${id}.sql`);
      await this.verifyFile(target, manifest);
      // Verify the importer is installed before touching the current database.
      await this.runTool('mysql', ['--version']);
      await this.redis.client.set(DATABASE_RESTORE_KEY, id);
      let recovery: BackupManifest | undefined;
      let importStarted = false;
      let recovered = true;
      try {
        recovery = await this.snapshot(actor.userId);
        importStarted = true;
        await this.importDatabase(target);
        await this.clearCaches();
        await this.audit.record({
          userId: actor.userId,
          action: 'SETTINGS_BACKUP_RESTORED',
          entityType: SETTINGS_ENTITY_TYPE,
          entityId: PLATFORM_SETTINGS_ID,
          newData: {
            backupId: id,
            recoveryBackupId: recovery.id,
            kind: manifest.kind,
          },
          ...ctx,
        });
        return {
          ...this.toResponse(manifest),
          message:
            'Full database restored. Sign in again to refresh your session.',
        };
      } catch {
        if (importStarted && recovery) {
          try {
            await this.importDatabase(join(dir, `${recovery.id}.sql`));
            await this.clearCaches();
          } catch {
            recovered = false;
          }
        }
        throw new ServiceUnavailableException(
          recovered
            ? 'Database restore failed. The previous database was preserved or recovered. Please check the server backup configuration.'
            : 'Database restore and automatic recovery failed. Maintenance remains enabled. Recover from the pre-restore backup before reopening the application.',
        );
      } finally {
        // If both imports fail, keep the application blocked until operator recovery.
        if (recovered) await this.redis.client.del(DATABASE_RESTORE_KEY);
      }
    });
  }

  private assertSuperAdmin(actor: AuthenticatedUser) {
    if (actor.role !== RoleCode.SUPER_ADMIN)
      throw new ForbiddenException(
        'Only Super Admin can back up or restore the database.',
      );
  }

  private database() {
    const appUrl = this.config.getOrThrow<string>('database.url');
    const configured = this.config.get<string>('database.backupUrl');
    if (this.production() && !configured)
      throw new ServiceUnavailableException(
        'Dedicated backup database credentials are required',
      );
    const url = new URL(configured ?? appUrl);
    const application = new URL(appUrl);
    if (
      url.hostname !== application.hostname ||
      url.port !== application.port ||
      url.pathname !== application.pathname
    )
      throw new ServiceUnavailableException(
        'Backup must target the application database',
      );
    if (this.production() && url.username === application.username)
      throw new ServiceUnavailableException(
        'Backup credentials must be separate from runtime credentials',
      );
    const name = decodeURIComponent(url.pathname.slice(1));
    if (!/^[A-Za-z0-9_-]+$/.test(name))
      throw new ServiceUnavailableException(
        'Database name is not supported by the backup configuration.',
      );
    return { url, name };
  }

  private async directory() {
    const configured = this.config.get<string>('database.backupRoot');
    if (this.production() && !configured)
      throw new ServiceUnavailableException(
        'A private backup directory is required',
      );
    const dir = configured
      ? resolve(configured)
      : join(
          process.env.STORAGE_LOCAL_ROOT ?? './storage',
          'backups',
          'database',
        );
    const mediaRoot = resolve(
      this.config.get<string>('storage.localRoot') ??
        process.env.STORAGE_LOCAL_ROOT ??
        './storage',
    );
    if (
      this.production() &&
      (dir === mediaRoot || dir.startsWith(mediaRoot + sep))
    )
      throw new ServiceUnavailableException(
        'Backups must be outside the media directory',
      );
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    return dir;
  }

  private connectionArgs() {
    const { url } = this.database();
    const tls = databaseSecurity(url.toString(), {
      production: this.production(),
      tlsMode: this.config.get<string>('database.tlsMode'),
      caPath: this.config.get<string>('database.caPath'),
    });
    return [
      '--protocol=TCP',
      `--host=${url.hostname}`,
      `--port=${url.port || '3306'}`,
      `--user=${decodeURIComponent(url.username)}`,
      '--default-character-set=utf8mb4',
      ...(tls.tlsRequired
        ? [
            '--ssl-mode=VERIFY_IDENTITY',
            ...(this.config.get<string>('database.caPath')
              ? [`--ssl-ca=${this.config.get<string>('database.caPath')}`]
              : []),
          ]
        : []),
    ];
  }

  private async snapshot(createdBy: string): Promise<BackupManifest> {
    const key = this.encryptionKey();
    const dir = await this.directory();
    const id = randomUUID();
    const temporary = join(dir, `${id}.partial`);
    const destination = join(dir, `${id}.sql`);
    const encrypted = join(dir, `${id}.encrypted`);
    try {
      await this.runTool(
        'mysqldump',
        [
          ...this.connectionArgs(),
          '--single-transaction',
          '--quick',
          '--routines',
          '--triggers',
          '--events',
          '--hex-blob',
          '--no-tablespaces',
          '--set-gtid-purged=OFF',
          '--column-statistics=0',
          this.database().name,
        ],
        { output: temporary },
      );
      const stat = await fs.stat(temporary);
      if (!stat.size) throw new Error('Empty database dump');
      if (key) {
        await encryptBackup(temporary, encrypted, key);
        await fs.rm(temporary);
        await fs.rename(encrypted, temporary);
      }
      const published = await fs.stat(temporary);
      const manifest: BackupManifest = {
        formatVersion: 1,
        kind: 'mysql-database',
        id,
        database: this.database().name,
        createdAt: new Date().toISOString(),
        createdBy,
        sizeBytes: published.size,
        sha256: await this.digest(temporary),
      };
      await fs.rename(temporary, destination);
      // Publish the manifest last; interrupted exports never appear as restorable backups.
      await fs.writeFile(
        join(dir, `${id}.json`),
        JSON.stringify(manifest, null, 2),
        { encoding: 'utf8', mode: 0o600, flag: 'wx' },
      );
      return manifest;
    } catch {
      await fs.rm(temporary, { force: true });
      await fs.rm(destination, { force: true });
      await fs.rm(encrypted, { force: true });
      throw new ServiceUnavailableException(
        'Could not create a database backup. Check MySQL client tools, database permissions and available storage.',
      );
    }
  }

  private async readManifest(id: string): Promise<BackupManifest> {
    if (!UUID.test(id)) throw new BadRequestException('Invalid backup id');
    let value: BackupManifest;
    try {
      value = JSON.parse(
        await fs.readFile(join(await this.directory(), `${id}.json`), 'utf8'),
      ) as BackupManifest;
    } catch {
      throw new NotFoundException('Database backup not found or unreadable');
    }
    if (
      value?.kind !== 'mysql-database' ||
      value.formatVersion !== 1 ||
      value.id !== id ||
      value.database !== this.database().name ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      typeof value.createdBy !== 'string' ||
      !Number.isSafeInteger(value.sizeBytes) ||
      value.sizeBytes <= 0 ||
      !/^[a-f0-9]{64}$/.test(value.sha256)
    ) {
      throw new BadRequestException(
        'Backup metadata is invalid or belongs to another database.',
      );
    }
    return value;
  }

  private async verifyFile(path: string, manifest: BackupManifest) {
    const temporary = join(await this.directory(), `${randomUUID()}.verify`);
    try {
      const stat = await fs.stat(path);
      if (
        stat.size !== manifest.sizeBytes ||
        (await this.digest(path)) !== manifest.sha256
      )
        throw new Error('Checksum mismatch');
      const encrypted = await isEncryptedBackup(path);
      if (this.production() && !encrypted)
        throw new Error('Unencrypted backup');
      if (encrypted) {
        const key = this.encryptionKey();
        if (!key) throw new Error('Missing backup key');
        await decryptBackup(path, temporary, key);
      }
    } catch {
      throw new BadRequestException(
        'Backup file is missing or corrupt. No database changes were made.',
      );
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  private async digest(path: string) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path))
      hash.update(chunk as Buffer);
    return hash.digest('hex');
  }

  private async importDatabase(path: string) {
    const encrypted = await isEncryptedBackup(path);
    const key = this.encryptionKey();
    if (this.production() && !encrypted)
      throw new BadRequestException(
        'Production restores require an encrypted backup',
      );
    const temporary = join(await this.directory(), `${randomUUID()}.restore`);
    try {
      if (encrypted) {
        if (!key)
          throw new BadRequestException('Backup encryption key is unavailable');
        await decryptBackup(path, temporary, key);
      }
      await this.runTool(
        'mysql',
        [...this.connectionArgs(), '--binary-mode=1', this.database().name],
        { input: encrypted ? temporary : path },
      );
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  private production() {
    return this.config.get<string>('nodeEnv') === 'production';
  }
  private encryptionKey() {
    const key = backupKey(
      this.config.get<string>('database.backupEncryptionKey'),
    );
    if (this.production() && !key)
      throw new ServiceUnavailableException(
        'Backup encryption is required in production',
      );
    return key;
  }

  /** Stream SQL rather than buffering large databases. Credentials never enter command arguments. */
  protected async runTool(
    tool: 'mysql' | 'mysqldump',
    args: string[],
    files: { input?: string; output?: string } = {},
  ) {
    const binary =
      tool === 'mysql'
        ? (process.env.MYSQL_CLIENT_PATH ?? 'mysql')
        : (process.env.MYSQLDUMP_PATH ?? 'mysqldump');
    const child = spawn(binary, args, {
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        MYSQL_PWD: decodeURIComponent(this.database().url.password),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Drain diagnostics but do not expose SQL, credentials, or personal data in HTTP errors.
    child.stderr.resume();
    const timer = setTimeout(() => child.kill(), 5 * 60_000);
    const completion = new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`${tool} failed`)),
      );
    });
    try {
      const streams: Promise<unknown>[] = [completion];
      if (files.input)
        streams.push(pipeline(createReadStream(files.input), child.stdin));
      else child.stdin.end();
      if (files.output)
        streams.push(
          pipeline(
            child.stdout,
            createWriteStream(files.output, { mode: 0o600, flags: 'wx' }),
          ),
        );
      else child.stdout.resume();
      await Promise.all(streams);
    } catch {
      child.kill();
      throw new ServiceUnavailableException(
        `The ${tool} database tool is unavailable or failed.`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private toResponse(backup: BackupManifest) {
    return {
      id: backup.id,
      createdAt: new Date(backup.createdAt),
      createdBy: backup.createdBy,
      sizeBytes: backup.sizeBytes,
    };
  }

  private async withLock<T>(action: () => Promise<T>): Promise<T> {
    const token = randomUUID();
    if (!(await this.redis.client.set(LOCK_KEY, token, 'EX', 1800, 'NX')))
      throw new ConflictException(
        'A database backup or restore is already running.',
      );
    try {
      return await action();
    } finally {
      await this.redis.client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        LOCK_KEY,
        token,
      );
    }
  }

  private async clearCaches() {
    // Pending requests cannot refill the restored database's cache generation.
    await this.redis.client.incr('cache-epoch:global');
    // Restoring older session rows must never revive credentials or OTP challenges.
    // Login lockout counters remain intact.
    for (const pattern of ['cache:*', 'security:session:*', 'otp:login:*']) {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        cursor = next;
        if (keys.length) await this.redis.client.del(...keys);
      } while (cursor !== '0');
    }
  }
}
