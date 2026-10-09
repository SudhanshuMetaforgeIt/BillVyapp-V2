import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, stat, writeFile, appendFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

const MAGIC = Buffer.from('BILLVYDB1');
export function backupKey(value?: string): Buffer | undefined {
  if (!value) return undefined;
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value)
    throw new Error('Backup encryption requires a base64-encoded 32-byte key');
  return key;
}
export async function encryptBackup(
  source: string,
  destination: string,
  key: Buffer,
): Promise<void> {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(MAGIC);
  await writeFile(destination, Buffer.concat([MAGIC, iv]), {
    mode: 0o600,
    flag: 'wx',
  });
  await pipeline(
    createReadStream(source),
    cipher,
    createWriteStream(destination, { flags: 'a' }),
  );
  await appendFile(destination, cipher.getAuthTag());
}
export async function decryptBackup(
  source: string,
  destination: string,
  key: Buffer,
): Promise<void> {
  const file = await open(source, 'r');
  const size = (await stat(source)).size;
  const header = Buffer.alloc(MAGIC.length + 12),
    tag = Buffer.alloc(16);
  try {
    await file.read(header, 0, header.length, 0);
    await file.read(tag, 0, 16, size - 16);
  } finally {
    await file.close();
  }
  if (
    size <= header.length + 16 ||
    !header.subarray(0, MAGIC.length).equals(MAGIC)
  )
    throw new Error('Invalid encrypted backup');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    header.subarray(MAGIC.length),
  );
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  await pipeline(
    createReadStream(source, { start: header.length, end: size - 17 }),
    decipher,
    createWriteStream(destination, { mode: 0o600, flags: 'wx' }),
  );
}
export async function isEncryptedBackup(path: string): Promise<boolean> {
  const file = await open(path, 'r');
  const header = Buffer.alloc(MAGIC.length);
  try {
    await file.read(header, 0, header.length, 0);
    return header.equals(MAGIC);
  } finally {
    await file.close();
  }
}
