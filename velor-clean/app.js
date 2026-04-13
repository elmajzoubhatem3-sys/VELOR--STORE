let PRODUCTS = [
  {
    id: 1,
    title: "Velore Classic Heels",
    price: 39.99,
    category: "Fashion",
    image: "/image/shoes.jpg"
  },
  {
    id: 2,
    title: "Velore Home Pot",
    price: 25.0,
    category: "Home & Kitchen",
    image: "/image/pot.jpg"
  },
  {
    id: 3,
    title: "Kids Fashion Set",
    price: 19.99,
    category: "Fashion",
    image: "/image/kids.jpg"
  }
];

let cart = [];
let selectedCategory = null;

const cats = [
  { label: "الكل All", value: null },
  { label: "Fashion أزياء", value: "Fashion" },
  { label: "Home & Kitchen البيت & المطبخ", value: "Home & Kitchen" },
  { label: "Electronics كهربائيات", value: "Electronics" },
  { label: "Toys الألعاب", value: "Toys" },
  { label: "Beauty جمال", value: "Beauty" }
];

const BANNERS = [
  "/image/banner.jpg"
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

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function renderCats() {
  catsEl.innerHTML = "";
  cats.forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c.label;
    b.onclick = () => {
      selectedCategory = c.value;
      renderGrid();
    };
    catsEl.appendChild(b);
  });
}

function getFilteredProducts() {
  const q = (search?.value || "").trim().toLowerCase();

  return PRODUCTS.filter((p) => {
    const categoryOk = !selectedCategory || p.category === selectedCategory;
    const searchOk = !q || p.title.toLowerCase().includes(q);
    return categoryOk && searchOk;
  });
}

function renderGrid() {
  const filtered = getFilteredProducts();
  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML = `<div class="panel">لا توجد منتجات مطابقة.</div>`;
    return;
  }

  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}"/>
      <div class="p">
        <b>${p.title}</b>
        <div style="opacity:.75">${p.category}</div>
        <div class="price">${money(p.price)}$</div>
      </div>
      <button>أضف للسلة</button>
    `;

    card.querySelector("button").onclick = () => addToCart(p.id);
    card.querySelector("img").onclick = () => {
      window.location.href = \`/product/\${p.id}\`;
    };

    grid.appendChild(card);
  });
}

function addToCart(id) {
  const it = cart.find((x) => x.product_id === id);
  if (it) it.qty += 1;
  else cart.push({ product_id: id, qty: 1 });
  updateCartUI();
}

function updateCartUI() {
  cartCount.textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function openCart() {
  renderCart();
  cartModal.showModal();
}

function closeCart() {
  cartModal.close();
}

function renderCart() {
  cartItems.innerHTML = "";
  let total = 0;

  for (const it of cart) {
    const p = PRODUCTS.find((x) => x.id === it.product_id) || null;
    if (!p) continue;

    total += p.price * it.qty;

    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div>
        <b>${p.title}</b>
        <div style="opacity:.75">${money(p.price)}$</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button data-a="minus">-</button>
        <b>${it.qty}</b>
        <button data-a="plus">+</button>
      </div>
    `;

    row.querySelector('[data-a="minus"]').onclick = () => {
      it.qty = Math.max(1, it.qty - 1);
      renderCart();
      updateCartUI();
    };

    row.querySelector('[data-a="plus"]').onclick = () => {
      it.qty = Math.min(99, it.qty + 1);
      renderCart();
      updateCartUI();
    };

    cartItems.appendChild(row);
  }

  totalEl.textContent = money(total);
}

document.getElementById("goCart").onclick = openCart;
document.getElementById("closeCart").onclick = closeCart;

search.addEventListener("input", () => {
  renderGrid();
});

document.getElementById("checkout").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (cart.length === 0) {
    alert("السلة فاضية");
    return;
  }

  alert("تم استلام الطلب كتجربة ✅");

  cart = [];
  updateCartUI();
  closeCart();
});

let bannerTimer = null;
let currentSlide = 0;

function goToSlide(index, slides, dots) {
  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");

  currentSlide = index;

  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
}

function startAuto(slides, dots) {
  if (bannerTimer) clearInterval(bannerTimer);

  bannerTimer = setInterval(() => {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next, slides, dots);
  }, 4000);
}

function loadBanners() {
  if (!BANNERS.length) {
    hero.style.display = "none";
    return;
  }

  hero.style.display = "block";
  slider.innerHTML = "";
  dotsContainer.innerHTML = "";
  currentSlide = 0;

  BANNERS.forEach((file, index) => {
    const img = document.createElement("img");
    img.src = file;
    img.className = "slide";
    if (index === 0) img.classList.add("active");
    slider.appendChild(img);

    const dot = document.createElement("div");
    dot.className = "dot";
    if (index === 0) dot.classList.add("active");
    dot.onclick = () => {
      const slides = document.querySelectorAll(".slide");
      const dots = document.querySelectorAll(".dot");
      goToSlide(index, slides, dots);
      startAuto(slides, dots);
    };
    dotsContainer.appendChild(dot);
  });

  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");

  if (slides.length <= 1) return;

  startAuto(slides, dots);
}

renderCats();
renderGrid();
loadBanners();