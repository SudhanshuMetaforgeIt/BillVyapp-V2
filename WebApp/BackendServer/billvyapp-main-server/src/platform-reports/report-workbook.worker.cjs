const { parentPort, workerData } = require('node:worker_threads');
const run = workerData.kind === 'admin'
  ? require('./admin-report-workbook.js').buildAdminWorkbook
  : require('./platform-report-workbook.js').buildPlatformWorkbook;
run(workerData.input).then(bytes => parentPort.postMessage(bytes), () => process.exit(1));
