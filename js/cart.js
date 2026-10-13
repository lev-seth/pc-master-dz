/* Cart page */
/* كل الكود داخل دالة init حتى لا تعمل الصفحة قبل تحميل المكتبات */
function initCartPage() {
  "use strict";

  const S = window.Store;
  if (!S) return;

  const WILAYA_KEY = "pcmdz.wilaya";
  const NBSP = "\u00A0";

  const itemsEl = document.getElementById("cart-items");
  const emptyEl = document.getElementById("cart-empty");
  const layoutEl = document.getElementById("cart-layout");
  const summaryEl = document.getElementById("cart-summary");
  const wilayaEl = document.getElementById("wilaya");
  const labelEl = document.querySelector("[data-cart-label]");

  /* wilaya dropdown */
  S.WILAYAS.forEach(([code, name]) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} — ${name}`;
    wilayaEl.appendChild(opt);
  });
  const savedWilaya = localStorage.getItem(WILAYA_KEY) || "";
  if (savedWilaya) wilayaEl.value = savedWilaya;

  function wilayaName(code) {
    const w = S.WILAYAS.find((x) => x[0] === code);
    return w ? w[1] : "";
  }

  function shippingInfo() {
    const code = wilayaEl.value;
    const sub = S.subtotal();
    if (!code) return { label: "اختر الولاية", value: null, free: false };
    if (sub >= S.SHIPPING.freeOver)
      return { label: "مجاني (توصيل مجاني)", value: 0, free: true };
    const cost = S.shippingFor(code);
    return { label: S.formatPrice(cost) + NBSP + "دج", value: cost, free: false };
  }

  function updateSummary() {
    const sub = S.subtotal();
    const count = S.cartCount();
    const ship = shippingInfo();

    document.querySelector("[data-subtotal]").innerHTML = S.priceHTML(sub);
    document.querySelector("[data-count]").textContent = count;
    document.querySelector("[data-shipping]").innerHTML = ship.value === null
      ? `<span class="muted">—</span>`
      : ship.free
      ? `<span style="color:var(--success)">مجاني</span>`
      : S.priceHTML(ship.value);
    const total = sub + (ship.value || 0);
    document.querySelector("[data-total]").innerHTML = S.priceHTML(total);

    if (labelEl) labelEl.textContent = count ? `(${count} قطعة)` : "";
    const goBtn = document.getElementById("go-checkout");
    if (goBtn) goBtn.style.display = count ? "" : "none";

    return { sub, count, ship, total };
  }

  function lineHTML(line) {
    const p = line.product;
    const lineTotal = S.effectivePrice(p) * line.qty;
    return `
      <div class="cart-item" data-line="${S.esc(p.id)}">
        <a class="cart-thumb" href="product.html?id=${encodeURIComponent(p.id)}">
          ${
            S.productImage(p)
              ? `<img src="${S.esc(S.productImage(p))}" alt="${S.esc(p.name)}" loading="lazy">`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/></svg>`
          }
        </a>
        <div>
          <span class="card-cat">${S.esc(S.categoryAr(p.category))} · ${S.esc(S.brandName(p.brand))}</span>
          <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${S.esc(p.name)}</a></h3>
          <span class="ci-cat">${S.priceHTML(S.effectivePrice(p))} / قطعة</span>
          <div class="ci-controls">
            <div class="qty">
              <button type="button" data-minus aria-label="تقليل">−</button>
              <input type="text" inputmode="numeric" value="${line.qty}" data-qty aria-label="الكمية">
              <button type="button" data-plus aria-label="زيادة">+</button>
            </div>
            <button type="button" class="remove-btn" data-remove>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/></svg>
              حذف
            </button>
          </div>
        </div>
        <div class="ci-total">
          <span class="price">${S.priceHTML(lineTotal)}</span>
          <span class="small muted">${line.qty} × ${S.formatPrice(S.effectivePrice(p))} دج</span>
        </div>
      </div>`;
  }

  function render() {
    const lines = S.cartLines();
    const isEmpty = lines.length === 0;

    emptyEl.classList.toggle("hidden", !isEmpty);
    itemsEl.classList.toggle("hidden", isEmpty);
    if (summaryEl) summaryEl.style.display = isEmpty ? "none" : "";
    if (isEmpty) {
      itemsEl.innerHTML = "";
      if (labelEl) labelEl.textContent = "";
      return;
    }

    itemsEl.innerHTML = lines.map(lineHTML).join("");
    updateSummary();

    itemsEl.querySelectorAll("[data-line]").forEach((row) => {
      const id = row.getAttribute("data-line");
      const input = row.querySelector("[data-qty]");

      row.querySelector("[data-minus]").addEventListener("click", () => {
        const next = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
        S.setQty(id, next);
        render();
      });

      row.querySelector("[data-plus]").addEventListener("click", () => {
        const next = (parseInt(input.value, 10) || 1) + 1;
        S.setQty(id, next);
        const line = S.cartLines().find((l) => l.id === id);
        if (line && line.qty !== next) {
          S.toast("لا يمكن تجاوز الكمية المتوفرة في المخزون", "error");
        }
        render();
      });

      input.addEventListener("change", () => {
        S.setQty(id, parseInt(input.value, 10) || 1);
        render();
      });

      row.querySelector("[data-remove]").addEventListener("click", () => {
        const p = S.byId(id);
        S.removeFromCart(id);
        S.toast(`تم حذف "${p ? p.name : ""}" من السلة`);
        render();
      });
    });
  }

  wilayaEl.addEventListener("change", () => {
    localStorage.setItem(WILAYA_KEY, wilayaEl.value);
    updateSummary();
  });

  const clearBtn = document.getElementById("clear-cart");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!S.cartCount()) return;
      if (confirm("هل تريد إفراغ سلة التسوق بالكامل؟")) {
        S.clearCart();
        S.toast("تم إفراغ السلة");
        render();
      }
    });
  }

  const checkoutBtn = document.getElementById("go-checkout");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", (e) => {
      if (!S.cartCount()) {
        e.preventDefault();
        S.toast("سلتك فارغة", "error");
      }
    });
  }

  render();
}

/* لا نبدأ قبل تحميل المكتبات الأساسية (قد يُحمّل store.js بالتوازي مع هذا الملف) */
if (window.Store) {
  initCartPage();
} else {
  window.addEventListener("frontend:ready", initCartPage, { once: true });
}
