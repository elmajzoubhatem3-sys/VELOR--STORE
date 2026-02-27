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

function showPanels(){
  if (token){
    loginPanel.style.display = "none";
    addPanel.style.display = "block";
  } else {
    loginPanel.style.display = "block";
    addPanel.style.display = "none";
  }
}

loginForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  loginMsg.textContent = "عم سجّل دخول...";

  const fd = new FormData(loginForm);
  const email = fd.get("email");
  const password = fd.get("password");

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok){
    loginMsg.textContent = "❌ " + (data.error || "Login failed");
    return;
  }

  token = data.token;
  localStorage.setItem("admin_token", token);
  loginMsg.textContent = "✅ تم تسجيل الدخول";
  showPanels();

  // اختياري: أول ما يسجّل دخول يعرض المنتجات
  loadProductsAdmin();
});

productForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  prodMsg.textContent = "عم نضيف المنتج...";

  const formData = new FormData(productForm); // includes file

  const res = await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
  });

  const data = await res.json();
  if (!res.ok){
    prodMsg.textContent = "❌ " + (data.error || "Error");
    return;
  }

  prodMsg.textContent = "✅ تمت الإضافة";
  productForm.reset();

  // بعد الإضافة اعرض المنتجات
  loadProductsAdmin();
});

logoutBtn.addEventListener("click", ()=>{
  token = "";
  localStorage.removeItem("admin_token");
  showPanels();
  listEl.innerHTML = "";
});

showPanels();

// ===== عرض المنتجات =====
async function loadProductsAdmin() {
  const res = await fetch("/api/products");
  const items = await res.json();

  listEl.innerHTML = items.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,.12);padding:10px;border-radius:12px;margin:8px 0;">
      <div style="display:flex;gap:10px;align-items:center;">
        <img src="${p.image}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;">
        <div>
          <b>${p.title}</b>
          <div style="opacity:.8">${p.category} • ${p.price}$ • stock: ${p.stock ?? 0} • ID: ${p.id}</div>
        </div>
      </div>

      <button data-del="${p.id}" style="background:#ff4d4d;border:0;color:#fff;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:800;">
        حذف
      </button>
    </div>
  `).join("");

  // اربط أزرار الحذف
  document.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = () => deleteProduct(btn.getAttribute("data-del"));
  });
}

refreshBtn.onclick = loadProductsAdmin;

// ===== حذف منتج =====
async function deleteProduct(id) {
  if (!token) return alert("لازم تسجّل دخول أولاً");
  if (!confirm("متأكد من الحذف؟")) return;

  const res = await fetch(`/api/admin/products/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok) {
    return alert(data.error || "فشل الحذف");
  }

  alert("تم الحذف ✅");
  loadProductsAdmin();
}