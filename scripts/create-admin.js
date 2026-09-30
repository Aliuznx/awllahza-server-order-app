import { randomUUID } from 'node:crypto';
import { pool } from '../server/db.js';
import { hashPassword } from '../server/auth.js';

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
try {
  if (!username || !/^[a-zA-Z0-9._-]{3,80}$/.test(username) || !password || password.length < 12 || password.length > 200) {
    throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD (12–200 characters) in your environment. No default account is created.');
  }
  await pool.execute('INSERT INTO admins (id,username,password_hash) VALUES (?,?,?)', [randomUUID(),username,await hashPassword(password)]);
  console.log(`Created administrator: ${username}`);
} finally { await pool.end(); }
