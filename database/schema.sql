CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(80) PRIMARY KEY,
  content JSON NOT NULL,
  sort_order INT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(120) PRIMARY KEY,
  category_id VARCHAR(80) NOT NULL,
  content JSON NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  order_number VARCHAR(24) NOT NULL UNIQUE,
  idempotency_key CHAR(36) NOT NULL UNIQUE,
  request_hash CHAR(64) NOT NULL,
  tracking_token CHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  order_notes VARCHAR(1000) NOT NULL DEFAULT '',
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  client_ip VARCHAR(45) NULL,
  fulfillment ENUM('dine_in', 'pickup') NOT NULL,
  table_number VARCHAR(12) NULL,
  language ENUM('en', 'ar') NOT NULL,
  payment_method ENUM('cash') NOT NULL DEFAULT 'cash',
  payment_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  status ENUM('new', 'preparing', 'ready', 'completed', 'cancelled') NOT NULL DEFAULT 'new',
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  total_minor INT UNSIGNED NOT NULL,
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX orders_created (created_at),
  INDEX orders_status (status, created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id VARCHAR(120) NOT NULL,
  variant_id VARCHAR(32) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  variant_en VARCHAR(120) NOT NULL,
  variant_ar VARCHAR(120) NOT NULL,
  unit_price_minor INT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  calories INT UNSIGNED NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  CHECK (quantity BETWEEN 1 AND 99)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(id),
  INDEX session_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id TINYINT PRIMARY KEY,
  content JSON NOT NULL
);
