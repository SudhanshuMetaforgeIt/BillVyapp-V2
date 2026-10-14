// End-to-end smoke check using only the fictional sample invoice.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ConfigService } = require('@nestjs/config');
const { validateAttachment } = require('../dist/media/attachment-validation');
const { CloudinaryDocumentProvider } = require('../dist/media/cloudinary-document.provider');
process.loadEnvFile(path.resolve(__dirname, '../.env'));

async function main() {
  const sample = fs.readFileSync(path.resolve(__dirname, '../../../../outputs/pdf/sample_vendor_invoice.pdf'));
  const started = Date.now();
  const bytes = await validateAttachment(sample, 'application/pdf');
  console.log(`PDF parsing and malware scan passed in ${((Date.now() - started) / 1000).toFixed(1)} seconds.`);
  const config = new ConfigService({ cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  } });
  const storage = new CloudinaryDocumentProvider(config);
  const key = `procurement-smoke-tests/${randomUUID()}.pdf`;
  let uploaded = false;
  try {
    await storage.upload(key, bytes, 'application/pdf');
    uploaded = true;
    console.log('Authenticated Cloudinary PDF upload passed.');
    const response = await fetch(storage.downloadUrl(key), { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Cloudinary download failed (${response.status})`);
    const downloaded = Buffer.from(await response.arrayBuffer());
    if (!downloaded.equals(bytes)) throw new Error('Downloaded PDF differs from uploaded bytes');
    console.log('Signed PDF download passed; contents match.');
  } finally {
    if (uploaded) {
      await storage.remove(key);
      console.log('Temporary smoke-test asset removed.');
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
