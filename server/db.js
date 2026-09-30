import mysql from 'mysql2/promise';

export function dbOptions() {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'awllahza',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'awllahza',
    charset: 'utf8mb4', timezone: 'Z',
  };
}
export const pool = mysql.createPool({ ...dbOptions(), connectionLimit: 10, waitForConnections: true, queueLimit: 100 });
// TIMESTAMP values are transported in UTC, regardless of the host's local zone.
pool.on('connection', connection => connection.query("SET time_zone = '+00:00'"));
export const fromJson = value => typeof value === 'string' ? JSON.parse(value) : value;
