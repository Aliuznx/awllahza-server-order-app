import { pool, fromJson } from './db.js';
export const defaultSettings = { opensAt: '16:30', closesAt: '02:00', timeZone: 'Asia/Riyadh', acceptingOrders: true };
export async function getSettings() {
  const [rows] = await pool.query('SELECT content FROM restaurant_settings WHERE id=1');
  return rows.length ? fromJson(rows[0].content) : defaultSettings;
}
export function isOpen(settings, now = new Date()) {
  if (!settings.acceptingOrders) return false;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minutes = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);
  const toMinute = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const start = toMinute(settings.opensAt), end = toMinute(settings.closesAt);
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}
