import { randomUUID, randomBytes } from 'node:crypto';
import { pool, fromJson } from './db.js';
import { config } from './config.js';
import { ApiError, validateOrder, validateCart, orderHash, priceOrder } from './domain.js';
import { getSettings, isOpen } from './settings.js';

const receipt = row => ({ orderNumber: row.order_number, totalMinor: row.total_minor, currency: row.currency, fulfillment: row.fulfillment, tableNumber: row.table_number, status: row.status, isTest: Boolean(row.is_test) });

async function recordEvent(connection, orderId, kind) {
  // Allocate notification IDs in commit order so cursor polling cannot skip a concurrent commit.
  await connection.query('SELECT id FROM restaurant_settings WHERE id=1 FOR UPDATE');
  await connection.execute('INSERT INTO order_events (order_id,kind) VALUES (?,?)',[orderId,kind]);
}

export async function createOrder(body, key, clientIp = null) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key || '')) throw new ApiError('invalid_request_key');
  const order = validateOrder(body), hash = orderHash(order);
  const existing = async connection => {
    const [rows] = await connection.execute('SELECT * FROM orders WHERE idempotency_key=?', [key]);
    if (!rows.length) return null;
    if (rows[0].request_hash !== hash) throw new ApiError('request_conflict', 409);
    return { ...receipt(rows[0]), trackingToken: rows[0].tracking_token };
  };
  const prior = await existing(pool);
  if (prior) return prior;
  if (!config.orderingEnabled || !isOpen(await getSettings())) throw new ApiError('ordering_closed', 503);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const ids = [...new Set(order.items.map(i => i.productId))].sort();
    const [rows] = await connection.execute(`SELECT content, active FROM products WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id FOR SHARE`, ids);
    const { lines, totalMinor } = priceOrder(order, rows.map(row => ({ ...fromJson(row.content), active: Boolean(row.active) })));
    const id = randomUUID(), number = `AL-${randomBytes(4).toString('hex').toUpperCase()}`, trackingToken = randomBytes(32).toString('hex');
    await connection.execute('INSERT INTO orders (id,order_number,idempotency_key,request_hash,tracking_token,first_name,last_name,phone,fulfillment,table_number,language,total_minor,is_test,order_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [id, number, key, hash, trackingToken, order.customer.firstName, order.customer.lastName, order.customer.phone, order.fulfillment, order.tableNumber, order.language, totalMinor, config.testMode, order.notes]);
    for (const line of lines) {
      await connection.execute('INSERT INTO order_items (order_id,product_id,variant_id,name_en,name_ar,variant_en,variant_ar,unit_price_minor,quantity,calories) VALUES (?,?,?,?,?,?,?,?,?,?)', [id,line.productId,line.variantId,line.name.en,line.name.ar,line.variant.en,line.variant.ar,line.unitPriceMinor,line.quantity,line.calories]);
    }
    await connection.execute('UPDATE orders SET client_ip=? WHERE id=?',[clientIp,id]);
    await recordEvent(connection,id,'created');
    await connection.commit();
    return { orderNumber: number, totalMinor, currency: 'SAR', fulfillment: order.fulfillment, tableNumber: order.tableNumber, status: 'new', isTest: config.testMode, trackingToken };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const previous = await existing(pool);
      if (previous) return previous;
    }
    throw error;
  } finally { connection.release(); }
}

export async function listOrders({ status, page = 1 }) {
  const values = [], where = [];
  if (status && status !== 'all') { where.push('status=?'); values.push(status); }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [count] = await pool.execute(`SELECT COUNT(*) AS total FROM orders${clause}`, values);
  const [rows] = await pool.query(`SELECT * FROM orders${clause} ORDER BY created_at DESC, id DESC LIMIT 40 OFFSET ?`, [...values, (page - 1) * 40]);
  if (!rows.length) return { orders: [], total: count[0].total, page };
  const [items] = await pool.query(`SELECT * FROM order_items WHERE order_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`, rows.map(r => r.id));
  return { total: count[0].total, page, orders: rows.map(row => ({
    id: row.id, ...receipt(row), customer: { firstName: row.first_name, lastName: row.last_name, phone: row.phone },
    paymentStatus: row.payment_status, notes:row.order_notes, revision:row.revision, clientIp:row.client_ip, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
    items: items.filter(i => i.order_id === row.id).map(i => ({ name: { en:i.name_en, ar:i.name_ar }, variant: { en:i.variant_en, ar:i.variant_ar }, quantity:i.quantity, unitPriceMinor:i.unit_price_minor })),
  })) };
}

export async function changePendingOrder(token, body) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw new ApiError('not_found',404);
  if (!body || !['update','cancel'].includes(body.action) || !Number.isSafeInteger(body.revision) || body.revision < 0) throw new ApiError('invalid_request');
  const draft = body.action === 'update' ? validateCart(body) : null;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT id,status,revision FROM orders WHERE tracking_token=? FOR UPDATE',[token]);
    if (!rows.length) throw new ApiError('not_found',404);
    const order=rows[0];
    if (body.action === 'cancel' && order.status === 'cancelled') { await connection.commit(); return {ok:true}; }
    if (order.status !== 'new') throw new ApiError('order_locked',409);
    if (order.revision !== body.revision) throw new ApiError('order_changed',409);
    if (body.action === 'cancel') {
      await connection.execute("UPDATE orders SET status='cancelled',revision=revision+1 WHERE id=?",[order.id]);
    } else {
      if (!config.orderingEnabled || !isOpen(await getSettings())) throw new ApiError('ordering_closed',503);
      const ids=[...new Set(draft.items.map(i=>i.productId))].sort();
      const [products]=await connection.execute(`SELECT content,active FROM products WHERE id IN (${ids.map(()=>'?').join(',')}) ORDER BY id FOR SHARE`,ids);
      const priced=priceOrder(draft,products.map(row=>({...fromJson(row.content),active:Boolean(row.active)})));
      await connection.execute('DELETE FROM order_items WHERE order_id=?',[order.id]);
      for(const line of priced.lines) await connection.execute('INSERT INTO order_items (order_id,product_id,variant_id,name_en,name_ar,variant_en,variant_ar,unit_price_minor,quantity,calories) VALUES (?,?,?,?,?,?,?,?,?,?)',[order.id,line.productId,line.variantId,line.name.en,line.name.ar,line.variant.en,line.variant.ar,line.unitPriceMinor,line.quantity,line.calories]);
      await connection.execute('UPDATE orders SET total_minor=?,order_notes=?,revision=revision+1 WHERE id=?',[priced.totalMinor,draft.notes,order.id]);
    }
    await recordEvent(connection,order.id,body.action==='cancel'?'cancelled':'edited');
    await connection.commit(); return {ok:true};
  } catch(error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
