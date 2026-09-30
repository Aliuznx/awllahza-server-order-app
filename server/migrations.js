import { pool } from './db.js';

export async function migrateOrders() {
  const [columns] = await pool.query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders'");
  if (!columns.length) return;
  const names = new Set(columns.map(c => c.COLUMN_NAME));
  for (const [name,definition] of [['order_notes',"VARCHAR(1000) NOT NULL DEFAULT ''"],['revision','INT UNSIGNED NOT NULL DEFAULT 0'],['client_ip','VARCHAR(45) NULL']]) {
    if (!names.has(name)) {
      try { await pool.query(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`); }
      catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
    }
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS order_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    kind ENUM('created','edited','cancelled') NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
