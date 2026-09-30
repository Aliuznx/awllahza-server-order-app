import { t, tr, esc, money } from './shared.js';
export const itemKey = item => `${item.productId}:${item.variantId}`;
export function switchVariant(items, productId, previousId, nextId) {
  const previous=items.find(i=>i.productId===productId&&i.variantId===previousId);
  if (!previous || previousId===nextId) return items;
  const next=items.find(i=>i.productId===productId&&i.variantId===nextId);
  if (previous.quantity+(next?.quantity||0)>99) return null;
  return items.filter(i=>i!==previous&&i!==next).concat({...previous,variantId:nextId,quantity:previous.quantity+(next?.quantity||0)});
}
export function quantityHTML(productId,variantId) {
  return `<div class="quantity"><button type="button" data-change="-1" data-product="${esc(productId)}" data-variant="${esc(variantId)}" aria-label="${t('decrease')}">−</button><output aria-label="${t('count')}">0</output><button type="button" data-change="1" data-product="${esc(productId)}" data-variant="${esc(variantId)}" aria-label="${t('increase')}">+</button></div>`;
}
export function syncQuantity(root, productId, variantId, amount, {busy=false,available=true}={}) {
  root.querySelectorAll('.quantity').forEach(group=>{
    group.querySelector('output').textContent=amount;
    group.querySelector('output').setAttribute('aria-label',t('count'));
    for(const button of group.querySelectorAll('[data-change]')){
      button.dataset.product=productId;button.dataset.variant=variantId;
      button.setAttribute('aria-label',t(button.dataset.change==='-1'?'decrease':'increase'));
      button.disabled=busy||(button.dataset.change==='-1' ? amount<=0 : amount>=99||!available);
    }
  });
}
export function optionsHTML(product) {
  if(product.variants.length<2)return '';
  const cheese=product.variants.find(v=>v.id==='cheese'),regular=product.variants.find(v=>v.id==='regular');
  if(cheese&&regular&&product.variants.length===2){
    const difference=cheese.priceMinor-regular.priceMinor;
    return `<div class="option-buttons"><button type="button" class="option-chip cheese-toggle" data-pick-product="${esc(product.id)}" data-pick-variant="cheese" data-toggle-cheese aria-pressed="false"><span class="option-check" aria-hidden="true">＋</span><span>${esc(tr(cheese.name))}</span><bdi>${difference>=0?'+ ':''}${esc(money(difference))}</bdi></button></div>`;
  }
  return `<div class="option-buttons" role="group" aria-label="${t('option')}">${product.variants.map(v=>`<button type="button" class="option-chip" data-pick-product="${esc(product.id)}" data-pick-variant="${esc(v.id)}" aria-pressed="false">${esc(tr(v.name))} <bdi>${esc(money(v.priceMinor))}</bdi></button>`).join('')}</div>`;
}
export function syncOptions(root, selectedId, disabled=false){
  root.querySelectorAll('[data-pick-variant]').forEach(button=>{
    const pressed=button.dataset.pickVariant===selectedId;
    button.setAttribute('aria-pressed',String(pressed));button.disabled=disabled;
    const check=button.querySelector('.option-check');if(check)check.textContent=pressed?'✓':'＋';
  });
}
export function notesHTML(notes) {
  return notes ? `<section class="order-notes"><h3>${t('orderNotes')}</h3><p>${esc(notes)}</p></section>` : '';
}
