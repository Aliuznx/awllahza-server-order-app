import {api,t,esc,date,money,initLanguage,message} from './shared.js';
import {savedOrders} from './order-history.js';
const root=document.getElementById('my-order-list'),error=document.getElementById('history-error');
let orders=[],loading=false;
function render(){
  root.innerHTML=orders.length?orders.map(({token,order,missing})=>`<article class="panel history-card">${order?`<div class="order-head"><h2><bdi>${esc(order.orderNumber)}</bdi></h2><span class="status-pill status-${esc(order.status)}">${t(order.status)}</span></div><p class="muted">${esc(date(order.createdAt))}</p><p>${t('total')} <bdi>${esc(money(order.totalMinor))}</bdi></p>`:`<p>${t(missing?'not_found':'connection')}</p>`}<a class="primary" href="/track#${token}">${t('track')}</a></article>`).join(''):`<div class="panel"><h2>${t('noSavedOrders')}</h2><p class="muted">${t('historyHint')}</p></div>`;
}
async function load(){
  if(loading)return;loading=true;error.hidden=true;
  try{
    const tokens=savedOrders(),next=[];
    // Limit concurrent requests while keeping old links available during a network outage.
    for(let i=0;i<tokens.length;i+=4){
      const batch=await Promise.all(tokens.slice(i,i+4).map(async token=>{
        try{return {token,order:await api('/api/order-status',{headers:{Authorization:`Bearer ${token}`}})};}
        catch(e){if(e.status!==404)message(error,e.code);return {token,missing:e.status===404};}
      }));next.push(...batch);
    }
    orders=next;render();
  }finally{loading=false;}
}
initLanguage(render);
document.getElementById('refresh-history').addEventListener('click',load);
await load();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
