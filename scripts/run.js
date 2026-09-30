import { spawnSync } from 'node:child_process';
const setup=spawnSync(process.execPath,['scripts/ensure-db.js'],{stdio:'inherit',env:process.env,windowsHide:true});
if(setup.status!==0) process.exit(setup.status || 1);
await import('../server/index.js');
