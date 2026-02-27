let PRODUCTS = [];
let cart = []; // {product_id, qty}

let selectedCategory = null; // ✅ نخلي البحث يشتغل ضمن نفس التصنيف

const cats = [
  { label: "All الكل", value: null },
  { label: "Fashion أزياء", value: "Fashion" },
  { label: "Home & Kitchen البيت & المطبخ", value: "Home & Kitchen" },
  { label: "Electronics كهربائيات", value: "Electronics" },
  { label: "Toys الألعاب", value: "Toys" },
  { label: "Beauty جمال", value: "Beauty" }
];

const grid = document.getElementById("grid");
const catsEl = document.getElementById("cats");
const cartModal = document.getElementById("cartModal");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const totalEl = document.getElementById("total");
const search = document.getElementById("search");

// Slider elements
const hero = document.getElementById("hero");
const slider = document.getElementById("slider");
const dotsContainer = document.getElementById("dots");

function money(n){ return (Math.round(n*100)/100).toFixed(2); }

// --------------------
// Categories
// --------------------
function renderCats(){
  catsEl.innerHTML = "";
  cats.forEach(c=>{
    const b=document.createElement("button");
    b.textContent=c.label;

    b.onclick=()=>{
      selectedCategory = c.value;                 // ✅ حفظنا التصنيف
      loadProducts(selectedCategory, search.value.trim() || null);
    };

    catsEl.appendChild(b);
  });
}

// --------------------
// Products
// --------------------
async function loadProducts(category=null,q=null){
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (q) qs.set("q", q);

  const url = "/api/products" + (qs.toString() ? ("?" + qs.toString()) : "");
  const res = await fetch(url);

  PRODUCTS = await res.json();
  renderGrid();
}

function renderGrid(){
  grid.innerHTML = "";
  PRODUCTS.forEach(p=>{
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.title}"/>
      <div class="p">
        <b>${p.title}</b>
        <div style="opacity:.85">${p.category}</div>
        <div class="price">${money(p.price)}$</div>
      </div>
      <button>أضف للسلة</button>
    `;
    card.querySelector("button").onclick=()=>addToCart(p.id);
    grid.appendChild(card);
  });
}

// --------------------
// Cart
// --------------------
function addToCart(id){
  const it = cart.find(x=>x.product_id===id);
  if (it) it.qty += 1;
  else cart.push({product_id:id, qty:1});
  updateCartUI();
}

function updateCartUI(){
  cartCount.textContent = cart.reduce((a,b)=>a+b.qty,0);
}

function openCart(){
  renderCart();
  cartModal.showModal();
}

function closeCart(){ cartModal.close(); }

function renderCart(){
  cartItems.innerHTML="";
  let total=0;

  for (const it of cart){
    const p = PRODUCTS.find(x=>x.id===it.product_id) || null;
    if (!p) continue;

    total += p.price * it.qty;

    const row=document.createElement("div");
    row.className="row";
    row.innerHTML = `
      <div>
        <b>${p.title}</b><div style="opacity:.85">${money(p.price)}$</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button data-a="minus">-</button>
        <b>${it.qty}</b>
        <button data-a="plus">+</button>
      </div>
    `;
    row.querySelector('[data-a="minus"]').onclick=()=>{ it.qty=Math.max(1,it.qty-1); renderCart(); updateCartUI(); };
    row.querySelector('[data-a="plus"]').onclick=()=>{ it.qty=Math.min(99,it.qty+1); renderCart(); updateCartUI(); };
    cartItems.appendChild(row);
  }

  totalEl.textContent = money(total);
}

document.getElementById("goCart").onclick=openCart;
document.getElementById("closeCart").onclick=closeCart;

// ✅ البحث ضمن نفس التصنيف
search.addEventListener("input", ()=>{
  const q = search.value.trim();
  loadProducts(selectedCategory, q.length ? q : null);
});

document.getElementById("checkout").addEventListener("submit", async (e)=>{
  e.preventDefault();
  if (cart.length===0) return alert("السلة فاضية");

  const fd = new FormData(e.target);
  const payload = {
    name: fd.get("name"),
    phone: fd.get("phone"),
    address: fd.get("address"),
    payment_method: fd.get("payment"),
    items: cart.map(x=>({product_id:x.product_id, qty:x.qty}))
  };

  const res = await fetch("/api/orders", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error || "في مشكلة");

  cart = [];
  updateCartUI();
  closeCart();
  alert(`تم الطلب ✅ رقم الطلب: ${data.order_id} — المجموع: ${money(data.total)}$`);
});

// --------------------
// Auto Banner Slider
// --------------------
let bannerTimer = null;
let currentSlide = 0;

function goToSlide(index, slides, dots){
  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");

  currentSlide = index;

  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
}

function startAuto(slides, dots){
  if (bannerTimer) clearInterval(bannerTimer);

  bannerTimer = setInterval(() => {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next, slides, dots);
  }, 4000);
}

async function loadBanners(){
  try {
    const res = await fetch("/api/banners");
    const banners = await res.json();

    // إذا ما في بانرات
    if (!Array.isArray(banners) || banners.length === 0){
      hero.style.display = "none";
      return;
    }

    hero.style.display = "block";
    slider.innerHTML = "";
    dotsContainer.innerHTML = "";
    currentSlide = 0;

    banners.forEach((file, index) => {
      const img = document.createElement("img");
      img.src = "/image/" + file;
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

    // لو بانر واحد فقط
    if (slides.length <= 1){
      return;
    }

    startAuto(slides, dots);
  } catch {
    hero.style.display = "none";
  }
}

// --------------------
// Init
// --------------------
renderCats();
loadProducts();
loadBanners();

