/* ============================================================
   PC Master DZ — shared store: shell, cart, helpers
   ============================================================ */
(function () {
  "use strict";

  const CATALOG = window.CATALOG || { products: [], categories: {}, brands: [] };
  const CART_KEY = "pcmdz.cart";
  const ORDER_KEY = "pcmdz.lastOrder";

  /* ------------------------------ Icons ------------------------------ */
  const svg = (p, extra) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${
      extra || ""
    }>${p}</svg>`;

  const I = {
    logo: svg(
      '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 9h4M7 12h7"/>'
    ),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>'),
    cart: svg(
      '<path d="M3 4h2.2l1.6 10.2a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L20.5 8H6.2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/>'
    ),
    user: svg(
      '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'
    ),
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/></svg>',
    cpu: svg(
      '<rect x="6.5" y="6.5" width="11" height="11" rx="1.6"/><rect x="9.8" y="9.8" width="4.4" height="4.4" rx="1"/><path d="M9.5 3v3.5M14.5 3v3.5M9.5 17.5V21M14.5 17.5V21M3 9.5h3.5M3 14.5h3.5M17.5 9.5H21M17.5 14.5H21"/>'
    ),
    gpu: svg(
      '<rect x="2.5" y="6" width="19" height="10" rx="2"/><circle cx="8" cy="11" r="2.6"/><circle cx="15.5" cy="11" r="2.6"/><path d="M6 16v3M18 16v3"/>'
    ),
    ram: svg(
      '<rect x="2.5" y="7" width="19" height="9" rx="1.6"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3"/><path d="M6 10.5h9M6 13h6"/>'
    ),
    ssd: svg(
      '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="8.5" cy="12" r="3"/><path d="M14 9.5h4M14 12.5h4M14 15.5h2"/>'
    ),
    mb: svg(
      '<rect x="3" y="3.5" width="18" height="17" rx="2"/><rect x="6.5" y="7" width="5" height="5" rx="1"/><path d="M14.5 7h3.5M14.5 10h3.5M6 15.5h12M6 18h8"/>'
    ),
    psu: svg(
      '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="9" cy="12" r="3.4"/><path d="M15 9.5h3.5M15 12h3.5M15 14.5h3.5"/>'
    ),
    case: svg(
      '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="8.5" r="2.6"/><path d="M9 14h6M9 17h4"/><path d="M6 6h-2M6 18H4"/>'
    ),
    cool: svg(
      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="1.8"/><path d="M12 3.5c2.5 2 3.2 4.6 1.9 6.7M20.5 12c-2 2.5-4.6 3.2-6.7 1.9M12 20.5c-2.5-2-3.2-4.6-1.9-6.7M3.5 12c2-2.5 4.6-3.2 6.7-1.9"/>'
    ),
    monitor: svg(
      '<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>'
    ),
    keyboard: svg(
      '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6 13.5h.01M18 13.5h.01M9.5 13.5h5"/>'
    ),
    mouse: svg(
      '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3.5"/>'
    ),
    trash: svg('<path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>'),
    check: svg('<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>'),
    checkCircle: svg('<circle cx="12" cy="12" r="9.2"/><path d="M8 12.4l2.8 2.8L16.2 9.6"/>'),
    truck: svg(
      '<path d="M2.5 6.5h11v10h-11z"/><path d="M13.5 10h3.6l3.4 3.2v3.3h-7z"/><circle cx="7" cy="18.4" r="1.7"/><circle cx="17" cy="18.4" r="1.7"/>'
    ),
    shield: svg('<path d="M12 3.2 19 6v5.4c0 4.3-2.9 7.6-7 9.4-4.1-1.8-7-5.1-7-9.4V6z"/><path d="M9 12.2l2.2 2.2 4-4.2"/>'),
    warranty: svg('<circle cx="12" cy="9" r="5.2"/><path d="M9 13.4 8 21l4-2 4 2-1-7.6"/>'),
    phone: svg('<path d="M6.6 3.5h3l1.6 4-2 1.4a12 12 0 0 0 5.9 5.9l1.4-2 4 1.6v3a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 5.7 2 2 0 0 1 6.6 3.5z"/>'),
    mail: svg('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.6 7 8.4 6 8.4-6"/>'),
    pin: svg('<path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/>'),
    cash: svg('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
    box: svg('<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/>'),
    info: svg('<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.4M12 7.9v.6"/>'),
    tag: svg('<path d="M3.5 11.2V4.5h6.7l9.3 9.3-6.7 6.7z"/><circle cx="7.6" cy="8.4" r="1.4"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    cartBig: svg(
      '<path d="M3 4h2.2l1.6 10.2a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L20.5 8H6.2"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/>',
      'stroke-width="1.4"'
    ),
    heart: svg('<path d="M12 20s-7.5-4.7-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10z"/>'),
    headset: svg('<path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.6"/><rect x="17" y="14" width="4" height="6" rx="1.6"/><path d="M19 20v.5a2.5 2.5 0 0 1-2.5 2.5H13"/>'),
  };

  /* --------------------------- Main categories --------------------------- */
  const MAIN_CATEGORIES = [
    { slug: "processeurs", ar: "المعالجات", icon: I.cpu, cats: ["processeurs"] },
    { slug: "cartes-graphiques", ar: "كروت الشاشة", icon: I.gpu, cats: ["cartes-graphiques"] },
    { slug: "memoire-ram", ar: "الذاكرة RAM", icon: I.ram, cats: ["memoire-ram"] },
    { slug: "stockage", ar: "التخزين SSD / HDD", icon: I.ssd, cats: ["stockage", "ssd", "disques-durs"] },
    { slug: "cartes-meres", ar: "اللوحات الأم", icon: I.mb, cats: ["cartes-meres"] },
    { slug: "alimentations", ar: "التغذية PSU", icon: I.psu, cats: ["alimentations"] },
    { slug: "boitiers", ar: "الصناديق", icon: I.case, cats: ["boitiers"] },
    { slug: "refroidissement", ar: "التبريد", icon: I.cool, cats: ["refroidissement", "ventirads", "watercooling", "pates-thermiques", "ventilateurs"] },
    { slug: "ecrans", ar: "الشاشات", icon: I.monitor, cats: ["ecrans"] },
    { slug: "peripheriques", ar: "الملحقات", icon: I.mouse, cats: ["peripheriques", "claviers", "souris", "casques", "webcams", "microphones", "imprimantes"] },
  ];

  /* ------------------------------ Wilayas ------------------------------
     69 wilayas (the 11 new ones from the 2019 administrative division
     are listed after 58 — codes 59..69). */
  const WILAYAS = [
    ["01", "أدرار"], ["02", "الشلف"], ["03", "الأغواط"], ["04", "أم البواقي"],
    ["05", "باتنة"], ["06", "بجاية"], ["07", "بسكرة"], ["08", "بشار"],
    ["09", "البليدة"], ["10", "البويرة"], ["11", "تمنراست"], ["12", "تبسة"],
    ["13", "تلمسان"], ["14", "تيارت"], ["15", "تيزي وزو"], ["16", "الجزائر"],
    ["17", "الجلفة"], ["18", "جيجل"], ["19", "سطيف"], ["20", "سعيدة"],
    ["21", "سكيكدة"], ["22", "سيدي بلعباس"], ["23", "عنابة"], ["24", "قالمة"],
    ["25", "قسنطينة"], ["26", "المدية"], ["27", "مستغانم"], ["28", "المسيلة"],
    ["29", "معسكر"], ["30", "ورقلة"], ["31", "وهران"], ["32", "البيّض"],
    ["33", "إليزي"], ["34", "برج بوعريريج"], ["35", "بومرداس"], ["36", "الطارف"],
    ["37", "تندوف"], ["38", "تيسمسيلت"], ["39", "الوادي"], ["40", "خنشلة"],
    ["41", "سوق أهراس"], ["42", "تيبازة"], ["43", "ميلة"], ["44", "عين الدفلى"],
    ["45", "النعامة"], ["46", "عين تموشنت"], ["47", "غرداية"], ["48", "غليزان"],
    ["49", "تيميمون"], ["50", "برج باجي مختار"], ["51", "أولاد جلال"], ["52", "بني عباس"],
    ["53", "عين صالح"], ["54", "عين قزام"], ["55", "تقرت"], ["56", "جانت"],
    ["57", "المغير"], ["58", "المنيعة"],
    ["59", "أفلو"], ["60", "بريكة"], ["61", "القنطرة"], ["62", "بئر العاتر"],
    ["63", "العريشة"], ["64", "قصر الشلالة"], ["65", "عين وسارة"], ["66", "مسعد"],
    ["67", "قصر البخاري"], ["68", "بوسعادة"], ["69", "الأبيض سيدي الشيخ"],
  ];

  /* مناطق الشحن في الجزائر: الولايات 01–48 شمال (400 دج) و49–69 جنوب
     (800 دج)، والشحن مجاني ابتداءً من 150,000 دج.
     نفس القاعدة المطبّقة في الـ backend (order.controller.js) حتى لا
     يختلف مبلغ ما يعرضه العميل عن المبلغ المسجّل في الطلب.
     ملاحظة: الولايات الجديدة 59–69 تُعامل معاملة باقي الولايات حسب رقمها
     (لا ترث منطقة ولايتها الأم) — وهذا ما يفرضه الـ backend. */
  const SHIPPING = { north: 400, south: 800, freeOver: 150000 };

  /* ------------------------------ Utilities ------------------------------ */
  const NBSP = "\u00A0";

  function formatPrice(n) {
    const v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  }

  function priceHTML(n) {
    return `${formatPrice(n)}${NBSP}<span class="cur">دج</span>`;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(
      /[&<>"']/g,
      (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function hash(str) {
    let h = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function ratingOf(id) {
    const h = hash(id);
    return {
      score: Math.round((3.5 + (h % 16) / 10) * 2) / 2,
      reviews: 8 + (h % 213),
    };
  }

  function starsHTML(score) {
    let out = "";
    for (let i = 1; i <= 5; i++) {
      out += `<span class="${i <= Math.round(score) ? "" : "off"}">${I.star}</span>`;
    }
    return `<span class="stars">${out}</span>`;
  }

  function categoryAr(slug) {
    const c = CATALOG.categories[slug];
    return c && c.name ? c.name.ar : slug;
  }

  function brandName(slug) {
    const b = CATALOG.brands.find((x) => x.slug === slug);
    return b ? b.name : slug;
  }

  function byId(id) {
    return CATALOG.products.find((p) => p.id === id) || null;
  }

  function effectivePrice(p) {
    return p.salePrice != null ? p.salePrice : p.price;
  }

  function productImage(p) {
    return p.images && p.images.length ? p.images[0] : null;
  }

  function imageHTML(p, alt) {
    const src = productImage(p);
    if (src) {
      return `<img src="${esc(src)}" alt="${esc(alt || p.name)}" loading="lazy" onerror="this.parentNode.innerHTML=window.Store.noImgHTML()">`;
    }
    return noImgHTML();
  }

  function noImgHTML() {
    return `<div class="no-img">${I.box}<span>بدون صورة</span></div>`;
  }

  function shortSpecs(p) {
    const s = p.specs || {};
    const bits = [];
    if (s.vram_gb) bits.push(`${s.vram_gb} GB`);
    if (s.capacity_gb && p.category !== "ssd" && p.category !== "disques-durs")
      bits.push(`${s.capacity_gb} GB`);
    if (p.category === "ssd" && s.capacity_gb) bits.push(`${s.capacity_gb} GB`);
    if (s.cores) bits.push(`${s.cores} أنوية`);
    if (s.wattage_w) bits.push(`${s.wattage_w} واط`);
    if (s.speed_mts) bits.push(`${s.speed_mts} MT/s`);
    if (s.size_inch) bits.push(`${s.size_inch}"`);
    if (s.resolution && typeof s.resolution === "string") bits.push(s.resolution);
    if (s.refresh_hz) bits.push(`${s.refresh_hz} Hz`);
    if (!bits.length && s.interface) bits.push(String(s.interface));
    if (!bits.length && p.socket) bits.push("Socket " + p.socket);
    return bits.slice(0, 3).join(" · ");
  }

  function discountPct(p) {
    if (p.salePrice == null) return 0;
    return Math.round(((p.price - p.salePrice) / p.price) * 100);
  }

  function inMainCategory(p, mainSlug) {
    const def = MAIN_CATEGORIES.find((m) => m.slug === mainSlug);
    if (!def) return false;
    return def.cats.includes(p.category) || (p.categoryPath || []).some((c) => def.cats.includes(c));
  }

  function readParams() {
    return new URLSearchParams(window.location.search);
  }

  /* -------------------------------- Cart -------------------------------- */
  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter((l) => l && typeof l.id === "string" && byId(l.id));
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateBadge(true);
  }

  function cartCount() {
    return loadCart().reduce((n, l) => n + l.qty, 0);
  }

  function cartLines() {
    return loadCart().map((l) => ({ ...l, product: byId(l.id) }));
  }

  function subtotal() {
    return cartLines().reduce((n, l) => n + effectivePrice(l.product) * l.qty, 0);
  }

  function addToCart(id, qty) {
    const p = byId(id);
    if (!p) return false;
    const cart = loadCart();
    const line = cart.find((l) => l.id === id);
    const want = Math.max(1, parseInt(qty, 10) || 1);
    const current = line ? line.qty : 0;
    const max = p.stock > 0 ? p.stock : 99;
    const next = Math.min(current + want, max);
    if (line) line.qty = next;
    else cart.push({ id, qty: next });
    saveCart(cart);
    return true;
  }

  function setQty(id, qty) {
    const cart = loadCart();
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    const p = byId(id);
    const max = p && p.stock > 0 ? p.stock : 99;
    line.qty = Math.min(Math.max(1, parseInt(qty, 10) || 1), max);
    saveCart(cart);
  }

  function removeFromCart(id) {
    saveCart(loadCart().filter((l) => l.id !== id));
  }

  function clearCart() {
    saveCart([]);
  }

  /* احتساب رسوم الشحن حسب رقم الولاية مباشرة: 01–48 شمال (400 دج)
     و49–69 جنوب (800 دج) — نفس القاعدة في الـ backend */
  function shippingFor(wilayaCode) {
    if (!wilayaCode) return null;
    const n = parseInt(wilayaCode, 10);
    if (isNaN(n)) return null;
    return n <= 48 ? SHIPPING.north : SHIPPING.south;
  }

  function updateBadge(animate) {
    const badge = document.querySelector(".cart-count");
    if (!badge) return;
    const n = cartCount();
    badge.textContent = n;
    badge.style.display = n > 0 ? "grid" : "none";
    if (animate && n > 0) {
      badge.classList.remove("bump");
      void badge.offsetWidth;
      badge.classList.add("bump");
    }
  }

  /* ------------------------------- Toast -------------------------------- */
  function toast(msg, type) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.innerHTML = (type === "error" ? I.info : I.checkCircle) + `<span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 320);
    }, 2600);
  }

  /* ---------------------------- Shell (header/footer) --------------------- */
  function headerHTML(page) {
    const showCats = page === "home";
    return `
      <div class="container header-inner">
        <a class="brand" href="index.html" aria-label="PC Master DZ">
          <span class="logo-mark">${I.logo}</span>
          <span class="brand-text">PC Master <span>DZ</span></span>
        </a>
        <form class="search-form" role="search" data-search>
          <input id="search-input" data-search-input type="search" name="q" placeholder="ابحث عن منتج، ماركة أو فئة..." aria-label="بحث" autocomplete="off">
          <button type="submit" aria-label="بحث">${I.search}</button>
        </form>
        <div class="header-actions">
          <a class="icon-btn" href="cart.html" aria-label="سلة التسوق">
            ${I.cart}
            <span class="cart-count" style="display:none">0</span>
          </a>
          <button type="button" class="btn btn-outline btn-sm login-btn" data-login>
            ${I.user}<span class="lbl">تسجيل الدخول</span>
          </button>
        </div>
      </div>
      <div class="container mobile-search">
        <form class="search-form" role="search" data-search>
          <input id="search-input-mobile" data-search-input type="search" name="q" placeholder="ابحث عن منتج، ماركة أو فئة..." aria-label="بحث" autocomplete="off">
          <button type="submit" aria-label="بحث">${I.search}</button>
        </form>
      </div>
      ${
        showCats
          ? `<nav class="cat-bar" aria-label="فئات المنتجات"><div class="container"><div class="cat-list" data-cats></div></div></nav>`
          : ""
      }`;
  }

  function footerHTML() {
    return `
      <div class="container footer-grid">
        <div>
          <a class="brand" href="index.html">
            <span class="logo-mark">${I.logo}</span>
            <span class="brand-text">PC Master <span>DZ</span></span>
          </a>
          <p style="margin-top:.9rem">متجرك المتخصص في قطع الحاسوب وملحقات الألعاب في الجزائر. منتجات أصلية، أسعار في دينار جزائري وضمان حقيقي.</p>
          <div class="contact-line">${I.cash}<span>الدفع عند الاستلام متاح في 69 ولاية</span></div>
        </div>
        <div>
          <h4>روابط سريعة</h4>
          <ul>
            <li><a href="index.html">الرئيسية</a></li>
            <li><a href="index.html?cat=processeurs">المعالجات</a></li>
            <li><a href="index.html?cat=cartes-graphiques">كروت الشاشة</a></li>
            <li><a href="index.html?cat=stockage">وحدات التخزين</a></li>
            <li><a href="cart.html">سلة التسوق</a></li>
          </ul>
        </div>
        <div>
          <h4>خدمة العملاء</h4>
          <ul>
            <li><a href="checkout.html">إتمام الطلب</a></li>
            <li><a href="confirmation.html">تتبع الطلب</a></li>
            <li><a href="#" data-login>تسجيل الدخول</a></li>
            <li><a href="index.html#offers">العروض الخاصة</a></li>
            <li><a href="index.html#features">الشحن والضمان</a></li>
          </ul>
        </div>
        <div>
          <h4>اتصل بنا</h4>
          <ul>
            <li class="contact-line">${I.pin}<span>شارع ديدوش مراد، الجزائر العاصمة</span></li>
            <li class="contact-line">${I.phone}<span dir="ltr">+213 555 12 34 56</span></li>
            <li class="contact-line">${I.mail}<span>contact@pcmasterdz.dz</span></li>
            <li class="contact-line">${I.clock}<span>السبت – الخميس: 09:00 – 18:00</span></li>
            <li class="contact-line">${I.headset}<span>الدعم الفني: 0770 88 99 77</span></li>
          </ul>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© <span data-year></span> PC Master DZ — جميع الحقوق محفوظة.</span>
        <span>صُنع في الجزائر <span class="neon">♥</span> بواجهة HTML / CSS / JavaScript</span>
      </div>`;
  }

  function mountShell() {
    const page = document.body.dataset.page || "";
    const header = document.querySelector("[data-site-header]");
    if (header) {
      header.className = "site-header";
      header.innerHTML = headerHTML(page);
    }
    const footer = document.querySelector("[data-site-footer]");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = footerHTML();
    }

    // category chips (home)
    const catList = document.querySelector("[data-cats]");
    if (catList) {
      catList.innerHTML = MAIN_CATEGORIES.map(
        (c) =>
          `<a class="cat-chip" data-cat="${c.slug}" href="index.html?cat=${c.slug}">${c.icon}<span>${c.ar}</span></a>`
      ).join("");
    }

    // search forms
    document.querySelectorAll("[data-search]").forEach((form) => {
      const q = readParams().get("q");
      const input = form.querySelector("input");
      if (q) input.value = q;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (page === "home") {
          document.dispatchEvent(
            new CustomEvent("pcmdz:search", { detail: { q: val } })
          );
        } else {
          window.location.href = "index.html" + (val ? "?q=" + encodeURIComponent(val) : "");
        }
      });

      /* Real-time search on non-home pages: the product grid only exists on
         the home page, so after a short pause take the user to the results.
         On the home page, js/home.js filters the grid in place instead. */
      if (page !== "home") {
        let navTimer = null;
        input.addEventListener("input", () => {
          const val = input.value;
          document.querySelectorAll("[data-search] input").forEach((other) => {
            if (other !== input) other.value = val;
          });
          clearTimeout(navTimer);
          const trimmed = val.trim();
          if (!trimmed) return;
          navTimer = setTimeout(() => {
            window.location.href = "index.html?q=" + encodeURIComponent(trimmed);
          }, 500);
        });
      }
    });

    // login (UI only)
    document.querySelectorAll("[data-login]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        toast("تسجيل الدخول غير متاح حالياً — هذه واجهة تجريبية", "error");
      });
    });

    const yr = document.querySelector("[data-year]");
    if (yr) yr.textContent = new Date().getFullYear();

    updateBadge(false);
  }

  /* --------------------------- Product card ------------------------------ */
  function cardHTML(p, opts) {
    opts = opts || {};
    const onSale = p.salePrice != null;
    const price = effectivePrice(p);
    const r = ratingOf(p.id);
    const out = p.stock <= 0;
    const badge = onSale
      ? `<span class="badge badge-sale">-${discountPct(p)}%</span>`
      : "";
    const stockBadge = out
      ? `<span class="badge badge-out">نفد المخزون</span>`
      : p.stock <= 5
      ? `<span class="badge badge-stock">آخر ${p.stock} قطع</span>`
      : "";
    const showOld = opts.showOldPrice !== false && onSale;
    return `
      <article class="card" data-product-card>
        <a class="card-media" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="${esc(p.name)}">
          ${badge}${stockBadge}
          ${imageHTML(p)}
        </a>
        <div class="card-body">
          <span class="card-cat">${esc(categoryAr(p.category))} · ${esc(brandName(p.brand))}</span>
          <h3 class="card-title"><a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
          ${shortSpecs(p) ? `<div class="card-specs" dir="auto">${esc(shortSpecs(p))}</div>` : ""}
          <div class="rating">${starsHTML(r.score)}<span>${r.score} (${r.reviews})</span></div>
          <div class="price-row">
            <span class="price">${priceHTML(price)}</span>
            ${showOld ? `<span class="old-price">${formatPrice(p.price)}${NBSP}دج</span>` : ""}
          </div>
          <button class="btn btn-primary btn-sm" data-add="${esc(p.id)}" ${out ? "disabled" : ""}>
            ${I.cart}${out ? "غير متوفر" : "أضف إلى السلة"}
          </button>
        </div>
      </article>`;
  }

  function bindAddButtons(root) {
    (root || document).querySelectorAll("[data-add]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-add");
        const qtyInput = document.querySelector("[data-main-qty]");
        const qty =
          btn.hasAttribute("data-use-main-qty") && qtyInput ? qtyInput.value : 1;
        if (addToCart(id, qty)) {
          const p = byId(id);
          toast(`تمت إضافة "${p ? p.name : id}" إلى السلة`);
        } else {
          toast("تعذّرت إضافة المنتج", "error");
        }
      });
    });
  }

  /* ------------------------------- Public API ---------------------------- */
  window.Store = {
    I,
    MAIN_CATEGORIES,
    WILAYAS,
    SHIPPING,
    products: CATALOG.products,
    formatPrice,
    priceHTML,
    esc,
    ratingOf,
    starsHTML,
    categoryAr,
    brandName,
    byId,
    effectivePrice,
    productImage,
    imageHTML,
    noImgHTML,
    shortSpecs,
    discountPct,
    inMainCategory,
    readParams,
    cartCount,
    cartLines,
    subtotal,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    shippingFor,
    updateBadge,
    toast,
    cardHTML,
    bindAddButtons,
  };

  /* -------------------------------- Init --------------------------------- */
  function boot() {
    mountShell();
  }

  if (document.readyState === "loading" && !document.querySelector("[data-site-header]")) {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
