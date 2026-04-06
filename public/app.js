let PRODUCTS = [];
let cart = [];

let selectedCategory = null;

const cats = [
  { value: null },
  { value: "Fashion" },
  { value: "Home & Kitchen" },
  { value: "Electronics" },
  { value: "Toys" },
  { value: "Beauty" }
];

const grid = document.getElementById("grid");
const catsEl = document.getElementById("cats");
const cartModal = document.getElementById("cartModal");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const totalEl = document.getElementById("total");
const search = document.getElementById("search");

const hero = document.getElementById("hero");
const slider = document.getElementById("slider");
const dotsContainer = document.getElementById("dots");

function money(n){ return (Math.round(n * 100) / 100).toFixed(2); }

// ===== Translation helpers =====

function getTranslatedTitle(product){
  if (currentLang === "en") return product.title_en || product.title || "";
  if (currentLang === "fr") return product.title_fr || product.title || "";
  if (currentLang === "es") return product.title_es || product.title || "";
  return product.title || "";
}

function getTranslatedDescription(product){
  if (currentLang === "en") return product.description_en || product.description || "";
  if (currentLang === "fr") return product.description_fr || product.description || "";
  if (currentLang === "es") return product.description_es || product.description || "";
  return product.description || "";
}

function getProductLink(id){
  return `${window.location.origin}/product/${id}`;
}

function isLongDescription(text){
  const clean = String(text || "").trim();
  return clean.length > 90;
}

async function copyProductLink(id){
  const link = getProductLink(id);

  const copiedMsg =
    currentLang === "ar" ? "تم نسخ الرابط ✅" :
    currentLang === "fr" ? "Lien copié ✅" :
    currentLang === "es" ? "Enlace copiado ✅" :
    "Link copied ✅";

  try {
    await navigator.clipboard.writeText(link);
    alert(copiedMsg);
  } catch {
    const temp = document.createElement("input");
    temp.value = link;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    alert(copiedMsg);
  }
}

// ===== Languages =====

const langData = {
  ar: {
    topline: "🚚 توصيل سريع • 💵 دفع عند الاستلام • 🔒 آمن",
    search: "إبحث عن المنتج...",
    cart: "السلة",
    emptyCart: "السلة فاضية",
    confirmOrder: (id,total)=>`تم الطلب ✅ رقم الطلب: ${id} — المجموع: ${total}$`,
    addToCart: "أضف للسلة",
    removeItem: "حذف",
    copyLink: "نسخ الرابط",
    readMore: "اقرأ المزيد",
    cartTitle: "سلة VELORÉ",
    totalLabel: "المجموع:",
    checkout: {
      name: "الاسم",
      phone: "رقم الهاتف",
      address: "العنوان",
      email: "البريد الإلكتروني",
      payChoose: "طريقة الدفع",
      payCOD: "الدفع عند الاستلام",
      confirm: "تأكيد الطلب",
      note: "سيتم التواصل معكم عبر واتساب لتأكيد الطلب قبل التوصيل (تفقد بريدك الإلكتروني أيضاً)."
    },
    cats: {
      all: "الكل",
      "Fashion": "أزياء",
      "Home & Kitchen": "البيت والمطبخ",
      "Electronics": "كهربائيات",
      "Toys": "الألعاب",
      "Beauty": "جمال"
    }
  },

  en: {
    topline: "🚚 Fast delivery • 💵 Cash on delivery • 🔒 Secure",
    search: "Search...",
    cart: "Cart",
    emptyCart: "Cart is empty",
    confirmOrder: (id,total)=>`Order placed ✅ ID: ${id} — Total: ${total}$`,
    addToCart: "Add to cart",
    removeItem: "Remove",
    copyLink: "Copy link",
    readMore: "Read more",
    cartTitle: "VELORÉ Cart",
    totalLabel: "Total:",
    checkout: {
      name: "Name",
      phone: "Phone",
      address: "Address",
      email: "Email",
      payChoose: "Payment method",
      payCOD: "Cash on delivery",
      confirm: "Confirm order",
      note: "We will contact you on WhatsApp to confirm your order before delivery (also check your email)."
    },
    cats: {
      all: "All",
      "Fashion": "Fashion",
      "Home & Kitchen": "Home & Kitchen",
      "Electronics": "Electronics",
      "Toys": "Toys",
      "Beauty": "Beauty"
    }
  },

  fr: {
    topline: "🚚 Livraison rapide • 💵 Paiement à la livraison • 🔒 Sécurisé",
    search: "Rechercher...",
    cart: "Panier",
    emptyCart: "Panier vide",
    confirmOrder: (id,total)=>`Commande ✅ N°: ${id} — Total: ${total}$`,
    addToCart: "Ajouter",
    removeItem: "Supprimer",
    copyLink: "Copier lien",
    readMore: "Lire plus",
    cartTitle: "Panier VELORÉ",
    totalLabel: "Total:",
    checkout: {
      name: "Nom",
      phone: "Téléphone",
      address: "Adresse",
      email: "E-mail",
      payChoose: "Mode de paiement",
      payCOD: "Paiement à la livraison",
      confirm: "Confirmer la commande",
      note: "Nous vous contacterons sur WhatsApp pour confirmer votre commande avant la livraison (vérifiez aussi votre e-mail)."
    },
    cats: {
      all: "Tous",
      "Fashion": "Mode",
      "Home & Kitchen": "Maison & Cuisine",
      "Electronics": "Électronique",
      "Toys": "Jouets",
      "Beauty": "Beauté"
    }
  },

  es: {
    topline: "🚚 Entrega rápida • 💵 Pago contra entrega • 🔒 Seguro",
    search: "Buscar...",
    cart: "Carrito",
    emptyCart: "Carrito vacío",
    confirmOrder: (id,total)=>`Pedido ✅ ID: ${id} — Total: ${total}$`,
    addToCart: "Añadir",
    removeItem: "Quitar",
    copyLink: "Copiar enlace",
    readMore: "Leer más",
    cartTitle: "Carrito VELORÉ",
    totalLabel: "Total:",
    checkout: {
      name: "Nombre",
      phone: "Teléfono",
      address: "Dirección",
      email: "Correo",
      payChoose: "Método de pago",
      payCOD: "Pago contra entrega",
      confirm: "Confirmar pedido",
      note: "Nos pondremos en contacto contigo por WhatsApp para confirmar tu pedido antes de la entrega (revisa también tu correo electrónico)."
    },
    cats: {
      all: "Todo",
      "Fashion": "Moda",
      "Home & Kitchen": "Hogar y Cocina",
      "Electronics": "Electrónica",
      "Toys": "Juguetes",
      "Beauty": "Belleza"
    }
  }
};

let currentLang = localStorage.getItem("lang") || "ar";

function applyLanguage(lang){
  currentLang = lang;
  localStorage.setItem("lang", lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";

  const toplineEl = document.getElementById("topline");
  if (toplineEl) toplineEl.textContent = langData[lang].topline;

  if (search) search.placeholder = langData[lang].search;

  const cartLabel = document.getElementById("cartLabel");
  if (cartLabel) cartLabel.textContent = langData[lang].cart;

  const cartModalTitle = document.getElementById("cartModalTitle");
  if (cartModalTitle) cartModalTitle.textContent = langData[lang].cartTitle;

  const totalLabel = document.getElementById("totalLabel");
  if (totalLabel) totalLabel.textContent = langData[lang].totalLabel;

  const t = langData[lang].checkout || {};

  const fieldName = document.getElementById("fieldName");
  const fieldPhone = document.getElementById("fieldPhone");
  const fieldAddress = document.getElementById("fieldAddress");
  const fieldEmail = document.getElementById("fieldEmail");
  const payChoose = document.getElementById("payChoose");
  const payCOD = document.getElementById("payCOD");
  const btnConfirm = document.getElementById("btnConfirm");
  const noteConfirm = document.getElementById("noteConfirm");

  if (fieldName) fieldName.placeholder = t.name || "";
  if (fieldPhone) fieldPhone.placeholder = t.phone || "";
  if (fieldAddress) fieldAddress.placeholder = t.address || "";
  if (fieldEmail) fieldEmail.placeholder = t.email || "";
  if (payChoose) payChoose.textContent = t.payChoose || "";
  if (payCOD) payCOD.textContent = t.payCOD || "";
  if (btnConfirm) btnConfirm.textContent = t.confirm || "";
  if (noteConfirm) noteConfirm.textContent = t.note || "";

  renderCats();
  renderGrid();
  renderCart();
}

// ===== Menu =====

const moreBtn = document.getElementById("moreBtn");
const moreDropdown = document.getElementById("moreDropdown");

if (moreBtn && moreDropdown) {
  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moreDropdown.hidden = !moreDropdown.hidden;
  });

  document.addEventListener("click", () => {
    moreDropdown.hidden = true;
  });

  moreDropdown.addEventListener("click", (e) => {
    e.stopPropagation();

    const btn = e.target.closest("[data-lang]");
    if (btn) {
      applyLanguage(btn.getAttribute("data-lang"));
      moreDropdown.hidden = true;
    }
  });
}

// ===== Categories =====

function renderCats(){
  if (!catsEl) return;

  catsEl.innerHTML = "";

  cats.forEach(c => {
    const key = c.value === null ? "all" : c.value;
    const label = langData[currentLang].cats[key] || key;

    const b = document.createElement("button");
    b.textContent = label;

    b.onclick = () => {
      selectedCategory = c.value;
      loadProducts(selectedCategory, search.value.trim());
    };

    catsEl.appendChild(b);
  });
}

// ===== Products =====

async function loadProducts(category = null, q = null){
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (q) qs.set("q", q);

  const url = "/api/products" + (qs.toString() ? "?" + qs.toString() : "");

  const res = await fetch(url);
  PRODUCTS = await res.json();

  renderGrid();
}

function renderGrid(){
  if (!grid) return;

  grid.innerHTML = "";

  PRODUCTS.forEach(p => {
    const title = getTranslatedTitle(p);
    const desc = getTranslatedDescription(p).trim();
    const catLabel = langData[currentLang].cats[p.category] || p.category;
    const link = `/product/${p.id}`;
    const hasDescription = desc.length > 0;
    const shouldClamp = isLongDescription(desc);

    const descriptionHtml = hasDescription ? `
      <div style="
        font-size:13px;
        opacity:.75;
        ${shouldClamp ? "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;" : ""}
      ">
        ${desc}
      </div>
    ` : "";

    const readMoreHtml = (hasDescription && shouldClamp) ? `
      <a href="${link}" style="font-size:12px;color:#c6a14a;text-decoration:none;">
        ${langData[currentLang].readMore}
      </a>
    ` : "";

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <a href="${link}">
        <img src="${p.image}" alt="${title}">
      </a>

      <div class="p">
        <b>
          <a href="${link}" style="text-decoration:none;color:inherit">
            ${title}
          </a>
        </b>

        <div style="opacity:.8">${catLabel}</div>

        ${descriptionHtml}

        ${readMoreHtml}

        <div class="price">${money(p.price)}$</div>

        <div style="font-size:12px;margin-top:6px">
          🔗 ${link}
        </div>

        <button data-copy="${p.id}">
          ${langData[currentLang].copyLink}
        </button>
      </div>

      <button data-add="${p.id}">
        ${langData[currentLang].addToCart}
      </button>
    `;

    const addBtn = card.querySelector("[data-add]");
    const copyBtn = card.querySelector("[data-copy]");

    if (addBtn) {
      addBtn.onclick = () => addToCart(p.id);
    }

    if (copyBtn) {
      copyBtn.onclick = (e) => {
        e.preventDefault();
        copyProductLink(p.id);
      };
    }

    grid.appendChild(card);
  });
}

// ===== Cart =====

function addToCart(id){
  const it = cart.find(x => x.product_id === id);

  if (it) it.qty++;
  else cart.push({ product_id: id, qty: 1 });

  updateCartUI();
}

function removeFromCart(id){
  cart = cart.filter(x => x.product_id !== id);
  renderCart();
  updateCartUI();
}

function updateCartUI(){
  if (!cartCount) return;
  cartCount.textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function openCart(){
  renderCart();
  if (cartModal) cartModal.showModal();
}

function closeCart(){
  if (cartModal) cartModal.close();
}

function renderCart(){
  if (!cartItems) return;

  cartItems.innerHTML = "";
  let total = 0;

  cart.forEach(it => {
    const p = PRODUCTS.find(x => x.id === it.product_id);
    if (!p) return;

    total += p.price * it.qty;

    const title = getTranslatedTitle(p);

    const row = document.createElement("div");
    row.className = "row";

    row.innerHTML = `
      <div>
        <b>${title}</b>
        <div>${money(p.price)}$</div>
      </div>

      <div style="display:flex;gap:8px">
        <button>-</button>
        <b>${it.qty}</b>
        <button>+</button>
        <button class="remove-btn">🗑</button>
      </div>
    `;

    row.children[1].children[0].onclick = () => {
      it.qty--;
      if (it.qty < 1) it.qty = 1;
      renderCart();
      updateCartUI();
    };

    row.children[1].children[2].onclick = () => {
      it.qty++;
      renderCart();
      updateCartUI();
    };

    row.children[1].children[3].onclick = () => removeFromCart(it.product_id);

    cartItems.appendChild(row);
  });

  if (totalEl) totalEl.textContent = money(total);
}

document.getElementById("goCart").onclick = openCart;
document.getElementById("closeCart").onclick = closeCart;

// ===== Search =====

search.addEventListener("input", () => {
  loadProducts(selectedCategory, search.value.trim());
});

// ===== Checkout =====

document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    alert(currentLang === "ar" ? "السلة فاضية" : "Cart empty");
    return;
  }

  const fd = new FormData(e.target);

  const payload = {
    name: fd.get("name"),
    phone: fd.get("phone"),
    address: fd.get("address"),
    email: fd.get("email"),
    payment_method: fd.get("payment"),
    items: cart.map(x => ({ product_id: x.product_id, qty: x.qty }))
  };

  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Error");
    return;
  }

  cart = [];
  updateCartUI();
  closeCart();

  alert(
    currentLang === "ar"
      ? `تم الطلب ✅ رقم الطلب: ${data.order_id}`
      : `Order placed #${data.order_id}`
  );
});

// ===== Banners =====

async function loadBanners(){
  try {
    const res = await fetch("/api/banners");
    const banners = await res.json();

    if (!banners.length) {
      if (hero) hero.style.display = "none";
      return;
    }

    if (slider) slider.innerHTML = "";
    if (dotsContainer) dotsContainer.innerHTML = "";

    banners.forEach((file, i) => {
      const img = document.createElement("img");
      img.src = "/image/" + file;
      img.className = "slide";
      if (i === 0) img.classList.add("active");

      slider.appendChild(img);
    });
  } catch {
    if (hero) hero.style.display = "none";
  }
}

// ===== Init =====

applyLanguage(currentLang);
renderCats();
loadProducts();
loadBanners();