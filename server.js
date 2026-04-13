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

// dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Upload config =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public", "image"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "");
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ===== Middlewares =====
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120
  })
);

// ===== Auth =====
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

// ===== Home =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== Auto Banner API =====
app.get("/api/banners", (req, res) => {
  const dirPath = path.join(__dirname, "public", "image");

  if (!fs.existsSync(dirPath)) return res.json([]);

  const files = fs.readdirSync(dirPath)
    .filter(file => /^banner/i.test(file))
    .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file));

  res.json(files);
});

// ===== Admin Login =====
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  const admin = db.prepare("SELECT * FROM admins WHERE email=?").get(email);
  if (!admin) return res.status(401).json({ error: "Bad credentials" });

  const ok = bcrypt.compareSync(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Bad credentials" });

  const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

// ===== Get Products =====
app.get("/api/products", (req, res) => {
  const { category, q } = req.query;
  let rows;

  if (category) {
    rows = db.prepare("SELECT * FROM products WHERE category=? ORDER BY id DESC").all(category);
  } else if (q) {
    rows = db.prepare("SELECT * FROM products WHERE title LIKE ? ORDER BY id DESC").all(`%${q}%`);
  } else {
    rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  }

  res.json(rows);
});

// ===== Add Product with Upload =====
app.post("/api/admin/products", auth, upload.single("image"), (req, res) => {
  const { title, price, category, description, stock } = req.body;

  if (!title || !price || !category || !description || !req.file) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const imagePath = "/image/" + req.file.filename;

  const info = db.prepare(`
    INSERT INTO products (title, price, category, image, description, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, price, category, imagePath, description, stock ?? 0);

  res.json({ id: info.lastInsertRowid });
});

// ===== Orders =====
app.post("/api/orders", (req, res) => {
  const { name, phone, address, payment_method, items } = req.body;

  if (!name || !phone || !address || !payment_method || !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing order fields" });
  }

  let total = 0;
  const detailed = [];

  for (const it of items) {
    const p = db.prepare("SELECT id,title,price FROM products WHERE id=?").get(it.product_id);
    if (!p) return res.status(400).json({ error: "Bad product" });

    const qty = Math.max(1, Number(it.qty || 1));
    total += p.price * qty;
    detailed.push({ product_id: p.id, qty });
  }

  const info = db.prepare(`
    INSERT INTO orders (name, phone, address, payment_method, items_json, total, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone, address, payment_method, JSON.stringify(detailed), total, new Date().toISOString());

  res.json({ order_id: info.lastInsertRowid, total });
});

app.listen(PORT, () => console.log(`NovaCart running ✅ http://localhost:${PORT}`));