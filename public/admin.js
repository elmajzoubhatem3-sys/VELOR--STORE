let token = localStorage.getItem("admin_token") || "";

const loginPanel = document.getElementById("loginPanel");
const addPanel = document.getElementById("addPanel");
const loginForm = document.getElementById("loginForm");
const productForm = document.getElementById("productForm");
const loginMsg = document.getElementById("loginMsg");
const prodMsg = document.getElementById("prodMsg");
const logoutBtn = document.getElementById("logout");
const refreshBtn = document.getElementById("refresh");
const listEl = document.getElementById("list");

function showPanels() {
  if (token) {
    loginPanel.style.display = "none";
    addPanel.style.display = "block";
  } else {
    loginPanel.style.display = "block";
    addPanel.style.display = "none";
  }
}

async function adminLogin(email, password) {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.token;
}

async function addProduct(payload) {
  const res = await fetch("/api/admin/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Add product failed");
  return data;
}

async function fetchProducts() {
  const res = await fetch("/api/products");
  return await res.json();
}

function escapeHtml(s="") {
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "عم بسجّل دخول...";
  loginMsg.className = "hint";

  const fd = new FormData(loginForm);
  const email = fd.get("email");
  const password = fd.get("password");

  try {
    token = await adminLogin(email, password);
    localStorage.setItem("admin_token", token);
    loginMsg.textContent = "✅ تم تسجيل الدخول";
    loginMsg.className = "hint ok";
    showPanels();
  } catch (err) {
    loginMsg.textContent = "❌ " + err.message;
    loginMsg.className = "hint err";
  }
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  prodMsg.textContent = "عم نضيف المنتج...";
  prodMsg.className = "hint";

  const fd = new FormData(productForm);
  const payload = {
    title: fd.get("title"),
    price: Number(fd.get("price")),
    category: fd.get("category"),
    image: fd.get("image"),
    description: fd.get("description"),
    stock: Number(fd.get("stock") || 0)
  };

  try {
    const out = await addProduct(payload);
    prodMsg.textContent = `✅ تم! ID: ${out.id}`;
    prodMsg.className = "hint ok";
    productForm.reset();
  } catch (err) {
    prodMsg.textContent = "❌ " + err.message;
    prodMsg.className = "hint err";
  }
});

logoutBtn.addEventListener("click", () => {
  token = "";
  localStorage.removeItem("admin_token");
  showPanels();
});

refreshBtn.addEventListener("click", async () => {
  const items = await fetchProducts();
  const last = items.slice(0, 8);
  listEl.innerHTML = last.map(p => `
    <div class="row" style="align-items:center">
      <div style="display:flex;gap:10px;align-items:center">
        <img src="${p.image}" style="width:54px;height:54px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.12)"/>
        <div>
          <b>${escapeHtml(p.title)}</b>
          <div style="opacity:.8">${escapeHtml(p.category)} • ${p.price}$ • stock: ${p.stock ?? 0}</div>
        </div>
      </div>
    </div>
  `).join("");
});

showPanels();