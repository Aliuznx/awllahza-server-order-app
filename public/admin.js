import { setupNotifications } from './admin-notifications.js';
import { notesHTML } from './order-controls.js';
import { api, t, tr, esc, money, date, initLanguage, message } from './shared.js';
const $ = id => document.getElementById(id);
let signedIn = false, view = 'orders', filter = 'all', page = 1, orderData = null, catalog = null, editing = null, busy = false, loading = false, session = null;
const states = ['new','preparing','ready','completed','cancelled'];
const notifications=setupNotifications({isSignedIn:()=>signedIn,onOrdersChanged:()=>{if(view==='orders'&&!busy)load();},onUnauthorized:()=>showLogin()});
function showLogin() { notifications.reset(); signedIn = false; $('login-panel').hidden = false; $('admin-panel').hidden = true; $('admin-content').innerHTML = ''; }
function showPanel() { signedIn = true; notifications.start(); $('login-panel').hidden = true; $('admin-panel').hidden = false; }
async function handleError(error) { if (error.status === 401) { showLogin(); message($('login-error'),'unauthorized'); } else message($('admin-notice'),error.code); }
async function load() {
  if (!signedIn || loading) return;
  loading = true;
  const requestedView = view;
  try {
    if (requestedView === 'orders') {
      const data = await api(`/api/admin/orders?status=${filter}&page=${page}`);
      if (view === requestedView) { const changed=JSON.stringify(orderData)!==JSON.stringify(data); orderData = data; if(changed||!$('admin-content').querySelector('.orders-grid'))renderOrders(); }
    } else {
      const data = await api('/api/admin/catalog');
      if (view === requestedView) { catalog = data; renderCatalog(); }
    }
    $('admin-notice').hidden = true;
  } catch (error) { await handleError(error); }
  finally { loading = false; }
}
function renderOrders() {
  if (!orderData) return;
  $('admin-content').innerHTML = `<div class="toolbar"><h1>${t('orders')} <span class="muted">(${orderData.total})</span></h1><div><span class="muted">${t('live')}</span> <button class="secondary" data-refresh>${t('refresh')}</button></div></div>${session?.testMode ? `<div class="notice test-notice">${t('testNotice')}</div>` : ''}<div class="filter-list">${['all',...states].map(s => `<button data-filter="${s}" class="${filter === s ? 'on' : ''}" aria-pressed="${filter === s}">${t(s)}</button>`).join('')}</div><div class="orders-grid">${!orderData.orders.length ? `<div class="panel"><h2>${t('noOrders')}</h2><p class="muted">${t('noOrdersHint')}</p></div>` : orderData.orders.map(order => `<article class="panel"><div class="order-head"><h2><bdi>${esc(order.orderNumber)}</bdi></h2><span class="status-pill status-${order.status}">${t(order.status)}</span></div><p class="muted">${esc(date(order.createdAt))}</p><p class="muted order-ip">${t('sourceIp')}: <bdi>${esc(order.clientIp||'—')}</bdi></p><div class="order-customer"><strong>${esc(order.customer.firstName)} ${esc(order.customer.lastName)}</strong><a href="tel:${esc(order.customer.phone)}"><bdi>${esc(order.customer.phone)}</bdi></a><p>${t(order.fulfillment === 'pickup' ? 'pickup' : 'dineIn')}${order.tableNumber ? ` · ${t('table')} ${esc(order.tableNumber)}` : ''}</p></div><ul class="order-items">${order.items.map(item => `<li><span>${item.quantity} × ${esc(tr(item.name))}<small>${esc(tr(item.variant))}</small></span><bdi>${esc(money(item.quantity*item.unitPriceMinor))}</bdi></li>`).join('')}</ul>${notesHTML(order.notes)}<div class="order-total"><span>${t('total')}</span><bdi>${esc(money(order.totalMinor))}</bdi></div><p class="muted">${t('cash')}</p><div class="order-actions">${order.status === 'new' ? `<button class="primary" data-order="${order.id}" data-status="preparing">${t('accept')}</button>` : order.status === 'preparing' ? `<button class="primary" data-order="${order.id}" data-status="ready">${t('markReady')}</button>` : order.status === 'ready' ? `<button class="primary" data-order="${order.id}" data-status="completed">${t('markCollected')}</button>` : ''}${['new','preparing','ready'].includes(order.status) ? `<button class="secondary danger" data-order="${order.id}" data-status="cancelled">${t('cancel')}</button>` : ''}</div></article>`).join('')}</div><div class="pager"><button class="secondary" data-page="${page-1}" ${page <= 1 ? 'disabled' : ''}>${t('previous')}</button><span>${t('page')} ${page}</span><button class="secondary" data-page="${page+1}" ${page*40 >= orderData.total ? 'disabled' : ''}>${t('next')}</button></div>`;
}
function renderCatalog() {
  if (!catalog) return;
  $('admin-content').innerHTML = `<div class="toolbar"><h1>${t('products')}</h1><button class="secondary" data-refresh>${t('refresh')}</button></div><section class="panel settings-panel"><h2>${t('hoursTitle')}</h2><p class="muted">${t('settingsHint')}</p><form id="settings-form"><div class="form-grid"><label>${t('opensAt')}<input type="time" name="opensAt" value="${esc(catalog.settings.opensAt)}" required></label><label>${t('closesAt')}<input type="time" name="closesAt" value="${esc(catalog.settings.closesAt)}" required></label></div><label class="check-label"><input type="checkbox" name="acceptingOrders" ${catalog.settings.acceptingOrders ? 'checked' : ''}>${t('acceptingOrders')}</label><button class="primary" type="submit">${t('save')}</button></form></section><div class="catalog-list">${catalog.products.map(p => `<article class="panel catalog-row"><div class="catalog-name"><span class="product-icon" aria-hidden="true">${esc(p.icon)}</span><div><strong>${esc(tr(p.name))}</strong><span class="muted"><bdi>${esc(money(p.priceMinor))}</bdi> · ${t(p.active ? 'active' : 'unavailable')}</span></div></div><button class="secondary" data-edit="${p.id}">${t('edit')}</button></article>`).join('')}</div>`;
  $('settings-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    busy = true; const button = event.target.querySelector('button'); button.disabled = true;
    const form = new FormData(event.target);
    try { const result = await api('/api/admin/settings',{method:'PATCH',body:JSON.stringify({opensAt:form.get('opensAt'),closesAt:form.get('closesAt'),acceptingOrders:form.has('acceptingOrders')})}); catalog.settings = result.settings; message($('admin-notice'),'saved',true); }
    catch (error) { await handleError(error); }
    finally { busy = false; button.disabled = false; }
  });
}
function openProduct(id) {
  editing = catalog.products.find(p => p.id === id);
  $('product-error').hidden = true;
  const bilingual = (key,enLabel,arLabel,multi=false,required=true) => `<div class="form-grid">${[['en',enLabel],['ar',arLabel]].map(([locale,label]) => `<label>${t(label)}${multi ? `<textarea name="${key}.${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" ${required ? 'required' : ''} maxlength="${key === 'ingredients' ? 3000 : key === 'description' ? 2000 : 1000}">${esc(editing[key][locale])}</textarea>` : `<input name="${key}.${locale}" value="${esc(editing[key][locale])}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" maxlength="255" ${required ? 'required' : ''}>`}</label>`).join('')}</div>`;
  $('product-fields').innerHTML = `<label class="check-label"><input type="checkbox" name="active" ${editing.active ? 'checked' : ''}>${t('active')}</label>${bilingual('name','nameEn','nameAr')}${bilingual('description','descEn','descAr',true,false)}${bilingual('ingredients','ingEn','ingAr',true,false)}${bilingual('note','noteEn','noteAr',true,false)}<h3>${t('variants')}</h3>${editing.variants.map(v => `<fieldset class="variant-editor"><legend>${esc(tr(v.name))}</legend><div class="form-grid"><label>${t('nameEn')}<input name="${v.id}.en" value="${esc(v.name.en)}" dir="ltr" maxlength="120" required></label><label>${t('nameAr')}<input name="${v.id}.ar" value="${esc(v.name.ar)}" dir="rtl" maxlength="120" required></label><label>${t('price')}<input name="${v.id}.price" type="number" min="0.01" max="100000" step="0.01" value="${(v.priceMinor/100).toFixed(2)}" required></label><label>${t('optionalCalories')}<input name="${v.id}.calories" type="number" min="0" max="100000" step="1" value="${v.calories ?? ''}"></label></div></fieldset>`).join('')}`;
  $('product-dialog').showModal();
}
initLanguage(() => {
  notifications.render();
  if (signedIn) { if (view === 'orders') renderOrders(); else renderCatalog(); }
  // Existing input values stay untouched when changing language during an edit.
});
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  busy = true; const button = event.target.querySelector('button'); button.disabled = true;
  $('login-error').hidden = true;
  const data = new FormData(event.target);
  try { await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:data.get('username'),password:data.get('password')})}); event.target.reset(); session = await api('/api/admin/session'); showPanel(); await load(); }
  catch (error) { message($('login-error'),error.code); }
  finally { busy = false; button.disabled = false; }
});
$('logout').addEventListener('click',async () => { try { await api('/api/admin/logout',{method:'POST',body:'{}'}); showLogin(); } catch (error) { await handleError(error); } });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', async () => {
  if (busy || loading) return;
  view = button.dataset.view; document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('on',b === button));
  $('admin-content').innerHTML = `<p class="loading">${t('loading')}</p>`; await load();
}));
$('admin-content').addEventListener('click',async event => {
  const button = event.target.closest('button'); if (!button || busy || loading) return;
  if (button.hasAttribute('data-refresh')) return load();
  if (button.dataset.filter) { filter = button.dataset.filter; page = 1; orderData=null; return load(); }
  if (button.dataset.page) { page = Number(button.dataset.page); return load(); }
  if (button.dataset.edit) return openProduct(button.dataset.edit);
  if (button.dataset.order) {
    if (button.dataset.status === 'cancelled' && !confirm(t('cancelConfirm'))) return;
    busy = true; button.disabled = true;
    const order = orderData.orders.find(o => o.id === button.dataset.order);
    try { await api(`/api/admin/orders/${order.id}`,{method:'PATCH',body:JSON.stringify({status:button.dataset.status,paymentStatus:order.paymentStatus,revision:order.revision})}); await load(); }
    catch (error) { await handleError(error); }
    finally { busy = false; button.disabled = false; }
  }
});
$('product-dialog').querySelector('[data-close]').addEventListener('click',() => { if (!busy) $('product-dialog').close(); });
$('product-dialog').addEventListener('cancel',event => { if (busy) event.preventDefault(); });
$('product-form').addEventListener('submit',async event => {
  event.preventDefault(); if (busy) return;
  const data = new FormData(event.target), translated = key => ({en:data.get(`${key}.en`),ar:data.get(`${key}.ar`)});
  const body = { active:data.has('active'), name:translated('name'),description:translated('description'),ingredients:translated('ingredients'),note:translated('note'),variants:editing.variants.map(v => ({id:v.id,name:translated(v.id),priceMinor:Math.round(Number(data.get(`${v.id}.price`))*100),calories:data.get(`${v.id}.calories`) === '' ? null : Number(data.get(`${v.id}.calories`))})) };
  busy = true; const button = event.target.querySelector('button[type=submit]'); button.disabled = true;
  try { await api(`/api/admin/products/${editing.id}`,{method:'PATCH',body:JSON.stringify(body)}); $('product-dialog').close(); await load(); message($('admin-notice'),'saved',true); }
  catch (error) { if (error.status === 401) { $('product-dialog').close(); await handleError(error); } else message($('product-error'),error.code); }
  finally { busy = false; button.disabled = false; }
});
try { session = await api('/api/admin/session'); showPanel(); await load(); }
catch (error) { showLogin(); if (error.status !== 401) message($('login-error'),error.code); }
setInterval(() => { if (signedIn && view === 'orders' && !busy && !document.hidden && !$('product-dialog').open) load(); }, 8000);
