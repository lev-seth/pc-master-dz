/* Checkout page — إتمام الطلب (يتصل بـ API لإنشاء طلب حقيقي — يدعم الزوار) */
/* كل الكود داخل دالة init حتى لا تعمل الصفحة قبل تحميل المكتبات */
function initCheckoutPage() {
  "use strict";

  const S = window.Store;
  if (!S) return;

  const WILAYA_KEY = "pcmdz.wilaya";
  const CUSTOMER_KEY = "pcmdz.customer";
  const ORDER_KEY = "pcmdz.lastOrder";
  const root = document.getElementById("checkout-root");

  function wilayaName(code) {
    const w = S.WILAYAS.find((x) => x[0] === code);
    return w ? `${code} — ${w[1]}` : "";
  }

  /* ---------- empty cart guard ---------- */
  if (!S.cartCount()) {
    root.innerHTML = `
      <div class="empty-state" style="margin-block:1rem 3rem">
        <h3>لا يمكن إتمام الطلب</h3>
        <p>سلة التسوق فارغة. أضف بعض المنتجات أولاً ثم عد لإتمام الطلب.</p>
        <a class="btn btn-primary" href="index.html">تصفّح المنتجات</a>
      </div>`;
    return;
  }

  /* ---------- wilaya dropdown ---------- */
  const wilayaEl = document.getElementById("wilaya");
  S.WILAYAS.forEach(([code, name]) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${code} — ${name}`;
    wilayaEl.appendChild(opt);
  });

  /* ---------- restore saved customer ---------- */
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}") || {};
  } catch (e) {
    saved = {};
  }
  if (saved.name) document.getElementById("fullname").value = saved.name;
  if (saved.phone) document.getElementById("phone").value = saved.phone;
  if (saved.commune) document.getElementById("commune").value = saved.commune;
  if (saved.address) document.getElementById("address").value = saved.address;
  if (saved.wilaya) wilayaEl.value = saved.wilaya;
  else if (localStorage.getItem(WILAYA_KEY)) wilayaEl.value = localStorage.getItem(WILAYA_KEY);

  /* ---------- order summary ---------- */
  /* حساب رسوم التوصيل عند اختيار الولاية (يُستدعى في كل تغيير ولية):
     - مجاني إذا تجاوز المجموع الفرعي 150,000 دج (SHIPPING.freeOver)
     - 400 دج لولايات الشمال (01–48)
     - 800 دج لولايات الجنوب (49–69) */
  function shippingValue() {
    const code = wilayaEl.value;
    const sub = S.subtotal();
    if (!code) return { value: null };
    if (sub >= S.SHIPPING.freeOver) return { value: 0, free: true };
    return { value: S.shippingFor(code) };
  }

  function renderSummary() {
    const lines = S.cartLines();
    const list = document.getElementById("order-list");
    list.innerHTML = lines
      .map((l) => {
        const p = l.product;
        const img = S.productImage(p);
        return `
          <li>
            <span class="ol-thumb">${
              img
                ? `<img src="${S.esc(img)}" alt="${S.esc(p.name)}" loading="lazy">`
                : S.I.box
            }</span>
            <span class="ol-name">${S.esc(p.name)}<br><span class="ol-qty">${l.qty} × ${S.formatPrice(
          S.effectivePrice(p)
        )} دج</span></span>
            <span class="ol-price">${S.formatPrice(S.effectivePrice(p) * l.qty)} دج</span>
          </li>`;
      })
      .join("");

    const sub = S.subtotal();
    const ship = shippingValue();
    document.querySelector("[data-subtotal]").innerHTML = S.priceHTML(sub);
    document.querySelector("[data-shipping]").innerHTML =
      ship.value === null
        ? `<span class="muted">اختر الولاية</span>`
        : ship.free
        ? `<span style="color:var(--success)">مجاني</span>`
        : S.priceHTML(ship.value);
    document.querySelector("[data-total]").innerHTML = S.priceHTML(
      sub + (ship.value || 0)
    );
  }

  wilayaEl.addEventListener("change", () => {
    localStorage.setItem(WILAYA_KEY, wilayaEl.value);
    renderSummary();
  });
  renderSummary();

  /* ---------- payment option styling ---------- */
  document.querySelectorAll(".pay-option input").forEach((input) => {
    input.addEventListener("change", () => {
      document.querySelectorAll(".pay-option").forEach((o) => {
        o.classList.toggle("selected", o.querySelector("input").checked);
      });
    });
  });

  /* ---------- validation ---------- */
  function setInvalid(name, invalid) {
    const f = document.querySelector(`[data-field="${name}"]`);
    if (f) f.classList.toggle("invalid", invalid);
    return !invalid;
  }

  function validate() {
    const name = document.getElementById("fullname").value.trim();
    const phone = document.getElementById("phone").value.replace(/[\s-]/g, "");
    const wilaya = wilayaEl.value;
    const address = document.getElementById("address").value.trim();

    const okName = setInvalid("name", name.length < 3);
    const okPhone = setInvalid("phone", !/^(?:0|\+213|00213)?[5-7]\d{8}$/.test(phone));
    const okWilaya = setInvalid("wilaya", !wilaya);
    const okAddress = setInvalid("address", address.length < 10);

    return { ok: okName && okPhone && okWilaya && okAddress, name, phone, wilaya, address };
  }

  ["fullname", "phone", "address"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      const f = el.closest(".field");
      if (f) f.classList.remove("invalid");
    });
  });
  wilayaEl.addEventListener("change", () => {
    const f = wilayaEl.closest(".field");
    if (f) f.classList.remove("invalid");
  });

  /* ---------- إرسال الطلب إلى الـ API (guest checkout) ---------- */
  const API_ORDERS = "https://pc-master-dz.onrender.com/api/orders"; /* عنوان خدمة الطلبات */

  /* زر الإرسال لعرض حالة التحميل واستعادته بعد الخطأ */
  const submitBtn = document.querySelector('#checkout-form button[type="submit"]');
  const submitBtnHTML = submitBtn ? submitBtn.innerHTML : "";

  /* أنيميشن بسيطة لمؤشر التحميل (تُحقن مرة واحدة — بدون تعديل ملف CSS) */
  if (!document.getElementById("pcmdz-spinner-style")) {
    const st = document.createElement("style");
    st.id = "pcmdz-spinner-style";
    st.textContent =
      "@keyframes pcmdz-spin{to{transform:rotate(360deg)}}" +
      ".pcmdz-spin{display:inline-block;width:1em;height:1em;vertical-align:-.15em;" +
      "animation:pcmdz-spin .9s linear infinite}";
    document.head.appendChild(st);
  }
  const SPINNER =
    '<svg class="pcmdz-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.innerHTML = on
      ? `${SPINNER} جاري إرسال الطلب...`
      : submitBtnHTML;
  }

  document.getElementById("checkout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = validate();
    if (!v.ok) {
      S.toast("يرجى تصحيح الحقول المطلوبة", "error");
      const firstBad = document.querySelector(".field.invalid");
      if (firstBad) {
        firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = firstBad.querySelector("input, select, textarea");
        if (input) input.focus({ preventScroll: true });
      }
      return;
    }

    const lines = S.cartLines();
    if (!lines.length) {
      S.toast("سلة التسوق فارغة", "error");
      return;
    }

    const commune = document.getElementById("commune").value.trim();
    const notes = document.getElementById("notes").value.trim();

    /* بناء الحمولة بالصيغة التي يتوقعها الـ backend */
    const payload = {
      /* المعرّف: الـ _id من قاعدة البيانات إن وُجد، وإلا الـ slug المخزّن في السلة */
      items: lines.map((l) => ({
        product: (l.product && l.product._id) || l.id,
        quantity: l.qty,
      })),
      shippingAddress: {
        fullName: v.name,
        phone: v.phone,
        wilaya: v.wilaya,
        /* البلدية تُحفظ مع العنوان لأن حقل shippingAddress بالقاعدة يحوي العنوان فقط */
        address: [commune, v.address].filter(Boolean).join("، "),
        notes: notes,
      },
      /* معلومات الزائر (طلب بدون تسجيل دخول) */
      guestInfo: { fullName: v.name, phone: v.phone },
      paymentMethod: "cod", /* الدفع عند الاستلام */
    };

    /* حفظ معلومات العميل لاستعادتها في الزيارة القادمة */
    localStorage.setItem(
      CUSTOMER_KEY,
      JSON.stringify({
        name: v.name,
        phone: v.phone,
        wilaya: v.wilaya,
        wilayaName: wilayaName(v.wilaya),
        commune: commune,
        address: v.address,
        notes: notes,
      })
    );

    setLoading(true);

    try {
      const res = await fetch(API_ORDERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let result = null;
      try {
        result = await res.json();
      } catch (parseErr) {
        result = null;
      }

      if (!res.ok || !result || !result.success) {
        throw new Error((result && result.message) || "تعذّر إنشاء الطلب من الخادم");
      }

      /* الطلب المُنشأ في القاعدة (يحوي الأسعار الحقيقية ورسوم الشحن المحسوبة هناك) */
      const saved = (result.data && result.data.order) || result.data;
      if (!saved) throw new Error("استجابة غير متوقعة من الخادم");

      /* تحويل شكل الطلب من الـ backend إلى الشكل المتوقع في confirmation.js */
      const lastOrder = {
        number: saved.orderNumber,
        date: saved.createdAt || new Date().toISOString(),
        customer: {
          name: v.name,
          phone: v.phone,
          wilaya: v.wilaya,
          wilayaName: wilayaName(v.wilaya),
          commune: commune,
          address: v.address,
          notes: notes,
        },
        payment: "الدفع عند الاستلام",
        items: (saved.items || []).map((it) => ({
          id: it.product,
          name: it.name,
          qty: it.quantity,
          price: it.price,
          image: it.image,
        })),
        subtotal: saved.subtotal,
        /* رسوم التوصيل المحسوبة في الخادم (0 → مجاني في صفحة التأكيد) */
        shipping: saved.shippingCost,
        shippingCost: saved.shippingCost,
        total: saved.total,
      };

      localStorage.setItem(ORDER_KEY, JSON.stringify(lastOrder));
      S.clearCart();
      window.location.href = "confirmation.html";
    } catch (err) {
      /* فشل الاتصال أو رفض الخادم: نعرض السبب ونعيد تفعيل الزر */
      console.error("[CHECKOUT] فشل إرسال الطلب:", err && err.message);
      S.toast((err && err.message) || "تعذّر إنشاء الطلب، حاول مرة أخرى", "error");
      setLoading(false);
    }
  });
}

/* لا نبدأ قبل تحميل المكتبات الأساسية (قد يُحمّل store.js بالتوازي مع هذا الملف) */
if (window.Store) {
  initCheckoutPage();
} else {
  window.addEventListener("frontend:ready", initCheckoutPage, { once: true });
}
