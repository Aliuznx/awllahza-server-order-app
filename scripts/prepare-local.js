import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pool } from '../server/db.js';
if(process.env.TEST_MODE!=='true'||process.env.MYSQL_HOST!=='127.0.0.1')throw new Error('This helper is for the local test installation only.');
try {
  let ready=false;
  for(let i=0;i<20;i++){try{await pool.query('SELECT 1');ready=true;break;}catch{await delay(500);}}
  if(!ready)throw new Error('MySQL is not ready. Check .runtime/mysql.stderr.log.');
  const result=spawnSync(process.execPath,['scripts/ensure-db.js'],{stdio:'inherit',env:process.env,windowsHide:true});
  if(result.status!==0)throw new Error('Schema setup failed.');
  const [rows]=await pool.query('SELECT COUNT(*) AS n FROM admins');
  if(!rows[0].n){
    const password=randomBytes(18).toString('hex');
    const created=spawnSync(process.execPath,['scripts/create-admin.js'],{stdio:'inherit',windowsHide:true,env:{...process.env,ADMIN_USERNAME:'restaurant',ADMIN_PASSWORD:password}});
    if(created.status!==0)throw new Error('Administrator setup failed.');
    await writeFile(new URL('../.runtime/admin-access.txt',import.meta.url),`Local test admin\nURL: http://127.0.0.1:3000/admin\nUsername: restaurant\nPassword: ${password}\n\nDo not commit or share this file.\n`);
  }
} finally { await pool.end(); }
