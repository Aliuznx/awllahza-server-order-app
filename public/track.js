import { rememberOrder } from './order-history.js';
import { notesHTML } from './order-controls.js';
import { setupPendingEditor } from './pending-order.js';
import { api, t, tr, esc, money, date, initLanguage, message, readStorage } from './shared.js';
const $ = id => document.getElementById(id);
const token = location.hash.slice(1) || readStorage('awllahza-last-order') || '';
let order, refreshing = false, lastUpdate;
const states = ['new','preparing','ready','completed'];
function render() {
  if (!order) return;
  const index = states.indexOf(order.status); document.getElementById('pending-actions').hidden=order.status!=='new'; pendingEditor.syncState();
  $('tracking').innerHTML = `${order.isTest ? `<div class="notice test-notice">${t('testNotice')}</div>` : ''}<div class="tracking-title"><p class="muted">${t('orderNumber')}</p><bdi class="tracking-number">${esc(order.orderNumber)}</bdi><p class="muted">${esc(date(order.createdAt))}</p></div><div class="tracking-state"><h2>${t(order.status)}</h2><p>${t(`${order.status}Hint`)}</p></div>${index >= 0 ? `<ol class="steps">${states.map((s,i) => `<li class="${i <= index ? 'reached' : ''}" ${i === index ? 'aria-current="step"' : ''}>${t(s)}</li>`).join('')}</ol>` : ''}<p>${t(order.fulfillment === 'pickup' ? 'pickup' : 'dineIn')}${order.tableNumber ? ` · ${t('table')} ${esc(order.tableNumber)}` : ''}</p><ul class="order-items">${order.items.map(i => `<li><span>${i.quantity} × ${esc(tr(i.name))}<small>${esc(tr(i.variant))}</small></span><bdi>${esc(money(i.unitPriceMinor*i.quantity))}</bdi></li>`).join('')}</ul>${notesHTML(order.notes)}<div class="order-total"><span>${t('total')}</span><bdi>${esc(money(order.totalMinor))}</bdi></div><p class="muted">${t('cash')} · ${t('finalPrice')}</p>`;
  $('updated').textContent = `${t('lastUpdated')}: ${date(lastUpdate)}`;
}
async function refresh() {
  if (refreshing) return;
  if (!/^[a-f0-9]{64}$/.test(token)) { message($('track-error'),'noTracking'); $('tracking').hidden = true; $('copy-link').hidden = true; return; }
  refreshing = true;
  try { const next = await api('/api/order-status',{headers:{Authorization:`Bearer ${token}`}}); const changed = JSON.stringify(next) !== JSON.stringify(order); order = next; rememberOrder(token); lastUpdate = new Date(); if (changed) render(); else $('updated').textContent = `${t('lastUpdated')}: ${date(lastUpdate)}`; $('tracking').hidden = false; $('track-error').hidden = true; }
  catch (error) { message($('track-error'),error.code); if (!order) $('tracking').hidden = true; }
  finally { refreshing = false; }
}
const pendingEditor=setupPendingEditor({token,getOrder:()=>order,onRefresh:refresh});
initLanguage(render);
$('refresh').addEventListener('click',refresh);
$('copy-link').addEventListener('click',async () => { try { await navigator.clipboard.writeText(`${location.origin}/track#${token}`); $('copy-link').textContent = t('copied'); } catch { message($('track-error'),'trackingHint'); } });
await refresh();
setInterval(() => { if (!document.hidden && !['completed','cancelled'].includes(order?.status)) refresh(); },5000);
document.addEventListener('visibilitychange',() => { if (!document.hidden) refresh(); });
