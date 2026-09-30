import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db.js';
import { config } from './config.js';
import { ApiError } from './domain.js';
const scrypt = promisify(scryptCallback);
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [, salt, expected] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}
export function sessionToken(req) {
  const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('awllahza_session='))?.split('=')[1];
  return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}
export async function requireAdmin(req, res, next) {
  try {
    const token = sessionToken(req);
    if (!token) throw new ApiError('unauthorized', 401);
    const [rows] = await pool.execute('SELECT a.id, a.username FROM admin_sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()', [tokenHash(token)]);
    if (!rows.length) throw new ApiError('unauthorized', 401);
    req.admin = rows[0]; next();
  } catch (error) { next(error); }
}
export function setSessionCookie(res, token, maxAge = 8 * 3600 * 1000) {
  res.cookie('awllahza_session', token, { httpOnly: true, secure: config.production, sameSite: 'strict', maxAge, path: '/' });
}
