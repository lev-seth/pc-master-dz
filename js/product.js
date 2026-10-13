/* Product details page */
/* كل الكود داخل init() حتى لا تعمل الصفحة قبل اكتمال تحميل المكتبات
   (store.js) والكتالوج من الـ API — هذا هو سبب رسالة "المنتج غير موجود"
   رغم أن الرابط والمنتج صحيحان */
function initProductPage() {
  "use strict";

  /* سجلات مساعدة للتشخيص */
  console.log("[PRODUCT] init called");

  const root = document.getElementById("product-root");

  const S = window.Store;
  if (!S) {
    console.error("[PRODUCT] window.Store is not loaded");
    return;
  }
  /* الكتالوج يجب أن يكون محمّلاً بالفعل من الـ API قبل البحث عن المنتج */
  if (!window.CATALOG || !window.CATALOG.products || window.CATALOG.products.length === 0) {
    console.error("[PRODUCT] window.CATALOG is empty");
    fallback(false); /* رسالة خطأ بدل "جاري التحميل" للأبد */
    return;
  }
  console.log("[PRODUCT] products count: " + window.CATALOG.products.length);

  const NBSP = "\u00A0";

  /* Arabic labels for every spec key used by the catalog */
  const SPEC_AR = {
    cores: "عدد الأنوية",
    threads: "عدد الخيوط",
    base_clock_ghz: "التردد الأساسي",
    boost_clock_ghz: "التردد المعزز",
    l3_cache_mb: "ذاكرة L3 المؤقتة",
    tdp_w: "استهلاك الطاقة (TDP)",
    max_power_w: "القدرة القصوى",
    integrated_graphics: "رسوميات مدمجة",
    cooler_included: "مبرد مرفق",
    packaging: "نوع التغليف",
    chipset: "الشريحة (Chipset)",
    memory_slots: "فتحات الذاكرة",
    max_memory_gb: "أقصى سعة ذاكرة",
    m2_slots: "فتحات M.2",
    pcie_gen: "جيل PCIe",
    wifi: "واي فاي",
    capacity_gb: "السعة",
    interface: "الواجهة",
    drive_form_factor: "مقاس القرص",
    read_mbs: "سرعة القراءة",
    write_mbs: "سرعة الكتابة",
    dram_cache: "ذاكرة DRAM مؤقتة",
    rpm: "سرعة الدوران",
    cache_mb: "الذاكرة المؤقتة",
    wattage_w: "القدرة (وات)",
    efficiency: "كفاءة الطاقة",
    modular: "كابلات منفصلة",
    atx3: "معيار ATX 3.0",
    case_type: "نوع الصندوق",
    max_gpu_length_mm: "أقصى طول كرت الشاشة",
    max_cooler_height_mm: "أقصى ارتفاع المبرد",
    max_radiator_mm: "أقصى مقاس مشع",
    fans_included: "المراوح المرفقة",
    side_panel: "اللوحة الجانبية",
    max_tdp_w: "أقصى TDP مدعوم",
    rgb: "إضاءة RGB",
    height_mm: "الارتفاع",
    fan_size_mm: "مقاس المروحة",
    radiator_mm: "مقاس المشع",
    weight_g: "الوزن",
    cpu_model: "المعالج",
    gpu_model: "كرت الشاشة",
    ram_gb: "الذاكرة العشوائية",
    storage_gb: "سعة التخزين",
    storage_type: "نوع التخزين",
    dedicated_gpu: "كرت شاشة منفصل",
    os: "نظام التشغيل",
    size_inch: "الحجم (بوصة)",
    resolution: "الدقة",
    refresh_hz: "معدل التحديث",
    panel: "نوع اللوحة",
    response_ms: "زمن الاستجابة",
    curved: "منحنٍ",
    layout: "التخطيط",
    switch_type: "نوع المفاتيح",
    size: "المقاس",
    wireless: "لاسلكي",
    dpi: "الدقة (DPI)",
    weight_kg: "الوزن (كغ)",
    connection: "نوع الاتصال",
    microphone: "ميكروفون",
    surround: "صوت محيطي",
    video: "دقة الفيديو",
    print_technology: "تقنية الطباعة",
    color: "الألوان",
    functions: "الوظائف",
    duplex: "طباعة ذات وجهين",
    speed_ppm: "السرعة (صفحة/د)",
    wifi_standard: "معيار الواي فاي",
    speed_mbps: "السرعة",
    lan_ports: "منافذ الشبكة",
    mesh: "تقنية Mesh",
    sim_4g: "شريحة 4G",
    ports: "المنافذ",
    port_speed: "سرعة المنفذ",
    managed: "قابل للإدارة",
    cable_category: "فئة الكابل",
    length_m: "الطول (م)",
    pad_size: "مقاس السجادة",
    max_load_kg: "أقصى حمولة",
    upholstery: "التنجيد",
    width_cm: "العرض",
    depth_cm: "العمق",
    platform: "المنصة",
    max_laptop_inch: "أقصى حجم حاسوب محمول",
    cable_type: "نوع الكابل",
    socket: "الموصل (Socket)",
    memoryType: "نوع الذاكرة",
    formFactor: "المعيار (Form Factor)",
    warrantyMonths: "مدة الضمان",
    condition: "حالة المنتج",
  };

  const CONDITION_AR = {
    new: "جديد",
    used: "مستعمل",
    refurbished: "مجدد",
  };

  function fallback(notFound) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>${notFound ? "المنتج غير موجود" : "حدث خطأ أثناء التحميل"}</h3>
        <p>${notFound ? "ربما تم حذف هذا المنتج أو أن الرابط غير صحيح." : "حاول تحديث الصفحة من جديد."}</p>
        <a class="btn btn-primary" href="index.html">العودة إلى الرئيسية</a>
      </div>`;
    const sim = document.getElementById("similar-section");
    if (sim) sim.hidden = true;
  }

  /* Spec definitions for a category (leaf → ancestors) */
  function specDefs(slug) {
    const map = new Map();
    let cur = slug;
    const chain = [];
    while (cur) {
      const c = (window.CATALOG.categories || {})[cur];
      if (!c) break;
      chain.push(c);
      cur = c.parent;
      if (chain.length > 5) break;
    }
    chain.forEach((c) => (c.specs || []).forEach((d) => map.set(d.key, d)));
    return map;
  }

  function fmtValue(def, value) {
    if (value === true) return "نعم";
    if (value === false) return "لا";
    if (value === null || value === undefined || value === "") return null;

    if (def && def.type === "enum" && Array.isArray(def.options)) {
      const opt = def.options.find((o) => o.value === value);
      if (opt) return opt.label.ar || opt.label.en || value;
    }
    let text = String(value);
    if (def && def.unit) text = text + NBSP + def.unit;
    return text;
  }

  function specRows(p) {
    const defs = specDefs(p.category);
    const rows = [];
    const used = new Set();

    // specification keys coming from the data first
    const specKeys = Object.keys(p.specs || {});
    specKeys.forEach((key) => {
      const val = fmtValue(defs.get(key), p.specs[key]);
      if (val === null) return;
      used.add(key);
      const label = (defs.get(key) && defs.get(key).label.ar) || SPEC_AR[key] || key;
      rows.push([label, val]);
    });

    // extra product-level fields
    const extras = [
      ["socket", p.socket],
      ["memoryType", p.memoryType],
      ["formFactor", p.formFactor],
      ["condition", p.condition],
      ["warrantyMonths", p.warrantyMonths],
    ];
    extras.forEach(([key, value]) => {
      if (used.has(key) || value === undefined || value === null) return;
      let val;
      if (key === "condition") val = CONDITION_AR[value] || value;
      else if (key === "warrantyMonths") val = value + NBSP + "شهراً";
      else val = String(value);
      rows.push([SPEC_AR[key] || key, val]);
    });

    return rows;
  }

  function descriptionOf(p) {
    const d = p.description;
    if (!d) return null;
    return d.ar || d.en || d.fr || null;
  }

  /* Numbers + latin units must stay LTR inside the RTL page */
  function bidi(text) {
    const s = String(text);
    const first = s.match(/[A-Za-z\u0600-\u06FF]/);
    if (first && /[A-Za-z]/.test(first[0])) {
      return `<bdi dir="ltr">${S.esc(s)}</bdi>`;
    }
    return S.esc(s);
  }

  function stockLine(p) {
    if (p.stock <= 0)
      return `<span class="stock-line no"><span class="stock-dot"></span>نفد المخزون</span>`;
    if (p.stock <= 5)
      return `<span class="stock-line low"><span class="stock-dot"></span>آخر ${p.stock} قطع في المخزون</span>`;
    return `<span class="stock-line ok"><span class="stock-dot"></span>متوفر في المخزون (${p.stock} قطعة)</span>`;
  }

  function galleryHTML(p) {
    const imgs = (p.images || []).filter(Boolean);
    const main = imgs.length
      ? `<img src="${S.esc(imgs[0])}" alt="${S.esc(p.name)}" id="main-img">`
      : S.noImgHTML();
    const thumbs =
      imgs.length > 1
        ? `<div class="thumbs">${imgs
            .map(
              (src, i) =>
                `<button class="thumb${i === 0 ? " active" : ""}" type="button" data-thumb="${S.esc(
                  src
                )}"><img src="${S.esc(src)}" alt="${S.esc(p.name)}"></button>`
            )
            .join("")}</div>`
        : "";
    return `<div class="gallery"><div class="gallery-main" id="gallery-main">${main}</div>${thumbs}</div>`;
  }

  function render(p) {
    const r = S.ratingOf(p.id);
    const onSale = p.salePrice != null;
    const price = S.effectivePrice(p);
    const out = p.stock <= 0;
    const def = S.MAIN_CATEGORIES.find((m) => S.inMainCategory(p, m.slug));

    document.title = p.name + " | PC Master DZ";

    // breadcrumb
    const crumbCat = document.querySelector("[data-cat-link]");
    if (crumbCat && def) {
      crumbCat.textContent = def.ar;
      crumbCat.href = "index.html?cat=" + def.slug;
    }
    document.querySelector("[data-crumb-name]").textContent = p.name;

    const rows = specRows(p);
    const desc = descriptionOf(p);

    root.innerHTML = `
      <div class="product-layout">
        ${galleryHTML(p)}

        <div class="p-info">
          <span class="card-cat">${S.esc(S.categoryAr(p.category))} · ${S.esc(
      S.brandName(p.brand)
    )}</span>
          <h1>${S.esc(p.name)}</h1>

          <div class="p-meta">
            <span class="rating">${S.starsHTML(r.score)} <b>${r.score}</b> (${r.reviews} تقييم)</span>
            <span class="dot"></span>
            <span>رقم المرجع: <b dir="ltr">${S.esc(p.sku || p.id)}</b></span>
            <span class="dot"></span>
            <span>الحالة: <b>${CONDITION_AR[p.condition] || "جديد"}</b></span>
            ${
              p.warrantyMonths
                ? `<span class="dot"></span><span>الضمان: <b>${p.warrantyMonths} شهراً</b></span>`
                : ""
            }
          </div>

          <div class="p-price-box">
            <div>
              <div class="p-price">${S.priceHTML(price)}</div>
              ${
                onSale
                  ? `<span class="p-old">${S.formatPrice(p.price)}${NBSP}دج</span>
                     <span class="discount-pill" style="margin-top:.4rem">توفير ${S.formatPrice(
                       p.price - p.salePrice
                     )}${NBSP}دج (-${S.discountPct(p)}%)</span>`
                  : ""
              }
            </div>
            <div>${stockLine(p)}</div>
          </div>

          <div class="qty-buy">
            <div class="qty">
              <button type="button" data-qty-minus aria-label="تقليل الكمية">−</button>
              <input type="text" inputmode="numeric" value="1" data-main-qty aria-label="الكمية">
              <button type="button" data-qty-plus aria-label="زيادة الكمية">+</button>
            </div>
            <button class="btn btn-primary btn-lg" style="flex:1;min-width:200px"
                    data-add="${S.esc(p.id)}" data-use-main-qty ${out ? "disabled" : ""}>
              ${S.I.cart} ${out ? "غير متوفر حالياً" : "أضف إلى السلة"}
            </button>
          </div>

          <ul class="info-list">
            <li>${S.I.truck}<span>توصيل إلى جميع الولايات خلال 2 – 5 أيام عمل</span></li>
            <li>${S.I.cash}<span>الدفع عند الاستلام متاح</span></li>
            <li>${S.I.shield}<span>ضمان ${p.warrantyMonths || 12} شهراً على المنتج</span></li>
            <li>${S.I.checkCircle}<span>منتج أصلي 100% مع فاتورة شراء</span></li>
          </ul>

          <div class="block">
            <h3>${S.I.info} وصف المنتج</h3>
            <p>${S.esc(desc || "لا يتوفر وصف مترجم لهذا المنتج حالياً. يمكنك الاطلاع على الجدول التقني أدناه لمعرفة كل التفاصيل التقنية.")}</p>
            ${
              p.conditionNote
                ? `<p class="small" style="margin-top:.6rem;color:var(--warning)">${S.esc(
                    p.conditionNote
                  )}</p>`
                : ""
            }
          </div>

          <div class="block">
            <h3>${S.I.tag} المواصفات التقنية</h3>
            ${
              rows.length
                ? `<table class="specs-table"><tbody>${rows
                    .map(
                      ([k, v]) =>
                        `<tr><th>${S.esc(k)}</th><td>${bidi(v)}</td></tr>`
                    )
                    .join("")}</tbody></table>`
                : `<p>لا تتوفر مواصفات تفصيلية لهذا المنتج.</p>`
            }
          </div>
        </div>
      </div>`;

    // gallery thumbs
    root.querySelectorAll("[data-thumb]").forEach((t) => {
      t.addEventListener("click", () => {
        root.querySelectorAll(".thumb").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        const holder = document.getElementById("gallery-main");
        holder.innerHTML = `<img src="${S.esc(t.dataset.thumb)}" alt="${S.esc(p.name)}" id="main-img">`;
      });
    });

    // quantity controls
    const qtyInput = root.querySelector("[data-main-qty]");
    const clamp = (v) => Math.min(Math.max(1, v), Math.max(p.stock || 1, 1));
    root.querySelector("[data-qty-minus]").addEventListener("click", () => {
      qtyInput.value = clamp((parseInt(qtyInput.value, 10) || 1) - 1);
    });
    root.querySelector("[data-qty-plus]").addEventListener("click", () => {
      qtyInput.value = clamp((parseInt(qtyInput.value, 10) || 1) + 1);
    });
    qtyInput.addEventListener("change", () => {
      qtyInput.value = clamp(parseInt(qtyInput.value, 10) || 1);
    });

    S.bindAddButtons(root);

    renderSimilar(p);
  }

  function renderSimilar(p) {
    const section = document.getElementById("similar-section");
    const grid = document.getElementById("similar-grid");
    const others = S.products.filter(
      (x) => x.id !== p.id && !x.buildOnly
    );
    const sameCat = others.filter((x) => x.category === p.category);
    const sameTree = others.filter(
      (x) =>
        (x.categoryPath || []).join("/") === (p.categoryPath || []).join("/")
    );
    const pool = [
      ...sameCat,
      ...sameTree.filter((x) => !sameCat.includes(x)),
      ...others.filter((x) => !sameTree.includes(x)),
    ].slice(0, 4);

    if (!pool.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    grid.innerHTML = pool.map((x) => S.cardHTML(x)).join("");
    S.bindAddButtons(grid);
  }

  const id = S.readParams().get("id");
  console.log("[PRODUCT] id from URL: " + id);
  if (!id) return fallback(true);
  const product = S.byId(id);
  console.log("[PRODUCT] product found: " + !!product);
  if (!product) return fallback(true);
  render(product);
}

/* --------------------------- بوت التشغيل ---------------------------
   لا نبدأ إلا بعد اكتمال تحميل الكتالوج (CATALOG_READY) وتوفر المكتبات
   (store.js قد يُحمّل بالتوازي مع هذا الملف، لذا ننتظر حدث frontend:ready) */
let productCatalogSettled = !window.CATALOG_READY; /* هل اكتمل جلب الكتالوج؟ */
let productStarted = false;

function tryInitProductPage() {
  if (productStarted || !productCatalogSettled || !window.Store) return;
  productStarted = true; /* نضمن ألا تعمل الصفحة مرتين */
  initProductPage();
}

/* يُطلق product.html هذا الحدث على window بعد تحميل store.js و product.js معاً */
window.addEventListener("frontend:ready", tryInitProductPage, { once: true });

/* الكتالوج جاهز (أو فشل التحميل) — نحاول عند اكتماله */
if (window.CATALOG_READY) {
  window.CATALOG_READY.then(function () {
    productCatalogSettled = true;
    tryInitProductPage();
  });
}

/* محاولة أخيرة عند اكتمال تحميل الصفحة */
window.addEventListener("load", tryInitProductPage);
