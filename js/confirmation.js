/* Order confirmation page */
/* كل الكود داخل دالة init حتى لا تعمل الصفحة قبل تحميل المكتبات */
function initConfirmationPage() {
  "use strict";

  const S = window.Store;
  if (!S) return;

  const ORDER_KEY = "pcmdz.lastOrder";
  const root = document.getElementById("confirm-root");

  let order = null;
  try {
    order = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
  } catch (e) {
    order = null;
  }

  if (!order || !order.number) {
    root.innerHTML = `
      <div class="confirm-wrap">
        <div class="empty-state">
          <h3>لا يوجد طلب لعرضه</h3>
          <p>لم نعثر على أي طلب مؤكّد على هذا الجهاز. تأكّد من إتمام الطلب أولاً.</p>
          <a class="btn btn-primary" href="index.html">العودة إلى الرئيسية</a>
        </div>
      </div>`;
    return;
  }

  const date = new Date(order.date);
  const dateText = isNaN(date)
    ? ""
    : date.toLocaleDateString("ar-DZ", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " — " +
      date.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });

  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
  const c = order.customer || {};

  /* المجموع الفرعي: من الحقل المحفوظ، وإلا نحسبه من بنود الطلب */
  const sub =
    Number(order.subtotal) ||
    order.items.reduce((n, i) => n + (Number(i.price) || 0) * i.qty, 0);

  /* قراءة رسوم التوصيل المحفوظة في الطلب (shippingCost أولاً ثم shipping
     للتوافق مع الطلبات القديمة). القيمة 0 أو null → تُعرض "مجاني". */
  const rawShipping = order.shippingCost != null ? order.shippingCost : order.shipping;
  let shipping = Number(rawShipping);

  /* إصلاح الطلبات القديمة: إن كان الشحن محفوظاً صفراً بينما المجموع الفرعي
     أقل من حد المجاني (150,000 دج) فالقيمة قديمة (كانت تُحفظ صفراً دائماً)
     → نعيد حسابها من ولاية التوصيل حتى لا تظهر "مجاني" عن غير حق */
  const codeMatch = c.wilaya ? String(c.wilaya).match(/\d+/) : null;
  const brokenZero =
    !Number.isFinite(shipping) || (shipping === 0 && sub < S.SHIPPING.freeOver);
  if (brokenZero && codeMatch) {
    const computed = S.shippingFor(codeMatch[0]);
    if (computed != null) shipping = computed;
  }
  if (!Number.isFinite(shipping)) shipping = 0;

  /* الإجمالي = المجموع الفرعي + رسوم التوصيل */
  const total = sub + shipping;

  root.innerHTML = `
    <div class="confirm-wrap">
      <div class="check-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>
      </div>

      <h1>تم تأكيد طلبك بنجاح!</h1>
      <p>شكراً لك <b>${S.esc(c.name || "عميلنا")}</b>، استلمنا طلبك وسنتصل بك على الرقم
        <b dir="ltr">${S.esc(c.phone || "")}</b> خلال 24 ساعة لتأكيد موعد التوصيل.</p>

      <div class="order-number">${S.I.check} رقم الطلب: ${S.esc(order.number)}</div>

      <div class="confirm-details">
        <div class="sum-row"><span>حالة الطلب</span><b style="color:var(--warning)">قيد المعالجة</b></div>
        <div class="sum-row"><span>عدد القطع</span><b>${itemCount} قطعة (${order.items.length} منتج)</b></div>
        <div class="sum-row"><span>ولاية التوصيل</span><b>${S.esc(c.wilayaName || "")}</b></div>
        <div class="sum-row"><span>العنوان</span><b style="max-width:60%;text-align:start">${S.esc(
          [c.commune, c.address].filter(Boolean).join("، ")
        )}</b></div>
        <div class="sum-row"><span>طريقة الدفع</span><b>${S.esc(order.payment || "الدفع عند الاستلام")}</b></div>
        ${dateText ? `<div class="sum-row"><span>تاريخ الطلب</span><b>${S.esc(dateText)}</b></div>` : ""}
        <div class="sum-row"><span>المجموع الفرعي</span><b>${S.formatPrice(sub)} دج</b></div>
        <div class="sum-row"><span>رسوم التوصيل</span><b>${
          shipping > 0 ? S.formatPrice(shipping) + " دج" : "مجاني"
        }</b></div>
        <div class="sum-row sum-total"><span>الإجمالي</span><b>${S.formatPrice(total)} دج</b></div>
      </div>

      <div class="block" style="text-align:start">
        <h3>${S.I.box} المنتجات المطلوبة</h3>
        <ul class="order-list" style="max-height:none">
          ${order.items
            .map(
              (it) => `
            <li>
              <span class="ol-thumb">${
                it.image ? `<img src="${S.esc(it.image)}" alt="${S.esc(it.name)}" loading="lazy">` : S.I.box
              }</span>
              <span class="ol-name">${S.esc(it.name)}<br><span class="ol-qty">${it.qty} × ${S.formatPrice(
                it.price
              )} دج</span></span>
              <span class="ol-price">${S.formatPrice(it.price * it.qty)} دج</span>
            </li>`
            )
            .join("")}
        </ul>
      </div>

      <div class="pay-note" style="text-align:start">
        ${S.I.truck}
        <span>سيتم توصيل طلبك خلال 2 إلى 5 أيام عمل حسب ولايتك. احتفظ برقم الطلب
        <b dir="ltr">${S.esc(order.number)}</b> للتواصل مع خدمة العملاء.</span>
      </div>

      <div class="confirm-actions">
        <a class="btn btn-primary" href="index.html">متابعة التسوق</a>
        <button class="btn btn-outline" type="button" onclick="window.print()">طباعة الطلب</button>
        <a class="btn btn-ghost" href="cart.html">الذهاب إلى السلة</a>
      </div>
    </div>`;

  document.title = `تم تأكيد الطلب ${order.number} | PC Master DZ`;
}

/* لا نبدأ قبل تحميل المكتبات الأساسية (قد يُحمّل store.js بالتوازي مع هذا الملف) */
if (window.Store) {
  initConfirmationPage();
} else {
  window.addEventListener("frontend:ready", initConfirmationPage, { once: true });
}
