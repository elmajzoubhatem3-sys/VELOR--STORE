import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_NOW";

// ESM dirname helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload folder exists
const uploadDir = path.join(__dirname, "public", "image");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^\w.\-]/g, "");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// Auth middleware
function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Auto banners API (any file that starts with banner in /public/image)
app.get("/api/banners", (req, res) => {
  const files = fs
    .readdirSync(uploadDir)
    .filter((f) => /^banner/i.test(f))
    .filter((f) => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b));
  res.json(files);
});

// Admin login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  const admin = db.prepare("SELECT * FROM admins WHERE email=?").get(email);
  if (!admin) return res.status(401).json({ error: "Bad credentials" });

  const ok = bcrypt.compareSync(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Bad credentials" });

  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token });
});

// Products
app.get("/api/products", (req, res) => {
  const { category, q } = req.query;
  let rows;
  if (category) {
    rows = db
      .prepare("SELECT * FROM products WHERE category=? ORDER BY id DESC")
      .all(category);
  } else if (q) {
    rows = db
      .prepare("SELECT * FROM products WHERE title LIKE ? ORDER BY id DESC")
      .all(`%${q}%`);
  } else {
    rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  }
  res.json(rows);
});

// ✅ Add product + Upload image from Admin
app.post("/api/admin/products", auth, upload.single("image"), (req, res) => {
  const { title, price, category, description, stock } = req.body || {};
  if (!title || !price || !category || !description || !req.file) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const image = "/image/" + req.file.filename;
  const info = db
    .prepare(
      `
    INSERT INTO products (title, price, category, image, description, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `
    )
    .run(title, price, category, image, description, Number(stock ?? 0));

  res.json({ id: info.lastInsertRowid, image });
});

// ✅ Delete product (Admin)
app.delete("/api/admin/products/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const product = db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if (!product) return res.status(404).json({ error: "Not found" });

  db.prepare("DELETE FROM products WHERE id=?").run(id);
  res.json({ success: true });
});

// ✅ Orders (decrease stock + block if not enough)
app.post("/api/orders", (req, res) => {
  const { name, phone, address, payment_method, items } = req.body || {};
  if (
    !name ||
    !phone ||
    !address ||
    !payment_method ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({ error: "Missing order fields" });
  }

  const placeOrder = db.transaction(() => {
    let total = 0;
    const detailed = [];

    for (const it of items) {
      const qty = Math.max(1, Math.min(99, Number(it.qty || 1)));

      // ✅ bring stock
      const p = db
        .prepare("SELECT id,title,price,stock FROM products WHERE id=?")
        .get(it.product_id);

      if (!p) throw new Error("Bad product");

      // ✅ block if not enough
      if ((p.stock ?? 0) < qty) throw new Error("Not enough stock");

      total += p.price * qty;
      detailed.push({
        product_id: p.id,
        title: p.title,
        price: p.price,
        qty,
      });

      // ✅ decrease stock
      db.prepare("UPDATE products SET stock = stock - ? WHERE id=?").run(qty, p.id);
    }

    const created_at = new Date().toISOString();
    const info = db
      .prepare(
        `
      INSERT INTO orders (name, phone, address, payment_method, items_json, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        name,
        phone,
        address,
        payment_method,
        JSON.stringify(detailed),
        total,
        created_at
      );

    return { order_id: info.lastInsertRowid, total };
  });

  try {
    const result = placeOrder();
    res.json(result);
  } catch (e) {
    const msg = String(e.message || "");
    if (msg.includes("Not enough stock")) {
      return res.status(400).json({ error: "Not enough stock" });
    }
    return res.status(400).json({ error: "Bad product" });
  }
});

app.listen(PORT, () =>
  console.log(`VELORÉ running ✅ http://localhost:${PORT}`)
);