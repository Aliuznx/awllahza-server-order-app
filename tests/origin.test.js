import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isAllowedOrigin} from '../server/origin.js';
test('local aliases work only on the configured protocol and port',()=>{
  const config={origin:'http://127.0.0.1:3000',production:false};
  for(const origin of ['http://localhost:3000','http://127.0.0.1:3000','http://[::1]:3000'])assert.equal(isAllowedOrigin(origin,config),true);
  for(const origin of [undefined,'null','http://localhost:3001','https://localhost:3000','http://localhost.evil.test:3000','http://localhost:3000/','http://192.168.1.2:3000'])assert.equal(isAllowedOrigin(origin,config),false);
});
test('production never grants additional loopback aliases',()=>{
  const config={origin:'https://orders.example',production:true};
  assert.equal(isAllowedOrigin(config.origin,config),true);
  assert.equal(isAllowedOrigin('http://localhost:3000',config),false);
  assert.equal(isAllowedOrigin('http://localhost:3000',{origin:'http://127.0.0.1:3000',production:true}),false);
});
