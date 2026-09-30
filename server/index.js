import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { pool, fromJson } from './db.js';
import { config } from './config.js';
import { isAllowedOrigin } from './origin.js';
import { ApiError, transitions } from './domain.js';
import { requireAdmin, verifyPassword, hashPassword, sessionToken, tokenHash, setSessionCookie } from './auth.js';
import { createOrder, listOrders, changePendingOrder } from './orders.js';
import { migrateOrders } from './migrations.js';
import { getSettings, isOpen } from './settings.js';
import { validateProduct } from './catalog-validation.js';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const dummyHash = await hashPassword(randomBytes(24).toString('hex'));
const publicPath = fileURLToPath(new URL('../public/', import.meta.url));
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://www.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (config.production) res.set('Strict-Transport-Security', 'max-age=31536000');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.path.startsWith('/api/')) {
    if (!isAllowedOrigin(req.headers.origin, config)) return next(new ApiError('invalid_origin', 403));
    if (!req.is('application/json')) return next(new ApiError('invalid_request', 415));
  }
  next();
});
app.use(express.json({ limit: '32kb' }));
const buckets = new Map();
const cleanup = setInterval(() => { for (const [key, entry] of buckets) if (entry.until < Date.now()) buckets.delete(key); }, 60000);
cleanup.unref();
function limit(prefix, max, windowMs) {
  return (req, res, next) => {
    const key = `${prefix}:${req.ip}`, now = Date.now();
    let entry = buckets.get(key);
    if (!entry || entry.until < now) { entry = { count: 0, until: now + windowMs }; buckets.set(key, entry); }
    if (++entry.count > max) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return next(new ApiError('too_many_requests', 429)); }
    next();
  };
}

app.get('/api/health', async (req, res) => { await pool.query('SELECT 1'); res.json({ ok: true, app:'awllahza-orders' }); });
app.get('/api/menu', async (req, res) => {
  const [categoryRows] = await pool.query('SELECT content FROM categories ORDER BY sort_order');
  const [productRows] = await pool.query('SELECT content, active FROM products ORDER BY sort_order');
  const settings = await getSettings();
  res.json({ restaurant: catalog.restaurant, currency: catalog.currency, categories: categoryRows.map(r => fromJson(r.content)), products: productRows.map(r => ({ ...fromJson(r.content), active: Boolean(r.active) })), orderingEnabled: config.orderingEnabled && isOpen(settings), settings, testMode: config.testMode, feesMinor: 0 });
});
app.post('/api/orders', limit('orders', 30, 10 * 60000), async (req, res) => {
  res.status(201).json(await createOrder(req.body, req.get('Idempotency-Key'), req.ip));
});
app.get('/api/order-status', limit('tracking', 120, 60000), async (req, res) => {
  const token = (req.get('Authorization') || '').replace(/^Bearer /, '');
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError('not_found', 404);
  const [rows] = await pool.execute('SELECT id,order_number,total_minor,fulfillment,table_number,status,is_test,created_at,order_notes,revision FROM orders WHERE tracking_token=?', [token]);
  if (!rows.length) throw new ApiError('not_found', 404);
  const row = rows[0];
  const [lines] = await pool.execute('SELECT product_id,variant_id,name_en,name_ar,variant_en,variant_ar,quantity,unit_price_minor FROM order_items WHERE order_id=? ORDER BY id', [row.id]);
  res.json({ orderNumber:row.order_number, totalMinor:row.total_minor, fulfillment:row.fulfillment, tableNumber:row.table_number, status:row.status, isTest:Boolean(row.is_test), notes:row.order_notes, revision:row.revision, createdAt:row.created_at.toISOString(), items:lines.map(i => ({ productId:i.product_id,variantId:i.variant_id,name:{en:i.name_en,ar:i.name_ar},variant:{en:i.variant_en,ar:i.variant_ar},quantity:i.quantity,unitPriceMinor:i.unit_price_minor })) });
});
app.patch('/api/order-status', limit('order-edit',30,10*60000), async(req,res)=>{
  const token=(req.get('Authorization')||'').replace(/^Bearer /,'');
  res.json(await changePendingOrder(token,req.body));
});
app.post('/api/admin/login', limit('login', 10, 15 * 60000), async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.length > 80 || typeof password !== 'string' || password.length > 200) throw new ApiError('invalid_credentials', 401);
  const [rows] = await pool.execute('SELECT * FROM admins WHERE username=?', [username.trim()]);
  const valid = await verifyPassword(password, rows[0]?.password_hash || dummyHash);
  if (!rows.length || !valid) throw new ApiError('invalid_credentials', 401);
  const token = randomBytes(32).toString('hex');
  await pool.execute('INSERT INTO admin_sessions (token_hash,admin_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))', [tokenHash(token), rows[0].id]);
  await pool.execute('DELETE FROM admin_sessions WHERE expires_at<UTC_TIMESTAMP()');
  setSessionCookie(res, token); res.json({ username: rows[0].username });
});
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ username: req.admin.username, testMode: config.testMode }));
app.post('/api/admin/logout', requireAdmin, async (req, res) => {
  await pool.execute('DELETE FROM admin_sessions WHERE token_hash=?', [tokenHash(sessionToken(req))]);
  setSessionCookie(res, '', 0); res.json({ ok: true });
});
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  const status = req.query.status || 'all', page = Number(req.query.page || 1);
  if (!['all', ...Object.keys(transitions)].includes(status) || !Number.isInteger(page) || page < 1 || page > 100000) throw new ApiError('invalid_request');
  res.json(await listOrders({ status, page }));
});
app.get('/api/admin/events', requireAdmin, async (req,res) => {
  const after=req.query.after;
  if (after !== undefined && (typeof after !== 'string' || !/^\d{1,16}$/.test(after) || !Number.isSafeInteger(Number(after)))) throw new ApiError('invalid_request');
  const initial=after===undefined;
  const [rows]=await pool.execute(`SELECT e.id,e.kind,e.created_at,o.order_number FROM order_events e JOIN orders o ON o.id=e.order_id ${initial?'':'WHERE e.id>?'} ORDER BY e.id ${initial?'DESC':'ASC'} LIMIT ${initial?20:100}`,initial?[]:[after]);
  if(initial) rows.reverse();
  res.json({events:rows.map(row=>({id:String(row.id),kind:row.kind,orderNumber:row.order_number,createdAt:row.created_at.toISOString()})),cursor:String(rows.at(-1)?.id??after??0)});
});
app.patch('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const { status, paymentStatus, revision } = req.body || {};
  if (!Object.hasOwn(transitions, status) || !['paid', 'unpaid'].includes(paymentStatus) || !Number.isSafeInteger(revision) || revision < 0) throw new ApiError('invalid_request');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT status,revision FROM orders WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows.length) throw new ApiError('not_found', 404);
    if (rows[0].revision !== revision) throw new ApiError('status_conflict',409);
    if (status !== rows[0].status && !transitions[rows[0].status].includes(status)) throw new ApiError('status_conflict', 409);
    await connection.execute('UPDATE orders SET status=?,payment_status=?,revision=revision+1 WHERE id=?', [status, paymentStatus, req.params.id]);
    await connection.commit(); res.json({ ok: true });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
});
app.get('/api/admin/catalog', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT content,active FROM products ORDER BY sort_order');
  res.json({ products: rows.map(row => ({ ...fromJson(row.content), active:Boolean(row.active) })), categories: catalog.categories, settings:await getSettings() });
});
app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT content FROM products WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows.length) throw new ApiError('not_found', 404);
    const product = validateProduct(req.body, fromJson(rows[0].content));
    await connection.execute('UPDATE products SET content=?,active=? WHERE id=?', [JSON.stringify(product),product.active,req.params.id]);
    await connection.commit(); res.json({ product });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
});
app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
  const { opensAt, closesAt, acceptingOrders } = req.body || {};
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(opensAt) || !validTime(closesAt) || opensAt === closesAt || typeof acceptingOrders !== 'boolean') throw new ApiError('invalid_request');
  const settings = { opensAt, closesAt, acceptingOrders, timeZone:'Asia/Riyadh' };
  await pool.execute('UPDATE restaurant_settings SET content=? WHERE id=1', [JSON.stringify(settings)]);
  res.json({ settings });
});

app.get('/admin', (req, res) => res.sendFile('admin.html', { root: publicPath }));
app.get('/my-orders', (req, res) => res.sendFile('my-orders.html', { root: publicPath }));
app.get('/track', (req, res) => res.sendFile('track.html', { root: publicPath }));
app.use(express.static(publicPath, { dotfiles: 'deny', maxAge: 0 }));
app.use('/api', (req, res, next) => next(new ApiError('not_found', 404)));
app.use((error, req, res, next) => {
  const status = error instanceof ApiError ? error.status : error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500;
  // Do not log SQL statements or customer payloads.
  if (status === 500) console.error('Request failed:', error.code || error.name);
  res.status(status).json({ error: error instanceof ApiError ? error.code : status === 400 ? 'invalid_request' : 'server_error' });
});
await pool.query('SELECT 1');
await migrateOrders();
const server = app.listen(config.port, config.host, () => {
  if (config.port === 0 && !config.production) config.origin = `http://${config.host}:${server.address().port}`;
  console.log(`Awl Lahza listening at ${config.origin} (${config.testMode ? 'test orders' : 'live orders'})`);
  process.send?.({ listening:true, origin:config.origin });
});
async function stop() { server.close(); await pool.end(); clearInterval(cleanup); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
