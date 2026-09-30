import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateOrder, validateCart, priceOrder, orderHash } from '../server/domain.js';
import { isOpen, defaultSettings } from '../server/settings.js';
import { validateProduct } from '../server/catalog-validation.js';
const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const draft = () => ({customer:{firstName:'Test',lastName:'Customer',phone:'+966500000000'},fulfillment:'pickup',tableNumber:null,paymentMethod:'cash',language:'en',items:[{productId:'shawarma-small-shawarma',variantId:'cheese',quantity:2}],expectedTotalMinor:1400});

test('all source products and price alternatives imported', () => {
  assert.equal(catalog.categories.length,6); assert.equal(catalog.products.length,26);
  assert.equal(catalog.products.reduce((n,p) => n+p.variants.length,0),41);
  assert.deepEqual(catalog.products.find(p => p.id === 'falafel-falafel-plate').variants.map(v => v.id), ['regular']);
  for (const p of catalog.products) { assert.ok(p.name.en && p.name.ar && p.description.en && p.description.ar); assert.equal(p.variants[0].priceMinor,p.priceMinor); }
  assert.equal(catalog.products.find(p => p.id === 'falafel-falafel-with-egg').variants[1].priceMinor,600);
  assert.equal(catalog.products.find(p => p.id === 'drinks-mango-juice').variants[1].priceMinor,500);
});
test('server ignores forged item prices and calculates cash total', () => {
  const body = draft(); body.items[0].unitPriceMinor = 1;
  const priced = priceOrder(validateOrder(body),catalog.products);
  assert.equal(priced.totalMinor,1400); assert.equal(priced.lines[0].unitPriceMinor,700);
});
test('changed expected prices require another customer review', () => {
  const body = draft(); body.expectedTotalMinor = 2;
  assert.throws(() => priceOrder(validateOrder(body),catalog.products),{code:'price_changed'});
});
test('inactive products and missing variants cannot be ordered', () => {
  const body = validateOrder(draft());
  assert.throws(() => priceOrder(body,catalog.products.map(p => ({...p,active:false}))),{code:'product_unavailable'});
  body.items[0].variantId = 'fake'; assert.throws(() => priceOrder(body,catalog.products),{code:'product_unavailable'});
});
test('dine-in requires a valid table, with Arabic numerals supported', () => {
  const body = draft(); body.fulfillment = 'dine_in';
  assert.throws(() => validateOrder(body),{code:'invalid_table'});
  body.tableNumber = '١٢'; body.customer.phone = '٠٥٠٠٠٠٠٠٠٠';
  assert.equal(validateOrder(body).tableNumber,'12'); assert.equal(validateOrder(body).customer.phone,'0500000000');
});
test('fractional, negative, excessive and duplicated quantities rejected', () => {
  for (const quantity of [-1,0,1.5,100,'2',null]) { const body=draft(); body.items[0].quantity=quantity; assert.throws(() => validateOrder(body),{code:'invalid_quantity'}); }
  const body=draft(); body.items.push(body.items[0]); assert.throws(() => validateOrder(body),{code:'invalid_items'});
});
test('cash-only checkout and English/Arabic-only language', () => {
  const body=draft(); body.paymentMethod='card'; assert.throws(() => validateOrder(body),{code:'cash_only'});
  body.paymentMethod='cash'; body.language='tr'; assert.throws(() => validateOrder(body),{code:'invalid_language'});
});
test('canonical request hash ignores client item order', () => {
  const body=draft(); body.items.push({productId:'drinks-pepsi',variantId:'regular',quantity:1}); body.expectedTotalMinor=1700;
  const first=orderHash(validateOrder(body)); body.items.reverse(); assert.equal(orderHash(validateOrder(body)),first);
});
test('Riyadh order window spans midnight and excludes 02:00', () => {
  for (const [utc,expected] of [['2026-09-23T13:29:59Z',false],['2026-09-23T13:30:00Z',true],['2026-09-23T21:01:00Z',true],['2026-09-23T22:59:59Z',true],['2026-09-23T23:00:00Z',false],['2026-09-24T07:00:00Z',false]]) assert.equal(isOpen(defaultSettings,new Date(utc)),expected,utc);
  assert.equal(isOpen({...defaultSettings,acceptingOrders:false},new Date('2026-09-23T18:00:00Z')),false);
});
test('catalog editing validates prices, calories and both translations', () => {
  const product=catalog.products[0], edit=structuredClone(product); edit.variants[0].priceMinor=650;
  assert.equal(validateProduct(edit,product).priceMinor,650);
  edit.variants[0].priceMinor=-1; assert.throws(() => validateProduct(edit,product),{code:'invalid_product'});
  edit.variants[0].priceMinor=650; edit.name.ar=''; assert.throws(() => validateProduct(edit,product),{code:'invalid_product'});
});
test('optional order notes retain English, Arabic and line breaks with a length limit',()=>{
  const body=draft();body.notes=' No pickles\nالصوص على الجانب ';
  assert.equal(validateOrder(body).notes,'No pickles\nالصوص على الجانب');
  assert.equal(validateCart({...body,notes:undefined}).notes,'');
  for(const notes of ['x'.repeat(1001),42,{},'bad\u0000note'])assert.throws(()=>validateCart({...body,notes}),{code:'invalid_notes'});
});
