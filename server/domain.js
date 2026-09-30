import { createHash } from 'node:crypto';

export class ApiError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
const fail = code => { throw new ApiError(code); };
const text = (value, max, code) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u001f\u007f<>]/u.test(value)) fail(code);
  return value.trim();
};
export function digits(value) {
  return value.replace(/[٠-٩۰-۹]/g, d => String(d.charCodeAt(0) - (d >= '۰' ? 0x6f0 : 0x660)));
}
export function validateNotes(value = '') {
  if (typeof value !== 'string' || value.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) fail('invalid_notes');
  return value.trim();
}
export function validateCart(body) {
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 50) fail('invalid_items');
  const seen = new Set();
  const items = body.items.map(item => {
    if (!item || typeof item.productId !== 'string' || typeof item.variantId !== 'string' || item.productId.length > 120 || item.variantId.length > 32) fail('invalid_items');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) fail('invalid_quantity');
    const key = `${item.productId}:${item.variantId}`;
    if (seen.has(key)) fail('invalid_items');
    seen.add(key);
    return { productId: item.productId, variantId: item.variantId, quantity: item.quantity };
  }).sort((a, b) => `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`));
  if (!Number.isSafeInteger(body.expectedTotalMinor) || body.expectedTotalMinor < 1) fail('invalid_total');
  return { items, expectedTotalMinor:body.expectedTotalMinor, notes:validateNotes(body.notes) };
}
export function validateOrder(body) {
  if (!body || typeof body !== 'object') fail('invalid_order');
  const customer = body.customer || {};
  const firstName = text(customer.firstName, 80, 'invalid_name');
  const lastName = text(customer.lastName, 80, 'invalid_name');
  const phone = digits(text(customer.phone, 30, 'invalid_phone')).replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(phone)) fail('invalid_phone');
  if (!['dine_in', 'pickup'].includes(body.fulfillment)) fail('invalid_fulfillment');
  let tableNumber = null;
  if (body.fulfillment === 'dine_in') {
    tableNumber = digits(text(body.tableNumber, 12, 'invalid_table'));
    if (!/^[0-9]{1,4}$/.test(tableNumber) || Number(tableNumber) === 0) fail('invalid_table');
  }
  if (body.paymentMethod !== 'cash') fail('cash_only');
  if (!['en', 'ar'].includes(body.language)) fail('invalid_language');
  return { customer: { firstName, lastName, phone }, fulfillment: body.fulfillment, tableNumber, paymentMethod: 'cash', language: body.language, ...validateCart(body) };
}
export const orderHash = order => createHash('sha256').update(JSON.stringify(order)).digest('hex');

export function priceOrder(order, products) {
  const lines = order.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product?.active) throw new ApiError('product_unavailable', 409);
    const variant = product.variants.find(v => v.id === item.variantId);
    if (!variant) throw new ApiError('product_unavailable', 409);
    if (!Number.isSafeInteger(variant.priceMinor) || variant.priceMinor < 1) throw new Error('Invalid catalog price');
    return { ...item, name: product.name, variant: variant.name, unitPriceMinor: variant.priceMinor, calories: variant.calories };
  });
  const totalMinor = lines.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
  if (totalMinor !== order.expectedTotalMinor) throw new ApiError('price_changed', 409);
  return { lines, totalMinor };
}

export const transitions = {
  new: ['preparing', 'cancelled'], preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'], completed: [], cancelled: [],
};
