/* ============================================================
   PC Master DZ — نقطة الدخول الرئيسية للوحة الإدارية (js/admin.js)
   تربط: تسجيل الدخول، تبويبات القائمة، تحميل البيانات،
   المودالات، الترقيم، البحث، الحذف، والإشعارات (Toasts).
   ============================================================ */

(function () {
  "use strict";

  const API = () => window.AdminAPI;
  const UI = () => window.AdminUI;

  /* ------------------------------ الحالة ------------------------------ */
  const state = {
    tab: "dashboard",                       /* التبويب الحالي */
    loaded: {},                             /* هل تم تحميل كل تبويب؟ */
    orders:  { page: 1, limit: 20, status: "", pages: 1 },
    ordersCache: {},                        /* نسخة محلية من الطلبات المعروضة */
    products:{ page: 1, limit: 20, search: "", pages: 1 },
    productsCache: {},                     /* نسخة محلية من المنتجات المعروضة */
    busy: false                             /* منع تحميل مزدوج */
  };

  let searchTimer = null;                   /* مؤقّت تأخير البحث */

  /* ------------------------------ أدوات ------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function toast(msg, type) { UI().toast(msg, type); }

  function panel(tab) { return $("#tab-" + tab); }

  function showError(tab, err) {
    const root = panel(tab);
    const msg = API().errorMessage(err, "تعذّر تحميل البيانات");
    if (root) {
      root.innerHTML =
        '<div class="empty-state">' +
          '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i>' +
          "<p>" + UI().esc(msg) + "</p>" +
          '<button class="btn btn-outline btn-sm" data-refresh="' + tab + '">' +
            '<i class="fa-solid fa-rotate"></i> إعادة المحاولة</button>' +
        "</div>";
    }
    toast(msg, "error");
  }

  /* ===================================================================
     تحميل بيانات كل تبويب
     =================================================================== */

  /* لوحة القيادة */
  async function loadDashboard(force) {
    if (state.busy && !force) return;
    state.busy = true;
    UI().setLoading(panel("dashboard"));
    try {
      const stats = await API().getStats();
      UI().renderDashboard(stats);
      state.loaded.dashboard = true;
      /* نعرض أيضاً عدّاد الطلبات المعلّقة في القائمة الجانبية */
      updateNavBadge(stats);
    } catch (err) {
      showError("dashboard", err);
    } finally {
      state.busy = false;
    }
  }

  /* الإحصائيات (عرض موسّع) */
  async function loadStats(force) {
    if (state.busy && !force) return;
    state.busy = true;
    UI().setLoading(panel("stats"));
    try {
      const stats = await API().getStats();
      UI().renderStats(stats);
      state.loaded.stats = true;
      updateNavBadge(stats);
    } catch (err) {
      showError("stats", err);
    } finally {
      state.busy = false;
    }
  }

  /* الطلبات */
  async function loadOrders(force) {
    if (state.busy && !force) return;
    state.busy = true;
    UI().setLoading(panel("orders"));
    try {
      const res = await API().getOrders({
        page: state.orders.page,
        limit: state.orders.limit,
        status: state.orders.status
      });
      state.orders.pages = res.pages || 1;
      /* حفظ نسخة محلية (احتياط لعرض التفاصيل إن لم يتوفر endpoint /orders/:id) */
      (res.orders || []).forEach((o) => { state.ordersCache[o._id || o.id] = o; });
      UI().renderOrdersTable(res.orders, res, { status: state.orders.status });
      state.loaded.orders = true;
    } catch (err) {
      showError("orders", err);
    } finally {
      state.busy = false;
    }
  }

  /* المنتجات */
  async function loadProducts(force) {
    if (state.busy && !force) return;
    state.busy = true;
    UI().setLoading(panel("products"));
    try {
      const res = await API().getProducts({
        page: state.products.page,
        limit: state.products.limit,
        search: state.products.search
      });
      state.products.pages = res.pages || 1;
      (res.products || []).forEach((p) => { state.productsCache[p._id || p.id] = p; });
      UI().renderProductsTable(res.products, res, { search: state.products.search });
      state.loaded.products = true;
    } catch (err) {
      showError("products", err);
    } finally {
      state.busy = false;
    }
  }

  /* عدّاد الطلبات المعلّقة في القائمة الجانبية (يدعم الشكلين: كائن أو مصفوفة statusCounts) */
  function updateNavBadge(stats) {
    const badge = $("#nav-orders-count");
    if (!badge || !stats) return;
    let pending = Number(stats.pending != null ? stats.pending :
      (stats.byStatus && stats.byStatus.pending) || 0);
    if (!pending && Array.isArray(stats.statusCounts)) {
      const row = stats.statusCounts.find((r) => r && r._id === "pending");
      pending = row ? Number(row.count) || 0 : 0;
    }
    if (pending > 0) { badge.hidden = false; badge.textContent = String(pending); }
    else { badge.hidden = true; }
  }

  /* ===================================================================
     التنقّل بين التبويبات — يُحمّل بيانات التبويب أول مرة فقط
     =================================================================== */
  function switchTab(tab) {
    state.tab = tab;
    UI().setActiveTab(tab);
    closeSidebar();

    if (tab === "dashboard" && !state.loaded.dashboard) loadDashboard();
    else if (tab === "orders" && !state.loaded.orders) loadOrders();
    else if (tab === "products" && !state.loaded.products) loadProducts();
    else if (tab === "stats" && !state.loaded.stats) loadStats();
  }

  /* إعادة تعيين الحالة بعد الدخول/الخروج */
  function resetState() {
    state.loaded = {};
    state.tab = "dashboard";
    state.orders = { page: 1, limit: 20, status: "", pages: 1 };
    state.products = { page: 1, limit: 20, search: "", pages: 1 };
  }

  /* ===================================================================
     تسجيل الدخول / الخروج
     =================================================================== */
  async function handleLogin(e) {
    e.preventDefault();
    const btn = $("#login-btn");
    const errBox = $("#login-error");
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;

    if (!email || !password) {
      showLoginError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    /* حالة تحميل على الزر */
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span><span class="btn-label">جارٍ الدخول…</span>';
    if (errBox) errBox.hidden = true;

    try {
      const result = await API().login(email, password);
      resetState();
      UI().showDashboard();
      toast("مرحباً بك في لوحة التحكم", "success");
      await loadDashboard(true);
    } catch (err) {
      showLoginError(API().errorMessage(err, "فشل تسجيل الدخول"));
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-label">تسجيل الدخول</span>';
    }
  }

  function showLoginError(msg) {
    const errBox = $("#login-error");
    if (errBox) { errBox.textContent = msg; errBox.hidden = false; }
    toast(msg, "error");
  }

  function handleLogout() {
    API().logout();
    resetState();
    UI().showLogin();
    UI().closeModal();
    toast("تم تسجيل الخروج بنجاح", "success");
  }

  /* معالجة انتهاء الصلاحية (401/403) — تصل من AdminAPI */
  function handleUnauthorized(e) {
    const msg = (e && e.detail && e.detail.message) || "انتهت صلاحية الجلسة — يرجى تسجيل الدخول";
    API().clearToken();                 /* مسح التوكن هنا أيضاً (عملية آمنة ومتكررة) */
    resetState();
    UI().closeModal();
    UI().showLogin();
    toast(msg, "error");
  }

  /* ===================================================================
     فتح تفاصيل الطلب (مودال)
     =================================================================== */
  async function openOrder(id) {
    if (!id) return;
    UI().openModal(
      '<div class="modal-head"><h3>تفاصيل الطلب</h3>' +
      '<button class="modal-close" data-modal-close><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="spinner-wrap"><div class="spinner"></div><span>جارٍ تحميل الطلب…</span></div>'
    );
    try {
      const order = await API().getOrder(id);
      UI().renderOrderModal(order);
    } catch (err) {
      /* بعض إصدارات الـ backend لا توفّر GET /admin/orders/:id —
         نرجع إلى النسخة المحلية من الجدول حتى لا يتعطّل العرض */
      const cached = state.ordersCache[id];
      if (cached) {
        UI().renderOrderModal(cached);
      } else {
        UI().closeModal();
        toast(API().errorMessage(err, "تعذّر تحميل الطلب"), "error");
      }
    }
  }

  /* تحديث حالة الطلب من داخل المودال */
  async function updateOrderStatus(id, status) {
    if (!id || !status) return;
    const btn = $("#order-status-update");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جارٍ الحفظ…'; }
    try {
      await API().updateOrderStatus(id, status);
      toast("تم تحديث حالة الطلب بنجاح", "success");
      UI().closeModal();
      state.loaded.orders = true;
      await loadOrders(true);          /* إعادة تحميل الجدول بالحالة الجديدة */
    } catch (err) {
      toast(API().errorMessage(err, "تعذّر تحديث حالة الطلب"), "error");
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> تحديث'; }
    }
  }

  /* ===================================================================
     المنتجات: إضافة / تعديل / حذف
     =================================================================== */
  function openProductForm(product) {
    UI().renderProductModal(product || null);
  }

  async function saveProduct(e) {
    e.preventDefault();
    const form = $("#product-form");
    if (!form) return;
    const id = form.getAttribute("data-product-id");
    const isEdit = !!id;

    /* تجميع البيانات (يرجّع null مع رسالة خطأ عند التحقق الفاشل) */
    const fd = UI().collectProductForm();
    if (!fd) return;

    const btn = $("#product-save-btn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جارٍ الحفظ…'; }

    try {
      let result;
      if (isEdit) result = await API().updateProduct(id, fd);
      else result = await API().createProduct(fd);

      /* إن رُفعت صور لكنها فشلت (Cloudinary…) نُنبّه ولا نُفشل العملية */
      if (result && result._warning) toast(result._warning, "error");
      else toast(isEdit ? "تم تعديل المنتج بنجاح" : "تمت إضافة المنتج بنجاح", "success");

      UI().closeModal();
      await loadProducts(true);
    } catch (err) {
      toast(API().errorMessage(err, "تعذّر حفظ المنتج"), "error");
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ'; }
    }
  }

  async function deleteProduct(id) {
    if (!id) return;
    const ok = await UI().confirm("هل تريد فعلاً حذف هذا المنتج؟ لا يمكن التراجع عن العملية.");
    if (!ok) return;
    try {
      await API().deleteProduct(id);
      toast("تم حذف المنتج", "success");
      await loadProducts(true);
    } catch (err) {
      toast(API().errorMessage(err, "تعذّر حذف المنتج"), "error");
    }
  }

  /* ===================================================================
     القائمة الجانبية للجوال
     =================================================================== */
  function toggleSidebar() {
    const shell = $("#dashboard");
    const backdrop = $("#sidebar-backdrop");
    if (!shell) return;
    const open = shell.classList.toggle("sidebar-open");
    if (backdrop) backdrop.hidden = !open;
  }

  function closeSidebar() {
    const shell = $("#dashboard");
    const backdrop = $("#sidebar-backdrop");
    if (shell) shell.classList.remove("sidebar-open");
    if (backdrop) backdrop.hidden = true;
  }

  /* ===================================================================
     ربط الأحداث (Delegation — تعمل مع العناصر المُعاد رسمها ديناميكياً)
     =================================================================== */
  function bindEvents() {

    /* ---------- تسجيل الدخول والخروج ---------- */
    const loginForm = $("#login-form");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    const logoutBtn = $("#logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    /* ---------- القائمة الجانبية ---------- */
    $$(".nav-item[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
    });

    const toggle = $("#sidebar-toggle");
    if (toggle) toggle.addEventListener("click", toggleSidebar);
    const backdrop = $("#sidebar-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    /* ---------- إغلاق المودال (بالنقر على الخلفية أو زر X) ---------- */
    const modalRoot = $("#modal-root");
    if (modalRoot) {
      modalRoot.addEventListener("click", (e) => {
        if (e.target === modalRoot) UI().closeModal();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { UI().closeModal(); closeSidebar(); }
    });

    /* ---------- أحداث موحّدة على كامل المستند ---------- */
    document.addEventListener("click", (e) => {
      const target = e.target;

      /* زر الإغلاق داخل المودال */
      const closeBtn = target.closest("[data-modal-close]");
      if (closeBtn) { UI().closeModal(); return; }

      /* زر تحديث/إعادة المحاولة */
      const refresh = target.closest("[data-refresh]");
      if (refresh) {
        const tab = refresh.getAttribute("data-refresh");
        if (tab === "dashboard") loadDashboard(true);
        else if (tab === "orders") loadOrders(true);
        else if (tab === "products") loadProducts(true);
        else if (tab === "stats") loadStats(true);
        return;
      }

      /* أزرار الترقيم */
      const pageBtn = target.closest(".page-btn[data-page]");
      if (pageBtn && !pageBtn.disabled) {
        const scope = pageBtn.getAttribute("data-scope");
        const page = Number(pageBtn.getAttribute("data-page"));
        if (scope === "orders") { state.orders.page = page; loadOrders(true); }
        else if (scope === "products") { state.products.page = page; loadProducts(true); }
        return;
      }

      /* زر تحديث حالة الطلب داخل المودال (له data-order-id أيضاً — يُفحص أولاً) */
      const statusBtn = target.closest("#order-status-update");
      if (statusBtn) {
        const sel = $("#order-status-select");
        updateOrderStatus(statusBtn.getAttribute("data-order-id"), sel ? sel.value : "");
        return;
      }

      /* صف الطلب / زر العرض → مودال التفاصيل */
      const orderEl = target.closest("[data-order-id]");
      if (orderEl && (orderEl.classList.contains("order-row") || orderEl.tagName === "BUTTON")) {
        openOrder(orderEl.getAttribute("data-order-id"));
        return;
      }

      /* زر إضافة منتج جديد */
      if (target.closest("#add-product-btn")) { openProductForm(null); return; }

      /* أزرار تعديل / حذف المنتج */
      const actionBtn = target.closest("[data-action][data-product-id]");
      if (actionBtn) {
        const id = actionBtn.getAttribute("data-product-id");
        const action = actionBtn.getAttribute("data-action");
        if (action === "delete") { deleteProduct(id); return; }
        if (action === "edit") { editProduct(id); return; }
      }
    });

    /* ---------- تصفية الطلبات بالحالة ---------- */
    document.addEventListener("change", (e) => {
      if (e.target && e.target.id === "orders-status-filter") {
        state.orders.status = e.target.value;
        state.orders.page = 1;
        loadOrders(true);
      }
    });

    /* ---------- بحث المنتجات (مع تأخير 350ms) ---------- */
    document.addEventListener("input", (e) => {
      if (e.target && e.target.id === "products-search") {
        clearTimeout(searchTimer);
        const value = e.target.value;
        searchTimer = setTimeout(() => {
          state.products.search = value.trim();
          state.products.page = 1;
          loadProducts(true);
        }, 350);
      }
    });

    /* ---------- حفظ نموذج المنتج ---------- */
    document.addEventListener("submit", (e) => {
      if (e.target && e.target.id === "product-form") saveProduct(e);
    });

    /* ---------- انتهاء الصلاحية (401/403) ---------- */
    window.addEventListener("admin:unauthorized", handleUnauthorized);
  }

  /* جلب المنتج من النسخة المحلية (أو من الـ API عبر صفحاته) ثم فتح نموذج التعديل */
  async function editProduct(id) {
    /* أولاً: من الجدول المعروض حالياً */
    const cached = state.productsCache[id];
    if (cached) { UI().renderProductModal(cached); return; }

    UI().openModal(
      '<div class="modal-head"><h3>تعديل المنتج</h3>' +
      '<button class="modal-close" data-modal-close><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="spinner-wrap"><div class="spinner"></div><span>جارٍ تحميل المنتج…</span></div>'
    );
    try {
      /* لم يُعثر عليه في الصفحة الحالية ← نتفقد بقية الصفحات */
      let found = null;
      const first = await API().getProducts({ page: 1, limit: 100, search: "" });
      (first.products || []).forEach((p) => { state.productsCache[p._id || p.id] = p; });
      found = (first.products || []).find((p) => String(p._id || p.id) === String(id));

      for (let page = 2; !found && page <= (first.pages || 1); page++) {
        const res = await API().getProducts({ page: page, limit: 100, search: "" });
        (res.products || []).forEach((p) => { state.productsCache[p._id || p.id] = p; });
        found = (res.products || []).find((p) => String(p._id || p.id) === String(id));
      }

      if (!found) throw new Error("لم يتم العثور على المنتج");
      UI().renderProductModal(found);
    } catch (err) {
      UI().closeModal();
      toast(API().errorMessage(err, "تعذّر تحميل المنتج"), "error");
    }
  }

  /* ===================================================================
     الإقلاع
     =================================================================== */
  function init() {
    bindEvents();

    if (API().isLoggedIn()) {
      UI().showDashboard();
      loadDashboard(true);
    } else {
      UI().showLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
