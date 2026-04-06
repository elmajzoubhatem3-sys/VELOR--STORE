let token = localStorage.getItem("admin_token") || "";

const loginPanel = document.getElementById("loginPanel");
const addPanel = document.getElementById("addPanel");
const loginForm = document.getElementById("loginForm");
const productForm = document.getElementById("productForm");
const editForm = document.getElementById("editForm");

const loginMsg = document.getElementById("loginMsg");
const prodMsg = document.getElementById("prodMsg");
const editMsg = document.getElementById("editMsg");

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

// ✅ helper: collect multiple selected categories
function getSelectedCategories(selectEl){
  if (!selectEl) return "";
  return [...selectEl.selectedOptions]
    .map(o => o.value)
    .filter(Boolean)
    .join(",");
}

// ✅ helper: set multiple selected categories
function setSelectedCategories(selectEl, categoryString){
  if (!selectEl) return;

  const values = String(categoryString || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  [...selectEl.options].forEach(option => {
    option.selected = values.includes(option.value);
  });
}

loginForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  loginMsg.textContent = "جاري تسجيل الدخول...";

  const fd = new FormData(loginForm);
  const email = fd.get("email");
  const password = fd.get("password");

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok){
    loginMsg.textContent = "❌ " + (data.error || "Login failed");
    return;
  }

  token = data.token;
  localStorage.setItem("admin_token", token);
  loginMsg.textContent = "✅ تم تسجيل الدخول";
  showPanels();
  loadProductsAdmin();
});

productForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  prodMsg.textContent = "جاري إضافة المنتج...";

  const formData = new FormData(productForm);

  const categorySelect = productForm.querySelector('[name="category"]');
  const categories = getSelectedCategories(categorySelect);
  formData.set("category", categories);

  const sourceLang = formData.get("source_lang") || "ar";
  formData.set("source_lang", sourceLang);

  const res = await fetch("/api/admin/products", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok){
    prodMsg.textContent = "❌ " + (data.error || "Error");
    return;
  }

  prodMsg.textContent = "✅ تمت الإضافة";
  productForm.reset();

  const sourceLangField = productForm.querySelector('[name="source_lang"]');
  if (sourceLangField) sourceLangField.value = "ar";

  loadProductsAdmin();
});

editForm.addEventListener("submit", async (e)=>{
  e.preventDefault();
  editMsg.textContent = "جاري حفظ التعديل...";

  const id = document.getElementById("editId").value;
  if (!id) {
    editMsg.textContent = "❌ اختر منتج أولاً";
    return;
  }

  const formData = new FormData(editForm);

  const editCategorySelect = document.getElementById("editCategory");
  const categories = getSelectedCategories(editCategorySelect);
  formData.set("category", categories);

  const sourceLang = formData.get("source_lang") || "ar";
  formData.set("source_lang", sourceLang);

  const res = await fetch(`/api/admin/products/${id}`, {
    method: "PUT",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
  });

  const data = await res.json().catch(()=> ({}));
  if (!res.ok){
    editMsg.textContent = "❌ " + (data.error || "Error");
    return;
  }

  editMsg.textContent = "✅ تم حفظ التعديل";
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
  const items = await res.json().catch(()=> []);

  listEl.innerHTML = items.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,.12);padding:10px;border-radius:12px;margin:8px 0;gap:10px;flex-wrap:wrap;">
      <div style="display:flex;gap:10px;align-items:center;min-width:260px;">
        <img src="${p.image}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;">
        <div>
          <b>${p.title}</b>
          <div style="opacity:.8">${p.category} • ${p.price}$ • stock: ${p.stock ?? 0} • ID: ${p.id}</div>
          <div style="opacity:.65;font-size:12px;">
            EN: ${p.title_en || "-"} | FR: ${p.title_fr || "-"} | ES: ${p.title_es || "-"}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:8px;align-items:center;">
        <button data-edit="${p.id}" style="background:#ffcc00;border:0;color:#000;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:800;">
          تعديل
        </button>
        <button data-del="${p.id}" style="background:#ff4d4d;border:0;color:#fff;padding:10px 12px;border-radius:10px;cursor:pointer;font-weight:800;">
          حذف
        </button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll("[data-del]").forEach(btn => {
    btn.onclick = () => deleteProduct(btn.getAttribute("data-del"));
  });

  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = () => fillEditForm(btn.getAttribute("data-edit"), items);
  });
}

if (refreshBtn) refreshBtn.onclick = loadProductsAdmin;

// ===== تعبئة فورم التعديل =====
function fillEditForm(id, items = null) {
  const applyData = (p) => {
    if (!p) return alert("المنتج غير موجود");

    document.getElementById("editId").value = p.id || "";
    document.getElementById("editTitle").value = p.title || "";
    document.getElementById("editTitleEn").value = p.title_en || "";
    document.getElementById("editTitleFr").value = p.title_fr || "";
    document.getElementById("editTitleEs").value = p.title_es || "";

    document.getElementById("editPrice").value = p.price ?? "";
    setSelectedCategories(document.getElementById("editCategory"), p.category || "");
    document.getElementById("editStock").value = p.stock ?? 0;

    document.getElementById("editDescription").value = p.description || "";
    document.getElementById("editDescriptionEn").value = p.description_en || "";
    document.getElementById("editDescriptionFr").value = p.description_fr || "";
    document.getElementById("editDescriptionEs").value = p.description_es || "";

    const editSourceLang = document.getElementById("editSourceLang");
    if (editSourceLang) {
      // إذا عندك منطق مختلف لاحقًا بالسيرفر، تقدر تخزّنه فعليًا
      // حاليًا نخليه عربي افتراضي إذا الاسم الأساسي عربي، أو English إذا بدك تبدله يدويًا
      editSourceLang.value = "ar";
    }

    editMsg.textContent = "جاهز للتعديل ✏️";
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (Array.isArray(items)) {
    const p = items.find(x => String(x.id) === String(id));
    applyData(p);
    return;
  }

  fetch("/api/products")
    .then(r => r.json())
    .then(list => {
      const p = list.find(x => String(x.id) === String(id));
      applyData(p);
    })
    .catch(() => alert("صار خطأ أثناء تحميل بيانات المنتج"));
}

// ===== حذف منتج =====
async function deleteProduct(id) {
  if (!token) return alert("يجب تسجيل دخول أولاً");
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