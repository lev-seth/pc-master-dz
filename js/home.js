/* Home page: filtering, search, pagination, offers */
(function () {
  "use strict";

  const S = window.Store;
  if (!S) return;

  const PAGE_SIZE = 12;
  const params = S.readParams();

  /* Single products array used by BOTH the initial render and search */
  const allProducts = S.products.filter((p) => !p.buildOnly);

  const state = {
    cat: params.get("cat") || "",
    q: (params.get("q") || "").trim(),
    visible: PAGE_SIZE,
  };

  const gridEl = document.getElementById("products-grid");
  const offersEl = document.getElementById("offers-grid");
  const loadMoreBtn = document.getElementById("load-more");
  const footEl = document.getElementById("section-foot");
  const titleEl = document.querySelector("[data-grid-title]");
  const subEl = document.querySelector("[data-grid-sub]");
  const countEl = document.querySelector("[data-grid-count]");
  const searchInputs = Array.from(document.querySelectorAll("[data-search] input"));

  /* Default listing: interleave categories so the grid stays varied */
  function roundRobin(list) {
    const groups = new Map();
    list.forEach((p) => {
      if (!groups.has(p.category)) groups.set(p.category, []);
      groups.get(p.category).push(p);
    });
    const keys = Array.from(groups.keys());
    const out = [];
    let i = 0;
    while (out.length < list.length) {
      let added = false;
      keys.forEach((k) => {
        const g = groups.get(k);
        if (g[i]) {
          out.push(g[i]);
          added = true;
        }
      });
      i++;
      if (!added) break;
    }
    return out;
  }

  /* --------------------- خرائط فئات المنتجات (تصحيح الفلترة) ---------------------
     روابط التنقل في الواجهة تستخدم slugs فرنسية (processeurs, cartes-meres,
     memoire-ram...) بينما تعيد واجهة الـ API أسماء الفئات بالإنجليزية
     (CPU, GPU, Motherboard...) — لذلك كان المطابقة المباشرة تفشل وتنعرض
     الصفحة رسالة "لا توجد نتائج" رغم وجود منتجات. الخريطة تترجم slug
     الفرنسي إلى اسم الفئة الموجود فعلياً في قاعدة البيانات. */
  const CATEGORY_MAP = {
    'processeurs': 'CPU',
    'cartes-graphiques': 'GPU',
    'cartes-meres': 'Motherboard',
    'memoire-ram': 'RAM',
    'ssd': 'SSD',
    'disques-durs': 'HDD',
    'alimentations': 'PSU',
    'boitiers': 'Case',
    'ventirads': 'CPU Cooler',
    'watercooling': 'Water Cooling',
    'pates-thermiques': 'Thermal Paste',
    'ventilateurs': 'Case Fan',
    'ecrans': 'Monitor',
    'claviers': 'Keyboard',
    'souris': 'Mouse',
    'casques': 'Headset',
    'webcams': 'Webcam',
    'microphones': 'Microphone',
    'imprimantes': 'Printer',
    'routeurs': 'Router',
    'adaptateurs-wifi': 'WiFi Adapter',
    'switchs': 'Network Switch',
    'cables-reseau': 'Network Cable',
    'tapis-de-souris': 'Mouse Pad',
    'chaises-gaming': 'Gaming Chair',
    'tables-gaming': 'Gaming Desk',
    'manettes': 'Gamepad',
    'sacs': 'Bag',
    'cables-adaptateurs': 'Cable/Adapter',
    'pc-gamer-fixe': 'Gaming PC',
    'portables-gaming': 'Gaming Laptop',
    'portables-bureautique': 'Office Laptop',
    'pc-bureau': 'Office PC'
  };

  /* مجموعات الفئات: slug واحد في الرابط يقابل عدة فئات إنجليزية في القاعدة
     مثال: ?cat=stockage يعرض SSD و HDD معاً */
  const CATEGORY_GROUPS = {
    'stockage': ['SSD', 'HDD'],
    'refroidissement': ['CPU Cooler', 'Water Cooling', 'Thermal Paste', 'Case Fan'],
    'peripheriques': ['Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam',
                      'Microphone', 'Printer'],
    'reseau': ['Router', 'WiFi Adapter', 'Network Switch', 'Network Cable'],
    'accessoires': ['Mouse Pad', 'Gaming Chair', 'Gaming Desk', 'Gamepad',
                    'Bag', 'Cable/Adapter'],
    'pc-gamer': ['Gaming PC', 'Office PC'],
    'pc-portables': ['Gaming Laptop', 'Office Laptop']
  };

  /* تصفية المنتجات حسب slug الفئة القادمة من الرابط.
     تُستعمل في كل مكان يتم فيه فلترة المنتجات حسب الفئة. */
  function filterByCategory(catSlug) {
    if (!catSlug) return window.CATALOG.products;

    /* توحيد الأحرف والمسافات لتفادي أي اختلاف في كتابة الرابط */
    const slug = String(catSlug).trim().toLowerCase();

    let matched;

    if (CATEGORY_GROUPS[slug]) {
      /* فئة مجموعة: نقبل كل الفئات الإنجليزية التابعة لها */
      const allowed = CATEGORY_GROUPS[slug];
      matched = window.CATALOG.products.filter((p) => allowed.includes(p.category));
    } else {
      /* فئة مفردة: نترجم الـ slug الفرنسي إلى اسم الفئة في القاعدة،
         وإن لم يوجد في الخريطة نستخدم الـ slug كما هو (مطابقة مباشرة) */
      const dbCategory = CATEGORY_MAP[slug] || catSlug;
      matched = window.CATALOG.products.filter((p) => p.category === dbCategory);
    }

    return matched;
  }

  function baseList() {
    /* فلترة حسب الفئة عبر filterByCategory لترجمة slug الفرنسية من الرابط
       إلى أسماء الفئات الإنجليزية الواردة من الـ API (إصلاح "لا توجد نتائج")،
       مع استبعاد منتجات الـ buildOnly تماماً كما في allProducts */
    if (state.cat) return filterByCategory(state.cat).filter((p) => !p.buildOnly);
    return roundRobin(allProducts);
  }

  /* Case-insensitive matching; Arabic-friendly normalization (tashkeel,
     alef/ta-marbuta/alef-maqsura forms). Every word of the query must match. */
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  }

  function matchesQuery(p, q) {
    const hay = norm(
      [
        p.name,
        p.brand,
        S.brandName(p.brand),
        S.categoryAr(p.category),
        p.category,
        (p.description && (p.description.ar || p.description.en)) || "",
        S.shortSpecs(p),
      ].join(" ")
    );
    return norm(q)
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => hay.includes(token));
  }

  function filtered() {
    let list = baseList();
    if (state.q) list = list.filter((p) => matchesQuery(p, state.q));
    return list;
  }

  function syncURL() {
    try {
      const p = new URLSearchParams();
      if (state.cat) p.set("cat", state.cat);
      if (state.q) p.set("q", state.q);
      const qs = p.toString();
      history.replaceState(null, "", qs ? "?" + qs : location.pathname);
    } catch (e) {
      /* file:// or restricted embeds: URL sync is best-effort only */
    }
  }

  function syncChips() {
    document.querySelectorAll(".cat-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.cat === state.cat);
    });
  }

  function updateHead(total) {
    const def = S.MAIN_CATEGORIES.find((m) => m.slug === state.cat);
    if (state.q) {
      titleEl.textContent = "نتائج البحث";
      subEl.textContent = `عن "${state.q}" — ${total} منتج${total === 1 ? "" : ""} مطابق`;
    } else if (def) {
      titleEl.textContent = def.ar;
      subEl.textContent = `جميع المنتجات ضمن فئة ${def.ar}`;
    } else {
      titleEl.textContent = "جميع المنتجات";
      subEl.textContent = "اختر من تشكيلة واسعة من قطع الحاسوب والملحقات";
    }
    countEl.textContent = total ? `${total} منتج` : "";
  }

  /* Bring the results into view — without this, typing filters an off-screen
     grid and the user sees no feedback at all (the "search is broken" bug). */
  function scrollToResults() {
    const el = document.getElementById("products");
    if (!el) return;
    const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 64);
    window.__lastScrollTo = { y: y, t: Date.now() }; /* debug/verify hook */
    try {
      window.scrollTo({ top: y, behavior: "smooth" });
    } catch (e) {
      window.scrollTo(0, y);
    }
    /* Safety net: if smooth scrolling is unsupported/dropped (some embedded
       webviews and headless engines), force an instant jump so the results
       are always visible. */
    setTimeout(() => {
      if (window.scrollY < 10 && y > 10) window.scrollTo(0, y);
    }, 400);
  }

  /* Renders the grid. Accepts an optional pre-filtered array; when omitted it
     derives the list from the current category + search state. */
  function renderProducts(list) {
    if (!list) list = filtered();
    updateHead(list.length);

    const slice = list.slice(0, state.visible);
    if (!slice.length) {
      gridEl.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <h3>لا توجد نتائج</h3>
          <p>لم نعثر على منتجات مطابقة. جرّب كلمة بحث أخرى أو تصفّح الفئات.</p>
          <a class="btn btn-outline" href="index.html">عرض جميع المنتجات</a>
        </div>`;
    } else {
      gridEl.innerHTML = slice.map((p) => S.cardHTML(p)).join("");
      S.bindAddButtons(gridEl);
    }

    const hasMore = state.visible < list.length;
    if (footEl) footEl.style.display = hasMore ? "flex" : "none";
    syncChips();
    syncURL();
  }

  function renderOffers() {
    if (!offersEl) return;
    const deals = S.products
      .filter((p) => p.salePrice != null && !p.buildOnly)
      .slice(0, 4);
    offersEl.innerHTML = deals.map((p) => S.cardHTML(p)).join("");
    S.bindAddButtons(offersEl);
  }

  /* ------------------------------ Events ------------------------------ */

  /* Single entry point: updates state, re-renders, keeps every search box
     (desktop + mobile) showing the same text, and scrolls the user to the
     results the first time a query appears. */
  let searchTimer = null;
  function applySearch(q) {
    const next = (q || "").trim();
    const startedSearching = !state.q && !!next; /* empty -> non-empty */
    state.q = next;
    state.visible = PAGE_SIZE;
    searchInputs.forEach((i) => {
      if (i.value !== state.q) i.value = state.q;
    });
    renderProducts();
    if (startedSearching) scrollToResults();
  }

  function debounceApplySearch(value) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applySearch(value), 200);
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      state.visible += PAGE_SIZE;
      renderProducts();
      loadMoreBtn.textContent = "عرض المزيد من المنتجات";
    });
  }

  /* Real-time search: fires on every keystroke (debounced ~200ms) */
  searchInputs.forEach((input) => {
    input.addEventListener("input", () => {
      debounceApplySearch(input.value);
    });
  });

  /* Enter / search button: apply immediately and scroll to results */
  document.addEventListener("pcmdz:search", (e) => {
    const q = (e.detail && e.detail.q) || "";
    clearTimeout(searchTimer);
    applySearch(q);
    scrollToResults();
  });

  document.addEventListener("click", (e) => {
    const chip = e.target.closest && e.target.closest(".cat-chip");
    if (!chip || !chip.dataset.cat) return;
    e.preventDefault();
    const slug = chip.dataset.cat;
    state.cat = state.cat === slug ? "" : slug;
    clearTimeout(searchTimer);
    applySearch(""); /* category and search work together: chip resets the query */
    scrollToResults();
  });

  /* Feature icons */
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const key = el.getAttribute("data-icon");
    if (S.I[key]) el.innerHTML = S.I[key];
  });

  renderOffers();
  renderProducts();
  /* deep link index.html?q=... — jump straight to the results */
  if (state.q) scrollToResults();

  /* exposed for console debugging / external tooling */
  window.allProducts = allProducts;
  window.renderProducts = renderProducts;
})();
