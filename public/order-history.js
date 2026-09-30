import {readStorage,writeStorage} from './shared.js';
const key='awllahza-order-history';
const valid=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
export function savedOrders(){
  const saved=readStorage(key,[]),last=readStorage('awllahza-last-order');
  const tokens=Array.isArray(saved)?saved.filter(valid):[];
  if(valid(last)&&!tokens.includes(last))tokens.unshift(last);
  return [...new Set(tokens)].slice(0,100);
}
export function rememberOrder(token){
  if(!valid(token))return;
  writeStorage(key,[token,...savedOrders().filter(t=>t!==token)].slice(0,100));
  writeStorage('awllahza-last-order',token);
}
