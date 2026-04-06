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

import nodemailer from "nodemailer";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_NOW";

// 📧 ايميل المتجر
const STORE_EMAIL = "velorevelore1@gmail.com";
const STORE_PASS = "ukgyrzxatkkuvbqd";

// 📞 رقم المتجر للحملة
const STORE_PHONE = "+96171660580";

// ✅ إعدادات الترجمة
// حطهم في .env أو Environment Variables
// مثال:
// TRANSLATE_API_URL=https://your-translation-api.com/translate
// TRANSLATE_API_KEY=xxxx
const TRANSLATE_API_URL = process.env.TRANSLATE_API_URL || "";
const TRANSLATE_API_KEY = process.env.TRANSLATE_API_KEY || "";

// إعداد الإيميل
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: STORE_EMAIL,
    pass: STORE_PASS
  }
});

async function sendMail(to, subject, text) {
  try {
    await mailer.sendMail({
      from: `VELORÉ <${STORE_EMAIL}>`,
      to,
      subject,
      text
    });
  } catch (err) {
    console.error("Email error:", err);
  }
}

// ✅ ترتيب الفئات المتعددة
function normalizeCategories(categoryValue) {
  return String(categoryValue || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .join(",");
}

// ✅ تنظيف النص
function cleanText(value) {
  return String(value || "").trim();
}

// ✅ هل خدمة الترجمة مفعلة؟
function canAutoTranslate() {
  return Boolean(TRANSLATE_API_URL);
}

// ✅ ترجمة نص واحد
async function translateText(text, sourceLang, targetLang) {
  const input = cleanText(text);
  if (!input) return "";

  if (sourceLang === targetLang) return input;

  if (!canAutoTranslate()) {
    return "";
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };

    if (TRANSLATE_API_KEY) {
      headers["Authorization"] = `Bearer ${TRANSLATE_API_KEY}`;
    }

    const res = await fetch(TRANSLATE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: input,
        source_lang: sourceLang,
        target_lang: targetLang
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Translate API error:", data);
      return "";
    }

    return cleanText(
      data.translation ||
      data.translatedText ||
      data.text ||
      ""
    );
  } catch (err) {
    console.error("Translate request failed:", err);
    return "";
  }
}

// ✅ توليد الترجمات تلقائيًا
async function buildTranslatedFields({
  source_lang,
  title,
  description,
  title_en,
  title_fr,
  title_es,
  description_en,
  description_fr,
  description_es
}) {
  const src = cleanText(source_lang || "ar").toLowerCase() === "en" ? "en" : "ar";

  const inputTitle = cleanText(title);
  const inputDescription = cleanText(description);

  // نعتبر title/description هما النص الأساسي المدخل
  // ونخزنهم أيضًا حسب لغة المصدر
  let title_ar = src === "ar" ? inputTitle : "";
  let title_en_final = src === "en" ? inputTitle : cleanText(title_en);

  let description_ar = src === "ar" ? inputDescription : "";
  let description_en_final = src === "en" ? inputDescription : cleanText(description_en);

  let title_fr_final = cleanText(title_fr);
  let title_es_final = cleanText(title_es);

  let description_fr_final = cleanText(description_fr);
  let description_es_final = cleanText(description_es);

  // إذا المصدر عربي → ترجمة الإنجليزي/الفرنسي/الإسباني إن كانوا فاضيين
  if (src === "ar") {
    if (!title_en_final && inputTitle) {
      title_en_final = await translateText(inputTitle, "ar", "en");
    }
    if (!title_fr_final && inputTitle) {
      title_fr_final = await translateText(inputTitle, "ar", "fr");
    }
    if (!title_es_final && inputTitle) {
      title_es_final = await translateText(inputTitle, "ar", "es");
    }

    if (!description_en_final && inputDescription) {
      description_en_final = await translateText(inputDescription, "ar", "en");
    }
    if (!description_fr_final && inputDescription) {
      description_fr_final = await translateText(inputDescription, "ar", "fr");
    }
    if (!description_es_final && inputDescription) {
      description_es_final = await translateText(inputDescription, "ar", "es");
    }
  }

  // إذا المصدر إنكليزي → ترجمة العربي/الفرنسي/الإسباني إن كانوا فاضيين
  if (src === "en") {
    if (!title_ar && inputTitle) {
      title_ar = await translateText(inputTitle, "en", "ar");
    }
    if (!title_fr_final && inputTitle) {
      title_fr_final = await translateText(inputTitle, "en", "fr");
    }
    if (!title_es_final && inputTitle) {
      title_es_final = await translateText(inputTitle, "en", "es");
    }

    if (!description_ar && inputDescription) {
      description_ar = await translateText(inputDescription, "en", "ar");
    }
    if (!description_fr_final && inputDescription) {
      description_fr_final = await translateText(inputDescription, "en", "fr");
    }
    if (!description_es_final && inputDescription) {
      description_es_final = await translateText(inputDescription, "en", "es");
    }
  }

  // fallback حتى ما ينكسر الموقع
  if (!title_ar) title_ar = inputTitle || title_en_final || title_fr_final || title_es_final || "";
  if (!title_en_final) title_en_final = src === "en" ? inputTitle : "";
  if (!description_ar) description_ar = inputDescription || description_en_final || description_fr_final || description_es_final || "";
  if (!description_en_final) description_en_final = src === "en" ? inputDescription : "";

  return {
    title: title_ar,
    title_en: title_en_final || null,
    title_fr: title_fr_final || null,
    title_es: title_es_final || null,
    description: description_ar,
    description_en: description_en_final || null,
    description_fr: description_fr_final || null,
    description_es: description_es_final || null
  };
}

// Helpers: build bilingual/4-lang texts
function itemsBlockAR(detailed) {
  return detailed.map(x => `- ${x.title} ×${x.qty}`).join("\n");
}
function itemsBlockEN(detailed) {
  return detailed.map(x => `- ${x.title} x${x.qty}`).join("\n");
}
function itemsBlockFR(detailed) {
  return detailed.map(x => `- ${x.title} x${x.qty}`).join("\n");
}
function itemsBlockES(detailed) {
  return detailed.map(x => `- ${x.title} x${x.qty}`).join("\n");
}

function buildCustomerOrderEmail({ orderId, total, detailed }) {
  const itemsAR = itemsBlockAR(detailed);
  const itemsEN = itemsBlockEN(detailed);
  const itemsFR = itemsBlockFR(detailed);
  const itemsES = itemsBlockES(detailed);

  return `AR 🇦🇪
✅ تم استلام طلبك بنجاح.
رقم الطلب: #${orderId}
المجموع: ${total}$

المنتجات:
${itemsAR}

سنقوم بالتواصل معك قريباً لتأكيد الطلب.
📞 للتواصل: ${STORE_PHONE}

--------------------------------

EN 🇬🇧
✅ Your order has been received.
Order ID: #${orderId}
Total: ${total}$

Items:
${itemsEN}

We will contact you shortly to confirm.
📞 Contact us: ${STORE_PHONE}

--------------------------------

FR 🇫🇷
✅ Nous avons reçu votre commande.
Commande: #${orderId}
Total: ${total}$

Articles:
${itemsFR}

Nous vous contacterons bientôt pour confirmer.
📞 Contact: ${STORE_PHONE}

--------------------------------

ES 🇪🇸
✅ Hemos recibido tu pedido.
Pedido: #${orderId}
Total: ${total}$

Productos:
${itemsES}

Te contactaremos pronto pour confirmer.
📞 Contáctanos: ${STORE_PHONE}
`;
}

function buildCustomerCancelEmail({ orderId }) {
  return `AR 🇦🇪
❌ تم إلغاء طلبك رقم #${orderId} من متجر VELORÉ.
📞 للتواصل: ${STORE_PHONE}

--------------------------------

EN 🇬🇧
❌ Your order #${orderId} has been cancelled by VELORÉ.
📞 Contact us: ${STORE_PHONE}

--------------------------------

FR 🇫🇷
❌ Votre commande #${orderId} a été annulée par VELORÉ.
📞 Contact: ${STORE_PHONE}

--------------------------------

ES 🇪🇸
❌ Tu pedido #${orderId} fue cancelado por VELORÉ.
📞 Contáctanos: ${STORE_PHONE}
`;
}

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
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// ✅ DB MIGRATION
function ensureColumns() {
  try {
    db.prepare("SELECT email FROM orders LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE orders ADD COLUMN email TEXT").run();
      console.log("✅ DB: added orders.email");
    } catch {
      console.log("ℹ️ DB: orders.email already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT status FROM orders LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'").run();
      console.log("✅ DB: added orders.status");
    } catch {
      console.log("ℹ️ DB: orders.status already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT title_en FROM products LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE products ADD COLUMN title_en TEXT").run();
      console.log("✅ DB: added products.title_en");
    } catch {
      console.log("ℹ️ DB: products.title_en already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT title_fr FROM products LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE products ADD COLUMN title_fr TEXT").run();
      console.log("✅ DB: added products.title_fr");
    } catch {
      console.log("ℹ️ DB: products.title_fr already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT title_es FROM products LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE products ADD COLUMN title_es TEXT").run();
      console.log("✅ DB: added products.title_es");
    } catch {
      console.log("ℹ️ DB: products.title_es already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT description_en FROM products LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE products ADD COLUMN description_en TEXT").run();
      console.log("✅ DB: added products.description_en");
    } catch {
      console.log("ℹ️ DB: products.description_en already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT description_fr FROM products LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE products ADD COLUMN description_fr TEXT").run();
      console.log("✅ DB: added products.description_fr");
    } catch {
      console.log("ℹ️ DB: products.description_fr already exists or cannot be added");
    }
  }

  try {
    db.prepare("SELECT description_es FROM products LIMIT 1").get();
  } catch {
    try {
      db.prepare("ALTER TABLE products ADD COLUMN description_es TEXT").run();
      console.log("✅ DB: added products.description_es");
    } catch {
      console.log("ℹ️ DB: products.description_es already exists or cannot be added");
    }
  }
}
ensureColumns();

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

// ✅ Product page without .html
app.get("/product/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

// banners
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
    expiresIn: "1000d",
  });
  res.json({ token });
});

// Products
app.get("/api/products", (req, res) => {
  const { category, q } = req.query;
  let rows;

  if (category) {
    rows = db
      .prepare("SELECT * FROM products WHERE category LIKE ? ORDER BY id DESC")
      .all(`%${category}%`);
  } else if (q) {
    rows = db
      .prepare("SELECT * FROM products WHERE title LIKE ? ORDER BY id DESC")
      .all(`%${q}%`);
  } else {
    rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  }

  res.json(rows);
});

// ✅ Add product (with auto translation if API configured)
app.post("/api/admin/products", auth, upload.single("image"), async (req, res) => {
  try {
    const {
      source_lang,
      title,
      title_en,
      title_fr,
      title_es,
      price,
      category,
      description,
      description_en,
      description_fr,
      description_es,
      stock
    } = req.body || {};

    const normalizedCategory = normalizeCategories(category);
    const inputTitle = cleanText(title);
    const inputDescription = cleanText(description);

    if (!inputTitle || !price || !normalizedCategory || !req.file) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const translated = await buildTranslatedFields({
      source_lang,
      title: inputTitle,
      description: inputDescription,
      title_en,
      title_fr,
      title_es,
      description_en,
      description_fr,
      description_es
    });

    const image = "/image/" + req.file.filename;

    const info = db.prepare(`
      INSERT INTO products (
        title, title_en, title_fr, title_es,
        price, category, image,
        description, description_en, description_fr, description_es,
        stock
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      translated.title,
      translated.title_en,
      translated.title_fr,
      translated.title_es,
      Number(price),
      normalizedCategory,
      image,
      translated.description,
      translated.description_en,
      translated.description_fr,
      translated.description_es,
      Number(stock ?? 0)
    );

    res.json({
      id: info.lastInsertRowid,
      image,
      auto_translation_enabled: canAutoTranslate()
    });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update product (with auto translation if API configured)
app.put("/api/admin/products/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const oldProduct = db.prepare("SELECT * FROM products WHERE id=?").get(id);
    if (!oldProduct) return res.status(404).json({ error: "Not found" });

    const {
      source_lang,
      title,
      title_en,
      title_fr,
      title_es,
      price,
      category,
      description,
      description_en,
      description_fr,
      description_es,
      stock
    } = req.body || {};

    const normalizedCategory = normalizeCategories(category);
    const inputTitle = cleanText(title);
    const inputDescription = cleanText(description);

    if (!inputTitle || !price || !normalizedCategory) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const translated = await buildTranslatedFields({
      source_lang,
      title: inputTitle,
      description: inputDescription,
      title_en,
      title_fr,
      title_es,
      description_en,
      description_fr,
      description_es
    });

    const image = req.file ? ("/image/" + req.file.filename) : oldProduct.image;

    db.prepare(`
      UPDATE products
      SET
        title=?,
        title_en=?,
        title_fr=?,
        title_es=?,
        price=?,
        category=?,
        image=?,
        description=?,
        description_en=?,
        description_fr=?,
        description_es=?,
        stock=?
      WHERE id=?
    `).run(
      translated.title,
      translated.title_en,
      translated.title_fr,
      translated.title_es,
      Number(price),
      normalizedCategory,
      image,
      translated.description,
      translated.description_en,
      translated.description_fr,
      translated.description_es,
      Number(stock ?? 0),
      id
    );

    res.json({
      success: true,
      image,
      auto_translation_enabled: canAutoTranslate()
    });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete product
app.delete("/api/admin/products/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const product = db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if (!product) return res.status(404).json({ error: "Not found" });

  db.prepare("DELETE FROM products WHERE id=?").run(id);

  res.json({ success: true });
});

// Delete all orders
app.delete("/api/admin/orders", auth, (req, res) => {
  db.prepare("DELETE FROM orders").run();
  res.json({ success: true });
});

// Delete one order
app.delete("/api/admin/orders/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  db.prepare("DELETE FROM orders WHERE id=?").run(id);
  res.json({ success: true });
});

// Admin: list orders
app.get("/api/admin/orders", auth, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  res.json(rows);
});

// Cancel order
app.patch("/api/admin/orders/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  db.prepare("UPDATE orders SET status = 'Cancelled' WHERE id=?").run(id);

  if (order.email) {
    const cancelText = buildCustomerCancelEmail({ orderId: order.id });
    sendMail(order.email, `VELORÉ — Order Cancelled #${order.id}`, cancelText);
  }

  res.json({ success: true });
});

// Orders
app.post("/api/orders", (req, res) => {
  const { name, phone, address, email, payment_method, items } = req.body || {};

  if (!name || !phone || !address || !payment_method || !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing order fields" });
  }

  const placeOrder = db.transaction(() => {
    let total = 0;
    const detailed = [];

    for (const it of items) {
      const qty = Math.max(1, Math.min(99, Number(it.qty || 1)));

      const p = db
        .prepare("SELECT id,title,price,stock FROM products WHERE id=?")
        .get(it.product_id);

      if (!p) throw new Error("Bad product");
      if ((p.stock ?? 0) < qty) throw new Error("Not enough stock");

      total += p.price * qty;

      detailed.push({
        product_id: p.id,
        title: p.title,
        price: p.price,
        qty,
      });

      db.prepare("UPDATE products SET stock = stock - ? WHERE id=?").run(qty, p.id);
    }

    const created_at = new Date().toISOString();

    const info = db.prepare(`
      INSERT INTO orders (name, phone, address, email, payment_method, items_json, total, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      name,
      phone,
      address,
      email,
      payment_method,
      JSON.stringify(detailed),
      total,
      created_at
    );

    return { order_id: info.lastInsertRowid, total, detailed };
  });

  try {
    const result = placeOrder();

    const shopText =
`New Order #${result.order_id}

Name: ${name}
Phone: ${phone}
Address: ${address}
Email: ${email}

Items:
${result.detailed.map(x => `${x.title} x${x.qty}`).join("\n")}

Total: ${result.total}$`;

    sendMail(STORE_EMAIL, `New Order #${result.order_id}`, shopText);

    if (email) {
      const customerText = buildCustomerOrderEmail({
        orderId: result.order_id,
        total: result.total,
        detailed: result.detailed,
      });

      sendMail(email, `VELORÉ — Order #${result.order_id} Confirmed`, customerText);
    }

    res.json({ order_id: result.order_id, total: result.total });
  } catch (e) {
    const msg = String(e.message || "");

    if (msg.includes("Not enough stock")) {
      return res.status(400).json({ error: "Not enough stock" });
    }

    return res.status(400).json({ error: "Bad product" });
  }
});

// ===== TEST EMAIL (for debugging) =====
app.get("/api/test-email", async (req, res) => {
  try {
    const to = req.query.to;
    if (!to) return res.status(400).send("Add ?to=EMAIL");

    const info = await mailer.sendMail({
      from: STORE_EMAIL,
      to,
      subject: "VELORÉ Test Email ✅",
      text: `If you received this, email is working ✅\n\nContact: ${STORE_PHONE}`
    });

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error("EMAIL TEST ERROR:", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.listen(PORT, () => console.log(`VELORÉ running http://localhost:${PORT}`));
