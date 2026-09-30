import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { hashPassword } from '../../server/auth.js';

const database = process.env.MYSQL_TEST_DATABASE || 'awllahza_test';
if (!database.endsWith('_test')) throw new Error('Integration tests require a separate database ending in _test.');
const root = fileURLToPath(new URL('../../',import.meta.url));
const env = {...process.env,MYSQL_DATABASE:database,PORT:'0',HOST:'127.0.0.1',APP_ORIGIN:'http://127.0.0.1:0',NODE_ENV:'test',TEST_MODE:'true',ORDERING_ENABLED:'true'};
const username=`qa_${randomBytes(8).toString('hex')}`, password=randomBytes(24).toString('hex');
let origin;
let db,server,cookie,menu,receipt,orderId;
const orderIds=[];
async function request(path,{method='GET',body,headers={}}={}) {
  const response=await fetch(origin+path,{method,headers:{Origin:origin,...(cookie ? {Cookie:cookie}:{}),...(body ? {'Content-Type':'application/json'}:{}),...headers},...(body ? {body:JSON.stringify(body)}:{})});
  return {status:response.status,data:await response.json(),headers:response.headers};
}
const draft=()=>({customer:{firstName:'Integration',lastName:'Test',phone:'+966500000000'},fulfillment:'pickup',language:'en',paymentMethod:'cash',items:[{productId:'shawarma-small-shawarma',variantId:'cheese',quantity:2}],expectedTotalMinor:1400,notes:'No pickles\nالصوص على الجانب'});
async function createFixture(){
  const result=await request('/api/orders',{method:'POST',body:draft(),headers:{'Idempotency-Key':randomUUID()}});
  assert.equal(result.status,201,JSON.stringify(result.data));
  const [rows]=await db.execute('SELECT id FROM orders WHERE order_number=?',[result.data.orderNumber]);orderIds.push(rows[0].id);
  return {...result.data,id:rows[0].id,headers:{Authorization:`Bearer ${result.data.trackingToken}`}};
}

before(async()=>{
  const setup=spawnSync(process.execPath,['scripts/setup-db.js'],{cwd:root,env,encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);
  db=await mysql.createConnection({host:env.MYSQL_HOST,port:Number(env.MYSQL_PORT),user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,database});
  await db.execute('INSERT INTO admins (id,username,password_hash) VALUES (?,?,?)',[randomUUID(),username,await hashPassword(password)]);
  // Open around the current minute so integration tests are independent of wall-clock time.
  const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  const minute=Number(local.slice(0,2))*60+Number(local.slice(3));
  const time=m=>`${String(Math.floor(((m+1440)%1440)/60)).padStart(2,'0')}:${String((m+1440)%60).padStart(2,'0')}`;
  await db.execute('UPDATE restaurant_settings SET content=? WHERE id=1',[JSON.stringify({opensAt:time(minute-60),closesAt:time(minute+60),timeZone:'Asia/Riyadh',acceptingOrders:true})]);
  server=spawn(process.execPath,['server/index.js'],{cwd:root,env,stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  let output='';server.stderr.on('data',chunk=>output+=chunk);
  origin=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`Test server failed to start: ${output}`)),5000);
    server.once('message',message=>{clearTimeout(timer);resolve(message.origin);});
    server.once('error',error=>{clearTimeout(timer);reject(error);});
    server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Test server exited (${code}): ${output}`));});
  });
});
after(async()=>{
  server?.kill();
  if(db){
    for(const id of orderIds){await db.execute('DELETE FROM order_items WHERE order_id=?',[id]);await db.execute('DELETE FROM orders WHERE id=?',[id]);}
    await db.execute('DELETE FROM admin_sessions WHERE admin_id IN (SELECT id FROM admins WHERE username=?)',[username]);
    await db.execute('DELETE FROM admins WHERE username=?',[username]);
    await db.end();
  }
});
test('catalog loads from actual MySQL and is bilingual',async()=>{
  const result=await request('/api/menu');assert.equal(result.status,200);menu=result.data;assert.equal(menu.products.length,26);assert.equal(menu.feesMinor,0);assert.equal(menu.currency,'SAR');
});
test('admin and product edits are protected',async()=>{
  assert.equal((await request('/api/admin/events')).status,401);
  assert.equal((await request('/api/admin/orders')).status,401);
  assert.equal((await request('/api/admin/products/shawarma-small-shawarma',{method:'PATCH',body:{}})).status,401);
  assert.equal((await request('/api/admin/login',{method:'POST',body:{username,password:'incorrect'}})).status,401);
});
test('writes reject foreign origins',async()=>{
  assert.equal((await request('/api/orders',{method:'POST',body:draft(),headers:{Origin:'https://foreign.example','Idempotency-Key':randomUUID()}})).status,403);
});
test('cash order commits once under concurrent double submission',async()=>{
  const key=randomUUID();
  const results=await Promise.all([1,2].map(()=>request('/api/orders',{method:'POST',body:draft(),headers:{'Idempotency-Key':key}})));
  for(const r of results)assert.equal(r.status,201,JSON.stringify(r.data));
  receipt=results[0].data;assert.equal(receipt.orderNumber,results[1].data.orderNumber);assert.equal(receipt.trackingToken,results[1].data.trackingToken);assert.equal(receipt.totalMinor,1400);
  const [rows]=await db.execute('SELECT id FROM orders WHERE idempotency_key=?',[key]);assert.equal(rows.length,1);orderId=rows[0].id;orderIds.push(orderId);
  const [items]=await db.execute('SELECT * FROM order_items WHERE order_id=?',[orderId]);assert.equal(items.length,1);assert.equal(items[0].quantity,2);
  const changed=draft();changed.customer.firstName='Different';assert.equal((await request('/api/orders',{method:'POST',body:changed,headers:{'Idempotency-Key':key}})).status,409);
});
test('tracking requires an unguessable token and excludes contact details',async()=>{
  assert.equal((await request('/api/order-status')).status,404);
  const result=await request('/api/order-status',{headers:{Authorization:`Bearer ${receipt.trackingToken}`}});assert.equal(result.status,200);assert.equal(result.data.status,'new');assert.equal(result.data.customer,undefined);assert.equal(result.data.phone,undefined);assert.equal(result.data.items[0].name.ar,'شاورما صغير');
  assert.ok(Math.abs(Date.now()-Date.parse(result.data.createdAt))<10000,'Timestamp must be UTC, not reinterpreted local time');
  assert.equal(result.data.notes,draft().notes);
});
test('admin session uses HttpOnly SameSite cookie',async()=>{
  const result=await request('/api/admin/login',{method:'POST',body:{username,password}});assert.equal(result.status,200);
  const set=result.headers.get('set-cookie');assert.match(set,/HttpOnly/i);assert.match(set,/SameSite=Strict/i);cookie=set.split(';')[0];
  assert.equal((await request('/api/admin/session')).status,200);
  const orders=await request('/api/admin/orders');assert.ok(orders.data.orders.some(o=>o.id===orderId));assert.equal(orders.data.orders.find(o=>o.id===orderId).notes,draft().notes);
});
test('restaurant must accept before ready and customer sees each change',async()=>{
  const update=async status=>{
    const latest=await request('/api/order-status',{headers:{Authorization:`Bearer ${receipt.trackingToken}`}});
    return request(`/api/admin/orders/${orderId}`,{method:'PATCH',body:{status,paymentStatus:'unpaid',revision:latest.data.revision}});
  };
  assert.equal((await update('ready')).status,409);
  for(const status of ['preparing','ready','completed']){assert.equal((await update(status)).status,200);const tracked=await request('/api/order-status',{headers:{Authorization:`Bearer ${receipt.trackingToken}`}});assert.equal(tracked.data.status,status);}
  assert.equal((await update('new')).status,409);
});
test('menu changes persist, invalidate stale cart and preserve historical price',async()=>{
  const p=structuredClone(menu.products[0]);p.variants[1].priceMinor=900;p.name.en='Updated product';
  assert.equal((await request(`/api/admin/products/${p.id}`,{method:'PATCH',body:p})).status,200);
  const fresh=await request('/api/menu');assert.equal(fresh.data.products[0].variants[1].priceMinor,900);
  const stale=await request('/api/orders',{method:'POST',body:draft(),headers:{'Idempotency-Key':randomUUID()}});assert.equal(stale.status,409);assert.equal(stale.data.error,'price_changed');
  const tracked=await request('/api/order-status',{headers:{Authorization:`Bearer ${receipt.trackingToken}`}});assert.equal(tracked.data.totalMinor,1400);assert.equal(tracked.data.items[0].name.en,'Small Shawarma');
  p.active=false;await request(`/api/admin/products/${p.id}`,{method:'PATCH',body:p});
  assert.equal((await request('/api/orders',{method:'POST',body:draft(),headers:{'Idempotency-Key':randomUUID()}})).data.error,'product_unavailable');
  await request(`/api/admin/products/${p.id}`,{method:'PATCH',body:menu.products[0]});
});
test('dine-in requires table and cash, with no partial orders on rejection',async()=>{
  const body=draft();body.fulfillment='dine_in';
  assert.equal((await request('/api/orders',{method:'POST',body,headers:{'Idempotency-Key':randomUUID()}})).data.error,'invalid_table');
  body.tableNumber='5';body.paymentMethod='card';assert.equal((await request('/api/orders',{method:'POST',body,headers:{'Idempotency-Key':randomUUID()}})).data.error,'cash_only');
});
test('pending customer edits persist notes and totals under the same order number',async()=>{
  const fixture=await createFixture();
  const body={action:'update',revision:0,items:[{productId:'shawarma-small-shawarma',variantId:'regular',quantity:3}],expectedTotalMinor:1800,notes:'No <onion> & sauce\nبدون مخلل'};
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).status,200);
  const updated=await request('/api/order-status',{headers:fixture.headers});assert.equal(updated.data.orderNumber,fixture.orderNumber);assert.equal(updated.data.totalMinor,1800);assert.equal(updated.data.notes,body.notes);assert.equal(updated.data.revision,1);assert.equal(updated.data.status,'new');
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).data.error,'order_changed');
  const staleAdmin=await request(`/api/admin/orders/${fixture.id}`,{method:'PATCH',body:{status:'preparing',paymentStatus:'unpaid',revision:0}});assert.equal(staleAdmin.status,409);
  const [lines]=await db.execute('SELECT quantity,unit_price_minor FROM order_items WHERE order_id=?',[fixture.id]);assert.equal(lines.length,1);assert.equal(lines[0].quantity,3);assert.equal(lines[0].unit_price_minor,600);
});
test('customer cannot edit or cancel without a token or after restaurant acceptance',async()=>{
  const body={action:'cancel',revision:0};
  assert.equal((await request('/api/order-status',{method:'PATCH',body})).status,404);
  const fixture=await createFixture();
  assert.equal((await request(`/api/admin/orders/${fixture.id}`,{method:'PATCH',body:{status:'preparing',paymentStatus:'unpaid',revision:0}})).status,200);
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).data.error,'order_locked');
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body:{...draft(),action:'update',revision:1}})).data.error,'order_locked');
});
test('pending cancellation and repeated cancellation succeed without deleting the order',async()=>{
  const fixture=await createFixture(),body={action:'cancel',revision:0};
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).status,200);
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).status,200);
  const tracked=await request('/api/order-status',{headers:fixture.headers});assert.equal(tracked.data.status,'cancelled');assert.equal(tracked.data.totalMinor,1400);
});
test('simultaneous acceptance and customer edit or cancellation never both succeed',async()=>{
  for(const action of ['cancel','update']){
    const fixture=await createFixture();
    const body=action==='cancel'?{action,revision:0}:{...draft(),action,revision:0,items:[{productId:'shawarma-small-shawarma',variantId:'regular',quantity:1}],expectedTotalMinor:600};
    const results=await Promise.all([request(`/api/admin/orders/${fixture.id}`,{method:'PATCH',body:{status:'preparing',paymentStatus:'unpaid',revision:0}}),request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    const tracked=await request('/api/order-status',{headers:fixture.headers});assert.equal(tracked.data.revision,1);
    if(results[0].status===200){assert.equal(tracked.data.status,'preparing');assert.equal(tracked.data.totalMinor,1400);}else{assert.equal(tracked.data.status,action==='cancel'?'cancelled':'new');assert.equal(tracked.data.totalMinor,action==='cancel'?1400:600);}
  }
});
test('invalid edits roll back without losing any original order lines',async()=>{
  const fixture=await createFixture();
  const body={...draft(),action:'update',revision:0,expectedTotalMinor:1};
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).data.error,'price_changed');
  const tracked=await request('/api/order-status',{headers:fixture.headers});assert.equal(tracked.data.revision,0);assert.equal(tracked.data.totalMinor,1400);assert.equal(tracked.data.items[0].quantity,2);
});
test('localhost origin works and IP is server-recorded, admin-only',async()=>{
  const key=randomUUID();
  const result=await request('/api/orders',{method:'POST',body:draft(),headers:{Origin:origin.replace('127.0.0.1','localhost'),'Idempotency-Key':key,'X-Forwarded-For':'203.0.113.99'}});
  assert.equal(result.status,201,JSON.stringify(result.data));
  const [rows]=await db.execute('SELECT id,client_ip FROM orders WHERE idempotency_key=?',[key]);orderIds.push(rows[0].id);
  assert.equal(rows[0].client_ip,'127.0.0.1');
  const orders=await request('/api/admin/orders');assert.equal(orders.data.orders.find(o=>o.id===rows[0].id).clientIp,'127.0.0.1');
  const tracked=await request('/api/order-status',{headers:{Authorization:'Bearer '+result.data.trackingToken}});assert.equal(tracked.data.clientIp,undefined);
  assert.equal((await request('/api/order-status',{headers:{'X-Forwarded-For':'127.0.0.1'}})).status,404);
});

test('notification cursor preserves creates, edits and cancellation exactly once',async()=>{
  const baseline=await request('/api/admin/events');assert.equal(baseline.status,200);
  const fixture=await createFixture();
  const body={...draft(),action:'update',revision:0,notes:'Notification edit'};
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).status,200);
  assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body})).status,409);
  for(let i=0;i<2;i++)assert.equal((await request('/api/order-status',{method:'PATCH',headers:fixture.headers,body:{action:'cancel',revision:1}})).status,200);
  const changed=await request('/api/admin/events?after='+baseline.data.cursor);
  assert.deepEqual(changed.data.events.map(e=>e.kind),['created','edited','cancelled']);
  assert.ok(changed.data.events.every(e=>e.orderNumber===fixture.orderNumber));
  assert.equal((await request('/api/admin/events?after='+changed.data.cursor)).data.events.length,0);
  assert.equal((await request('/api/admin/events?after=-1')).status,400);
  const [events]=await db.execute('SELECT kind FROM order_events WHERE order_id=?',[orderId]);
  assert.deepEqual(events.map(e=>e.kind),['created'],'double submission emits one event');
});

test('disabled ordering enforced by server even on stale menus',async()=>{
  await request('/api/admin/settings',{method:'PATCH',body:{opensAt:'16:30',closesAt:'02:00',acceptingOrders:false}});
  assert.equal((await request('/api/orders',{method:'POST',body:draft(),headers:{'Idempotency-Key':randomUUID()}})).data.error,'ordering_closed');
  await request('/api/admin/settings',{method:'PATCH',body:{opensAt:'16:30',closesAt:'02:00',acceptingOrders:true}});
});
test('logout revokes the server-side session',async()=>{
  assert.equal((await request('/api/admin/logout',{method:'POST',body:{}})).status,200);
  assert.equal((await request('/api/admin/orders')).status,401);
});
