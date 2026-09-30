// Development only: provision an isolated schema on this project's local MySQL.
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
if (process.env.TEST_MODE !== 'true' || process.env.MYSQL_HOST !== '127.0.0.1') throw new Error('Local test mode is required.');
const password = (await readFile(new URL('../.runtime/mysql-root-password.txt',import.meta.url),'utf8')).trim();
const connection = await mysql.createConnection({host:'127.0.0.1',port:Number(process.env.MYSQL_PORT),user:'root',password});
try {
  await connection.query('CREATE DATABASE IF NOT EXISTS awllahza_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.query("GRANT ALL PRIVILEGES ON awllahza_test.* TO 'awllahza'@'127.0.0.1'");
  console.log('Provisioned isolated awllahza_test schema.');
} finally { await connection.end(); }
