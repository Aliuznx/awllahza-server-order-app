import { rememberOrder } from './order-history.js';
import { api, lang, t, tr, esc, money, cartIcon, readStorage, writeStorage, initLanguage, message } from './shared.js';
import { itemKey, quantityHTML, syncQuantity, optionsHTML, syncOptions } from './order-controls.js';
const $=id=>document.getElementById(id);
let menu,category='shawarma',busy=false;
const selected=new Map();
const pendingQuantities=new Map();
let cart=readStorage('awllahza-cart',[]);
if(!Array.isArray(cart))cart=[];
cart=cart.filter(i=>i&&typeof i.productId==='string'&&typeof i.variantId==='string'&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=99).slice(0,50);
cart=cart.filter((i,index)=>cart.findIndex(other=>itemKey(other)===itemKey(i))===index);
const product=id=>menu.products.find(p=>p.id===id);
const variant=(p,id)=>p?.variants.find(v=>v.id===id);
const count=()=>cart.reduce((n,i)=>n+i.quantity,0);
const total=()=>cart.reduce((n,i)=>n+(variant(product(i.productId),i.variantId)?.priceMinor||0)*i.quantity,0);
const qty=(pid,vid)=>cart.find(i=>i.productId===pid&&i.variantId===vid)?.quantity||0;
const picked=p=>variant(p,selected.get(p.id))||p.variants[0];
const cheeseChoices=p=>p.variants.some(v=>v.id==='cheese')&&p.variants.some(v=>v.id==='regular');
const pendingKey=(pid,vid)=>`${pid}:${vid}`;
const choiceName=v=>v.id==='regular'?t('withoutCheese'):tr(v.name);
function persistCart(){
  writeStorage('awllahza-cart',cart);syncCards();syncCart();
  $('cart-announcement').textContent=`${count()} ${t('items')} · ${money(total())}`;
}
function change(pid,vid,amount){
  if(busy||!variant(product(pid),vid)||(amount>0&&!product(pid).active))return;
  const line=cart.find(i=>i.productId===pid&&i.variantId===vid);
  if(line)line.quantity=Math.min(99,Math.max(0,line.quantity+amount));
  else if(amount>0)cart.push({productId:pid,variantId:vid,quantity:1});
  cart=cart.filter(i=>i.quantity>0);persistCart();
}
function chooseOption(button){
  if(busy)return;
  const p=product(button.dataset.pickProduct);if(!p?.active)return;
  const old=picked(p).id;
  const next=button.hasAttribute('data-toggle-cheese')&&old==='cheese'?'regular':button.dataset.pickVariant;
  selected.set(p.id,next);syncCards();
}
function changePending(pid,amount,vid){
  const p=product(pid);if(busy||!p?.active)return;
  vid=cheeseChoices(p)?vid:picked(p).id;
  if(!variant(p,vid))return;
  const key=pendingKey(pid,vid),remaining=99-qty(pid,vid);
  pendingQuantities.set(key,Math.min(remaining,Math.max(0,(pendingQuantities.get(key)||0)+amount)));
  syncCards();
}
function addPending(pid){
  const p=product(pid);if(busy||!p?.active)return;
  const choices=cheeseChoices(p)?p.variants:[picked(p)];
  if(choices.some(v=>(pendingQuantities.get(pendingKey(pid,v.id))||0)+qty(pid,v.id)>99))return;
  for(const v of choices){
    const key=pendingKey(pid,v.id),amount=pendingQuantities.get(key)||0;
    if(amount<1)continue;
    const line=cart.find(i=>i.productId===pid&&i.variantId===v.id);
    if(line)line.quantity+=amount;
    else cart.push({productId:pid,variantId:v.id,quantity:amount});
    pendingQuantities.set(key,0);
  }
  persistCart();
}
function cardHTML(p){
  const ingredients=tr(p.ingredients)||tr(p.description);
  if(cheeseChoices(p))return `<article class="card cheese-card" data-card="${esc(p.id)}">${tr(p.badge)?`<span class="badge">${esc(tr(p.badge))}</span>`:''}<div class="cv" aria-hidden="true">${esc(p.icon)}</div><div class="cb"><h3 class="${lang==='ar'?'na':'ne'}">${esc(tr(p.name))}</h3>${ingredients?`<div class="item-ingredients"><h4>${t('ingredients')}</h4><p>${esc(ingredients)}</p></div>`:''}<div class="cal"><span class="calt">${esc(p.calories??'—')} ${t('calories')} · ${t('baseCalories')}</span></div><div class="cheese-choices">${p.variants.map(v=>`<div class="cheese-choice" data-choice="${esc(v.id)}"><div><strong>${esc(choiceName(v))}</strong><bdi>${esc(money(v.priceMinor))}</bdi>${v.id==='cheese'&&v.calories===null?`<small class="muted">${t('caloriesUnknown')}</small>`:''}</div>${quantityHTML(p.id,v.id)}</div>`).join('')}</div><p class="choice-total" aria-live="polite"></p><button type="button" class="add-button" data-add="${esc(p.id)}">${cartIcon}<span>${t(p.active?'add':'unavailable')}</span></button></div></article>`;
  return `<article class="card" data-card="${esc(p.id)}">${tr(p.badge)?`<span class="badge">${esc(tr(p.badge))}</span>`:''}<div class="cv" aria-hidden="true">${esc(p.icon)}</div><div class="cb"><h3 class="${lang==='ar'?'na':'ne'}">${esc(tr(p.name))}</h3>${ingredients?`<div class="item-ingredients"><h4>${t('ingredients')}</h4><p>${esc(ingredients)}</p></div>`:''}<div class="cal"><span class="calt"></span></div><div class="product-options">${optionsHTML(p)}</div><p class="muted option-calories" hidden>${t('caloriesUnknown')}</p><bdi class="pm"></bdi>${tr(p.note)?`<p class="pn">${esc(tr(p.note))}</p>`:''}<div class="card-footer">${quantityHTML(p.id,p.variants[0].id)}<button type="button" class="add-button" data-add="${esc(p.id)}">${cartIcon}<span>${t(p.active?'add':'unavailable')}</span></button></div></div></article>`;
}
function syncCards(){
  if(!menu)return;
  $('menu').querySelectorAll('[data-card]').forEach(card=>{
    const current=product(card.dataset.card);
    if(cheeseChoices(current)){
      let units=0,subtotal=0;
      for(const v of current.variants){
        const row=card.querySelector(`[data-choice="${CSS.escape(v.id)}"]`);
        const key=pendingKey(current.id,v.id),remaining=99-qty(current.id,v.id);
        const amount=Math.min(pendingQuantities.get(key)||0,remaining);
        pendingQuantities.set(key,amount);units+=amount;subtotal+=amount*v.priceMinor;
        syncQuantity(row,current.id,v.id,amount,{busy,available:current.active});
        row.querySelector('[data-change="1"]').disabled=busy||!current.active||amount>=remaining;
      }
      card.querySelector('.choice-total').textContent=`${units} ${t('items')} · ${money(subtotal)}`;
      card.querySelector('[data-add]').disabled=busy||!current.active||units===0;
      return;
    }
    const p=product(card.dataset.card),v=picked(p),remaining=99-qty(p.id,v.id);
    const key=pendingKey(p.id,v.id),amount=Math.min(pendingQuantities.get(key)||0,remaining);
    pendingQuantities.set(key,amount);
    syncQuantity(card,p.id,v.id,amount,{busy,available:p.active});syncOptions(card,v.id,busy||!p.active);
    card.querySelector('[data-change="1"]').disabled=busy||!p.active||amount>=remaining;
    card.querySelector('.pm').textContent=money(v.priceMinor);
    card.querySelector('.calt').textContent=`${v.calories??p.calories??'—'} ${t('calories')}${v.calories===null&&v.id!=='regular'?` · ${t('baseCalories')}`:''}`;
    card.querySelector('.option-calories').hidden=v.calories!==null;
    const add=card.querySelector('[data-add]');add.dataset.variant=v.id;add.disabled=busy||!p.active||amount===0;
  });
}
function renderCategory(){
  const cat=menu.categories.find(c=>c.id===category)||menu.categories[0];category=cat.id;
  $('categories').querySelectorAll('[data-category]').forEach(button=>{const on=button.dataset.category===category;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
  $('menu').innerHTML=`<section class="ms vis"><div class="sh"><div class="sl"></div><h2 class="${lang==='ar'?'sta':'ste'}">${esc(cat.icon)} ${esc(tr(cat.name))}</h2><div class="sl r"></div></div><div class="grid">${menu.products.filter(p=>p.categoryId===category).map(cardHTML).join('')}</div><div class="sep"></div></section>`;
  syncCards();
}
function updateInfo(){
  $('test-notice').hidden=!menu.testMode;
  const hours=`<strong>${t(menu.orderingEnabled?'open':'closed')}</strong><span>${t('hours')} <bdi>${esc(menu.settings.opensAt)}–${esc(menu.settings.closesAt)}</bdi> · ${t('localTime')}</span>`;
  if($('hours').innerHTML!==hours)$('hours').innerHTML=hours;
  $('address').textContent=tr(menu.restaurant.address);
}
function renderMenu(){
  if(!menu)return;
  $('categories').setAttribute('aria-label',t('menu'));
  $('categories').innerHTML=menu.categories.map(c=>`<button type="button" class="ct" data-category="${esc(c.id)}"><span>${esc(c.icon)}</span><span>${esc(tr(c.name))}</span></button>`).join('');
  updateInfo();renderCategory();
}
function cartRow(item){
  const template=document.createElement('template');
  template.innerHTML=`<div class="cart-line"><div><h3></h3><p class="muted line-description"></p><div class="line-actions">${quantityHTML(item.productId,item.variantId)}<button class="remove" type="button">${t('remove')}</button></div></div><bdi class="line-total"></bdi></div>`;
  const row=template.content.firstElementChild;row.dataset.cartKey=itemKey(item);return row;
}
function syncCart(){
  if(!menu)return;
  $('cart-count').textContent=count();$('cart-total').textContent=money(total());
  const root=$('cart-lines'),keys=new Set(cart.map(itemKey));
  root.querySelectorAll('[data-cart-key]').forEach(row=>{if(!keys.has(row.dataset.cartKey))row.remove();});
  for(const item of cart){
    let row=Array.from(root.children).find(el=>el.dataset.cartKey===itemKey(item));
    if(!row){row=cartRow(item);root.append(row);}
    const p=product(item.productId),v=variant(p,item.variantId);
    row.querySelector('h3').textContent=tr(p?.name)||t('unavailable');
    row.querySelector('.line-description').textContent=`${p&&v&&cheeseChoices(p)?choiceName(v):tr(v?.name)} · ${money(v?.priceMinor||0)}${!p?.active?` · ${t('unavailable')}`:''}`;
    syncQuantity(row,item.productId,item.variantId,item.quantity,{busy,available:p?.active&&Boolean(v)});
    row.querySelector('.remove').dataset.remove=itemKey(item);row.querySelector('.remove').textContent=t('remove');row.querySelector('.remove').disabled=busy;
    row.querySelector('.line-total').textContent=money((v?.priceMinor||0)*item.quantity);
  }
  $('cart-empty').hidden=Boolean(cart.length);$('cart-summary').hidden=!cart.length;$('checkout-form').hidden=!cart.length;
  $('checkout-total').textContent=money(total());
  const unavailable=cart.some(i=>!product(i.productId)?.active||!variant(product(i.productId),i.variantId));
  $('place-order').disabled=busy||unavailable||!menu.orderingEnabled;
  $('place-order').textContent=t(busy?'sending':!menu.orderingEnabled?'closed':'placeOrder');
}
async function loadMenu(){
  const previous=menu;menu=await api('/api/menu');
  if(!previous||JSON.stringify(previous.categories)!==JSON.stringify(menu.categories))renderMenu();
  else{
    updateInfo();
    for(const p of menu.products.filter(p=>p.categoryId===category)){
      const old=previous.products.find(i=>i.id===p.id),card=$('menu').querySelector(`[data-card="${CSS.escape(p.id)}"]`);
      if(JSON.stringify(old)!==JSON.stringify(p)){
        const template=document.createElement('template');template.innerHTML=cardHTML(p);
        if(card)card.replaceWith(template.content.firstElementChild);else $('menu').querySelector('.grid').append(template.content.firstElementChild);
      }
    }
    $('menu').querySelectorAll('[data-card]').forEach(card=>{if(!product(card.dataset.card))card.remove();});
    syncCards();
  }
  syncCart();
}
initLanguage(()=>{renderMenu();syncCart();});
$('cart-icon').innerHTML=cartIcon;
$('open-cart').addEventListener('click',()=>{syncCart();$('cart-dialog').showModal();});
$('cart-dialog').querySelector('[data-close]').addEventListener('click',()=>{if(!busy)$('cart-dialog').close();});
$('cart-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
document.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  if(target.dataset.category&&target.dataset.category!==category){category=target.dataset.category;renderCategory();}
  if(target.dataset.add)addPending(target.dataset.add);
  if(target.dataset.change){
    if(target.closest('[data-card]'))changePending(target.dataset.product,Number(target.dataset.change),target.dataset.variant);
    else change(target.dataset.product,target.dataset.variant,Number(target.dataset.change));
  }
  if(target.dataset.pickProduct)chooseOption(target);
  if(target.dataset.remove&&!busy){cart=cart.filter(i=>itemKey(i)!==target.dataset.remove);persistCart();}
});
document.addEventListener('change',event=>{
  if(event.target.name==='fulfillment'){const dine=event.target.value==='dine_in';$('table-field').hidden=!dine;$('checkout-form').elements.tableNumber.required=dine;}
});
$('checkout-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!cart.length)return;
  $('checkout-error').hidden=true;const form=new FormData(event.target);
  const body={customer:{firstName:form.get('firstName'),lastName:form.get('lastName'),phone:form.get('phone')},fulfillment:form.get('fulfillment'),tableNumber:form.get('tableNumber'),language:lang,paymentMethod:'cash',items:cart,expectedTotalMinor:total(),notes:form.get('notes')};
  const fingerprint=JSON.stringify(body);
  busy=true;syncCart();syncCards();Array.from(event.target.elements).forEach(el=>el.disabled=true);
  try{
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(b=>b.toString(16).padStart(2,'0')).join('');
    let pending;try{pending=JSON.parse(sessionStorage.getItem('awllahza-pending'));}catch{}
    const key=pending?.digest===digest?pending.key:crypto.randomUUID();
    try{sessionStorage.setItem('awllahza-pending',JSON.stringify({digest,key}));}catch{}
    const result=await api('/api/orders',{method:'POST',headers:{'Idempotency-Key':key},body:fingerprint});
    cart=[];writeStorage('awllahza-cart',cart);rememberOrder(result.trackingToken);
    try{sessionStorage.removeItem('awllahza-pending');}catch{}
    location.href=`/track#${result.trackingToken}`;
  }catch(error){
    if(['price_changed','product_unavailable','ordering_closed'].includes(error.code))try{await loadMenu();}catch{}
    message($('checkout-error'),error.code||'connection');busy=false;
    Array.from(event.target.elements).forEach(el=>el.disabled=false);syncCards();syncCart();
  }
});
try{await loadMenu();}catch(error){message($('page-error'),error.code);$('menu').innerHTML=`<p class="loading"><button class="secondary" id="retry-menu">${t('retry')}</button></p>`;$('retry-menu').onclick=()=>location.reload();}
setInterval(async()=>{if(!busy&&!document.hidden&&!$('cart-dialog').open)try{await loadMenu();$('page-error').hidden=true;}catch{}},60000);
