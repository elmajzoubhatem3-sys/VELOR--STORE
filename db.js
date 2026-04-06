import Database from "better-sqlite3";

export const db = new Database("novacart.db");

// 1) Create tables (only if they don't exist)
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- الاسم الأساسي (العربي)
  title TEXT NOT NULL,

  -- أسماء مترجمة
  title_en TEXT,
  title_fr TEXT,
  title_es TEXT,

  price REAL NOT NULL,
  category TEXT NOT NULL,
  image TEXT NOT NULL,

  -- الوصف الأساسي (العربي)
  description TEXT NOT NULL,

  -- أوصاف مترجمة
  description_en TEXT,
  description_fr TEXT,
  description_es TEXT,

  stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,

  -- ✅ Email الزبون (مهم للإيميلات)
  email TEXT,

  payment_method TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total REAL NOT NULL,

  -- pending / Cancelled
  status TEXT NOT NULL DEFAULT 'pending',

  created_at TEXT NOT NULL
);
`);

// 2) Migrations: add missing columns if table already existed
function hasColumn(table, col) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === col);
}

// products translations (in case products table existed before)
if (!hasColumn("products", "title_en")) db.exec(`ALTER TABLE products ADD COLUMN title_en TEXT;`);
if (!hasColumn("products", "title_fr")) db.exec(`ALTER TABLE products ADD COLUMN title_fr TEXT;`);
if (!hasColumn("products", "title_es")) db.exec(`ALTER TABLE products ADD COLUMN title_es TEXT;`);

if (!hasColumn("products", "description_en")) db.exec(`ALTER TABLE products ADD COLUMN description_en TEXT;`);
if (!hasColumn("products", "description_fr")) db.exec(`ALTER TABLE products ADD COLUMN description_fr TEXT;`);
if (!hasColumn("products", "description_es")) db.exec(`ALTER TABLE products ADD COLUMN description_es TEXT;`);

// ✅ orders email + status (in case orders table existed before)
if (!hasColumn("orders", "email")) db.exec(`ALTER TABLE orders ADD COLUMN email TEXT;`);
if (!hasColumn("orders", "status")) db.exec(`ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';`);