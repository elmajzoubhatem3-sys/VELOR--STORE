import { db } from "./db.js";
import bcrypt from "bcryptjs";

// ===== 1) ADMIN =====
const email = "admin@veloré.com";
const password = "ChangeMe123!";
const hash = bcrypt.hashSync(password, 10);

db.prepare(`
  INSERT OR IGNORE INTO admins (email, password_hash)
  VALUES (?, ?)
`).run(email, hash);

// ===== 2) RESET PRODUCTS (اختياري)
// احذف هالسطر إذا ما بدك يمسح المنتجات القديمة
db.prepare("DELETE FROM products").run();

// ===== 3) PRODUCTS =====
const products = [
  {
    title: "Four-size Momaz brand cooking pot",
    price: 45,
    category: "Home & Kitchen",
    image: "/image/pot.jpg",
    description: "Set of 2 containers, durable, freezer & dishwasher safe.",
    stock: 50
  },
  {
    title: "Kids Toy - Hippos",
    price: 9.99,
    category: "Toys",
    image: "/images/hippos.jpg",
    description: "Fun family game. Great gift.",
    stock: 25
  },
  {
    title: "Running Shoes Pro",
    price: 59.99,
    category: "Fashion",
    image: "/images/shoes.jpg",
    description: "Lightweight running shoes.",
    stock: 30
  },
  {
    title: "Bluetooth Headphones",
    price: 39.99,
    category: "Electronics",
    image: "/images/headphones.jpg",
    description: "Wireless headphones with deep bass.",
    stock: 40
  }
];

const stmt = db.prepare(`
  INSERT INTO products (title, price, category, image, description, stock)
  VALUES (@title, @price, @category, @image, @description, @stock)
`);

for (const p of products) {
  stmt.run(p);
}

console.log("Seed done ✅");
console.log("Admin login:", email, "Password:", password);