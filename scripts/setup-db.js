import { readFile } from 'node:fs/promises';
import { pool } from '../server/db.js';
import { defaultSettings } from '../server/settings.js';
import { migrateOrders } from '../server/migrations.js';

const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
try {
  for (const statement of schema.split(';').map(s => s.trim()).filter(Boolean)) await pool.query(statement);
  await migrateOrders();
  await pool.execute('INSERT IGNORE INTO restaurant_settings (id,content) VALUES (1,?)', [JSON.stringify(defaultSettings)]);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [index, category] of catalog.categories.entries()) {
      await connection.execute('INSERT INTO categories (id,content,sort_order) VALUES (?,?,?) ON DUPLICATE KEY UPDATE content=?,sort_order=?', [category.id,JSON.stringify(category),index,JSON.stringify(category),index]);
    }
    // An existing availability override is preserved across imports.
    for (const [index, product] of catalog.products.entries()) {
      const data = JSON.stringify(product);
      await connection.execute('INSERT INTO products (id,category_id,content,active,sort_order) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE category_id=?,content=?,sort_order=?', [product.id,product.categoryId,data,product.active,index,product.categoryId,data,index]);
    }
    const ids = catalog.products.map(p => p.id);
    await connection.execute(`UPDATE products SET active=FALSE WHERE id NOT IN (${ids.map(() => '?').join(',')})`, ids);
    await connection.commit();
    console.log(`Imported ${catalog.categories.length} categories and ${catalog.products.length} products into MySQL.`);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
} finally { await pool.end(); }
