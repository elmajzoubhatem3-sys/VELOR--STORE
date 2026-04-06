const rowsEl = document.getElementById("rows");
const msgEl = document.getElementById("msg");
const reloadBtn = document.getElementById("reload");

// 🔊 صوت الإشعار
const audio = new Audio("/sounds/new_order.mp3");
audio.preload = "auto";

// تفعيل الصوت بعد أول تفاعل (حل مشكلة المتصفح)
document.addEventListener("click", () => {
  audio.play().then(()=>{
    audio.pause();
    audio.currentTime = 0;
  }).catch(()=>{});
}, { once: true });

// حفظ آخر أوردر
let lastSeenMaxId = Number(localStorage.getItem("last_seen_order_id") || 0);

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return []; }
}

function getMaxId(orders) {
  let max = 0;
  for (const o of orders) {
    const id = Number(o.id || 0);
    if (id > max) max = id;
  }
  return max;
}

async function loadOrders() {

  const token = localStorage.getItem("admin_token") || "";
  if (!token) {
    msgEl.textContent = "";
    return;
  }

  msgEl.textContent = "جاري التحميل...";

  const res = await fetch("/api/admin/orders", {
    headers: { "Authorization": `Bearer ${token}` }
  });

  const data = await res.json().catch(()=>[]);
  if (!res.ok) {
    msgEl.textContent = "❌ ما قدرنا نجيب الطلبات";
    return;
  }

  msgEl.textContent = `✅ عدد الطلبات: ${data.length}`;

  // 🔊 تشغيل الصوت فقط عند أوردر جديد
  const maxIdNow = getMaxId(data);

  if (lastSeenMaxId === 0 && maxIdNow > 0) {
    lastSeenMaxId = maxIdNow;
    localStorage.setItem("last_seen_order_id", String(lastSeenMaxId));
  } 
  else if (maxIdNow > lastSeenMaxId) {
    lastSeenMaxId = maxIdNow;
    localStorage.setItem("last_seen_order_id", String(lastSeenMaxId));

    audio.currentTime = 0;
    audio.play().catch(()=>{});
  }

  rowsEl.innerHTML = data.map(o => {

    const items = safeJsonParse(o.items_json);
    const itemsText = items.map(x => `${x.title} x${x.qty}`).join("<br>");

    const status = (o.status || "pending");

    const statusBadge =
      status === "Cancelled"
        ? `<span style="color:#ff4d4d;font-weight:900">ملغي</span>`
        : `<span style="color:#22c55e;font-weight:900">جديد</span>`;

    const emailHtml = o.email
      ? `<a href="mailto:${o.email}" class="muted">${o.email}</a>`
      : `<span class="muted">-</span>`;

    return `
      <tr>
        <td>${o.id}</td>

        <td>
          <b>${o.name}</b><br>
          <span class="muted">📞 ${o.phone || "-"}</span><br>
          <span class="muted">✉️ ${emailHtml}</span><br>
          <span class="muted">📍 ${o.address || "-"}</span>
        </td>

        <td class="muted">${itemsText || "-"}</td>

        <td>
          <b>${o.total}$</b><br>
          <span class="muted">${o.payment_method}</span><br>
          ${statusBadge}
        </td>

        <td class="muted">${o.created_at || "-"}</td>

        <td>
          <button onclick="deleteOrder(${o.id})">حذف</button>
          أو
          <button onclick="cancelOrder(${o.id})">إلغاء</button>
        </td>
      </tr>
    `;
  }).join("");
}

// 🔁 تحديث كل 10 ثواني
setInterval(loadOrders, 10000);

if (reloadBtn) reloadBtn.onclick = loadOrders;


// حذف جميع الطلبات
async function deleteAllOrders() {

  if (!confirm("هل أنت متأكد من حذف جميع الطلبات؟")) return;

  const token = localStorage.getItem("admin_token") || "";

  const res = await fetch(`/api/admin/orders`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const data = await res.json().catch(()=>({}));

  if (!res.ok) {
    alert(data.error || "فشل الحذف");
    return;
  }

  alert("تم حذف جميع الطلبات ✅");

  lastSeenMaxId = 0;
  localStorage.setItem("last_seen_order_id","0");

  loadOrders();
}

const deleteAllBtn = document.getElementById("deleteAll");
if (deleteAllBtn) deleteAllBtn.onclick = deleteAllOrders;


// حذف طلب واحد
async function deleteOrder(id) {

  if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;

  const token = localStorage.getItem("admin_token") || "";

  const res = await fetch(`/api/admin/orders/${id}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const data = await res.json().catch(()=>({}));

  if (!res.ok) {
    alert(data.error || "فشل الحذف");
    return;
  }

  alert("تم الحذف ✅");

  loadOrders();
}


// إلغاء طلب
async function cancelOrder(id) {

  if (!confirm("هل أنت متأكد من إلغاء الطلب؟")) return;

  const token = localStorage.getItem("admin_token") || "";

  const res = await fetch(`/api/admin/orders/${id}`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${token}` }
  });

  const data = await res.json().catch(()=>({}));

  if (!res.ok) {
    alert(data.error || "فشل الإلغاء");
    return;
  }

  alert("تم إلغاء الطلب ✅");

  loadOrders();
}


// مهم للـ onclick
window.deleteOrder = deleteOrder;
window.cancelOrder = cancelOrder;

// أول تحميل
loadOrders();