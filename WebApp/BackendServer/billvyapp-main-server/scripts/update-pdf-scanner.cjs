// Refresh the configured portable scanner's official malware definitions.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const scanner = process.env.UPLOAD_CLAMSCAN_PATH;
if (!scanner || !process.env.UPLOAD_CLAMSCAN_DATABASE_PATH) {
  console.error('Configure the PDF scanner executable and signature database first.');
  process.exit(1);
}
const directory = path.dirname(scanner);
const updater = path.join(directory, process.platform === 'win32' ? 'freshclam.exe' : 'freshclam');
const result = spawnSync(updater, ['--config-file', path.join(directory, 'freshclam.conf'), '--quiet'], {
  shell: false, windowsHide: true, stdio: 'inherit', timeout: 300000,
});
if (result.error) { console.error('Could not update the PDF scanner.'); process.exit(1); }
process.exit(result.status ?? 1);
