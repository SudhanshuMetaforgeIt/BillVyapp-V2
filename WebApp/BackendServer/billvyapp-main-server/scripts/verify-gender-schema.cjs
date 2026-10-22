const mariadb = require('mariadb');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local database only');
  const connection = await mariadb.createConnection({
    host: url.hostname, port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  try {
    const columns = await connection.query(`SELECT TABLE_NAME,COLUMN_NAME,IS_NULLABLE,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME IN ('customers','services','service_categories') AND COLUMN_NAME='gender') OR (TABLE_NAME='bills' AND COLUMN_NAME='serviceGender')) ORDER BY TABLE_NAME`);
    if (columns.length !== 4 || columns.some(c => c.IS_NULLABLE !== 'NO' || c.COLUMN_TYPE !== "enum('MALE','FEMALE','OTHER','UNISEX')")) throw new Error('Gender column constraints are incorrect');
    for (const c of columns) {
      const counts = await connection.query(`SELECT COUNT(*) AS missing FROM \`${c.TABLE_NAME}\` WHERE \`${c.COLUMN_NAME}\` IS NULL`);
      if (Number(counts[0].missing) !== 0) throw new Error('Missing gender values');
      console.log(`${c.TABLE_NAME}.${c.COLUMN_NAME}: NOT NULL, four enum values, no missing records`);
    }
  } finally {
    await connection.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
