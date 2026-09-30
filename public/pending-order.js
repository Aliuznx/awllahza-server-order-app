import { api,t,tr,esc,money,message } from './shared.js';
import { itemKey,switchVariant,quantityHTML,syncQuantity,optionsHTML,syncOptions } from './order-controls.js';

export function setupPendingEditor({token,getOrder,onRefresh}){
  const $=id=>document.getElementById(id),dialog=$('edit-order-dialog'),form=$('edit-order-form');
  let catalog,draft=[],revision=0,busy=false;
  const product=id=>catalog?.products.find(p=>p.id===id);
  const option=i=>product(i.productId)?.variants.find(v=>v.id===i.variantId);
  const total=()=>draft.reduce((n,i)=>n+(option(i)?.priceMinor||0)*i.quantity,0);
  const headers={Authorization:`Bearer ${token}`};
  function syncState(){
    if(!dialog.open)return;
    const locked=getOrder()?.status!=='new';
    if(locked)message($('edit-order-error'),'order_locked');
    for(const element of form.elements)element.disabled=busy||locked;
    if(catalog)syncLines();
  }
  function syncLines(){
    const root=$('edit-order-lines'),keys=new Set(draft.map(itemKey));
    root.querySelectorAll('[data-edit-key]').forEach(row=>{if(!keys.has(row.dataset.editKey))row.remove();});
    for(const item of draft){
      const p=product(item.productId),v=option(item);
      let row=Array.from(root.children).find(el=>el.dataset.editKey===itemKey(item));
      if(!row){
        const template=document.createElement('template');
        template.innerHTML=`<div class="edit-line"><h3></h3><div class="edit-options">${p?optionsHTML(p):''}</div><p class="muted edit-option-name"></p><div class="edit-line-bottom"><div class="line-actions">${quantityHTML(item.productId,item.variantId)}<button type="button" class="remove" data-edit-remove>${t('remove')}</button></div><bdi class="edit-line-total"></bdi></div></div>`;
        row=template.content.firstElementChild;row.dataset.editKey=itemKey(item);root.append(row);
      }
      row.querySelector('h3').textContent=tr(p?.name)||t('unavailable');
      row.querySelector('.edit-option-name').textContent=`${tr(v?.name)}${!p?.active||!v?` · ${t('unavailable')}`:''}`;
      syncQuantity(row,item.productId,item.variantId,item.quantity,{busy:busy||getOrder()?.status!=='new',available:p?.active&&Boolean(v)});
      syncOptions(row,item.variantId,busy||!p?.active||getOrder()?.status!=='new');
      row.querySelector('[data-edit-remove]').disabled=busy||getOrder()?.status!=='new';
      row.querySelector('.edit-line-total').textContent=money((v?.priceMinor||0)*item.quantity);
    }
    $('edit-order-empty').hidden=Boolean(draft.length);
    $('edit-order-total').textContent=money(total());
    $('save-order').disabled=busy||getOrder()?.status!=='new'||!draft.length||draft.some(i=>!product(i.productId)?.active||!option(i))||!catalog.orderingEnabled;
  }
  async function open(){
    if(busy)return;
    busy=true;
    try{
      const [latest,menu]=await Promise.all([api('/api/order-status',{headers}),api('/api/menu')]);
      if(latest.status!=='new'){await onRefresh();throw Object.assign(new Error(),{code:'order_locked'});}
      catalog=menu;revision=latest.revision;draft=latest.items.map(i=>({productId:i.productId,variantId:i.variantId,quantity:i.quantity}));
      $('edit-order-lines').replaceChildren();$('edit-order-notes').value=latest.notes||'';$('edit-order-error').hidden=true;
      $('edit-add-product').innerHTML=catalog.products.filter(p=>p.active).flatMap(p=>p.variants.map(v=>`<option value="${esc(p.id)}:${esc(v.id)}">${esc(tr(p.name))} · ${esc(tr(v.name))} · ${esc(money(v.priceMinor))}</option>`)).join('');
      busy=false;dialog.showModal();syncState();
    }catch(error){message($('track-error'),error.code||'server_error');}
    finally{busy=false;}
  }
  $('edit-order').addEventListener('click',open);
  $('cancel-order').addEventListener('click',async()=>{
    if(busy||getOrder()?.status!=='new'||!confirm(t('cancelPendingConfirm')))return;
    busy=true;$('cancel-order').disabled=true;
    try{await api('/api/order-status',{method:'PATCH',headers,body:JSON.stringify({action:'cancel',revision:getOrder().revision})});await onRefresh();}
    catch(error){await onRefresh();message($('track-error'),error.code||'server_error');}
    finally{busy=false;$('cancel-order').disabled=false;}
  });
  dialog.querySelector('[data-close]').addEventListener('click',()=>{if(!busy)dialog.close();});
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('edit-order-lines').addEventListener('click',event=>{
    const button=event.target.closest('button'),row=button?.closest('[data-edit-key]');
    if(!row||busy||getOrder()?.status!=='new')return;
    const item=draft.find(i=>itemKey(i)===row.dataset.editKey);if(!item)return;
    if(button.hasAttribute('data-edit-remove'))draft=draft.filter(i=>i!==item);
    if(button.dataset.change){item.quantity=Math.max(0,Math.min(99,item.quantity+Number(button.dataset.change)));draft=draft.filter(i=>i.quantity>0);}
    if(button.dataset.pickVariant){
      const next=button.hasAttribute('data-toggle-cheese')&&item.variantId==='cheese'?'regular':button.dataset.pickVariant;
      const updated=switchVariant(draft,item.productId,item.variantId,next);
      if(updated===null){message($('edit-order-error'),'invalid_quantity');return;}
      if(!draft.some(i=>i!==item&&i.productId===item.productId&&i.variantId===next))row.dataset.editKey=`${item.productId}:${next}`;
      draft=updated;
    }
    syncLines();
  });
  $('edit-add-item').addEventListener('click',()=>{
    if(busy||getOrder()?.status!=='new')return;
    const [productId,variantId]=$('edit-add-product').value.split(':');if(!productId||!variantId)return;
    const existing=draft.find(i=>i.productId===productId&&i.variantId===variantId);
    if(existing){if(existing.quantity>=99)return;existing.quantity++;}else draft.push({productId,variantId,quantity:1});
    syncLines();
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||getOrder()?.status!=='new'||!draft.length)return;
    const body={action:'update',revision,items:draft,notes:$('edit-order-notes').value,expectedTotalMinor:total()};
    busy=true;$('edit-order-error').hidden=true;syncState();
    try{await api('/api/order-status',{method:'PATCH',headers,body:JSON.stringify(body)});dialog.close();await onRefresh();}
    catch(error){
      if(['price_changed','product_unavailable','ordering_closed'].includes(error.code)){
        try{catalog=await api('/api/menu');$('edit-order-lines').replaceChildren();}catch{}
      }
      await onRefresh();message($('edit-order-error'),error.code||'server_error');
    }finally{busy=false;syncState();}
  });
  return {syncState};
}
