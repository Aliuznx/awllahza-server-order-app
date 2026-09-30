import { spawnSync } from 'node:child_process';
import { pool } from '../server/db.js';
try {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='products'");
  if (!rows[0].n) {
    const result=spawnSync(process.execPath,['scripts/setup-db.js'],{stdio:'inherit',env:process.env,windowsHide:true});
    if(result.status!==0)throw new Error('Initial database setup failed.');
  }
} finally { await pool.end(); }
