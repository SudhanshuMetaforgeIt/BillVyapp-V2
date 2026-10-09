import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  backupKey,
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
} from './backup-encryption';

describe('Authenticated database backup encryption', () => {
  let directory: string;
  const key = Buffer.alloc(32, 7);
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'billvy-encryption-test-'));
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  it('round-trips SQL without storing plaintext in the published backup', async () => {
    const source = join(directory, 'source'),
      encrypted = join(directory, 'encrypted'),
      restored = join(directory, 'restored');
    const sql = 'INSERT INTO customers VALUES ("synthetic-private-data")';
    await writeFile(source, sql);
    await encryptBackup(source, encrypted, key);
    expect(await isEncryptedBackup(encrypted)).toBe(true);
    expect((await readFile(encrypted)).toString()).not.toContain(
      'synthetic-private-data',
    );
    await decryptBackup(encrypted, restored, key);
    expect(await readFile(restored, 'utf8')).toBe(sql);
  });
  it('rejects tampered ciphertext and a wrong key before importing SQL', async () => {
    const source = join(directory, 'source'),
      encrypted = join(directory, 'encrypted');
    await writeFile(source, 'CREATE TABLE synthetic(id int)');
    await encryptBackup(source, encrypted, key);
    await expect(
      decryptBackup(encrypted, join(directory, 'wrong'), Buffer.alloc(32, 8)),
    ).rejects.toThrow();
    const bytes = await readFile(encrypted);
    bytes[25] ^= 1;
    await writeFile(encrypted, bytes);
    await expect(
      decryptBackup(encrypted, join(directory, 'tampered'), key),
    ).rejects.toThrow();
  });
  it('requires a canonical 32-byte key', () => {
    expect(backupKey(key.toString('base64'))).toEqual(key);
    expect(() => backupKey('short')).toThrow('32-byte');
  });
});
