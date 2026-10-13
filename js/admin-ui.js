/* ============================================================
   PC Master DZ — واجهة لوحة التحكم (js/admin-ui.js)
   تُعرَّف كـ window.AdminUI: عرض الشاشات، الجداول، المودالات، التوست.
   كل النصوص عربية + اتجاه RTL. لا تلمس أي ملفات المتجر.
   ============================================================ */

(function () {
  "use strict";

  /* ------------------------------ أدوات مساعدة ------------------------------ */
  const $ = (sel, root) => (root || document).querySelector(sel);

  /* حماية من XSS: تحويل كل النصوص قبل إدراجها في HTML */
  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  /* تنسيق الأرقام بالفصل الأفقي (125 000 دج) */
  function money(n) {
    const v = Math.round(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + "\u00A0دج";
  }

  /* تنسيق التاريخ والوقت إلى صيغة مقروءة */
  function date(value) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      const pad = (x) => String(x).padStart(2, "0");
      return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) +
        " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    } catch (e) { return String(value); }
  }

  function num(v) { return Number(v) || 0; }

  /* ------------------------------ حالات الطلبات ------------------------------ */
  const STATUS = {
    pending:   { label: "قيد المعالجة", cls: "st-pending" },
    paid:      { label: "مدفوع",        cls: "st-paid" },
    shipped:   { label: "تم الشحن",     cls: "st-shipped" },
    delivered: { label: "تم التسليم",   cls: "st-delivered" },
    cancelled: { label: "ملغى",         cls: "st-cancelled" }
  };

  function statusInfo(key) {
    return STATUS[key] || { label: key || "غير معروف", cls: "st-unknown" };
  }

  function statusBadge(key) {
    const s = statusInfo(key);
    return '<span class="badge ' + s.cls + '">' + esc(s.label) + "</span>";
  }

  /* خيارات القائمة المنسدلة للحالات */
  function statusOptions(selected) {
    let html = '<option value="">كل الحالات</option>';
    Object.keys(STATUS).forEach((k) => {
      html += '<option value="' + k + '"' + (k === selected ? " selected" : "") + ">" +
        esc(STATUS[k].label) + "</option>";
    });
    return html;
  }

  /* ------------------------------ الفئات ------------------------------ */
  const CATEGORY_LABELS = {
    "processeurs": "المعالجات",
    "cartes-graphiques": "كروت الشاشة",
    "memoire-ram": "الذاكرة RAM",
    "stockage": "التخزين",
    "ssd": "أقراص SSD",
    "disques-durs": "أقراص HDD",
    "cartes-meres": "اللوحات الأم",
    "alimentations": "التغذية PSU",
    "boitiers": "الصناديق",
    "refroidissement": "التبريد",
    "ventirads": "المبرّدات الهوائية",
    "watercooling": "التبريد المائي",
    "ventilateurs": "الرواح",
    "pates-thermiques": "معجون حراري",
    "ecrans": "الشاشات",
    "peripheriques": "الملحقات",
    "claviers": "لوحات المفاتيح",
    "souris": "الماوس",
    "casques": "السماعات",
    "webcams": "كاميرات الويب",
    "microphones": "الميكروفونات",
    "imprimantes": "الطابعات",
    "laptops": "حواسيب محمولة",
    "ordinateurs-portables": "حواسيب محمولة"
  };

  function categoryLabel(slug) { return CATEGORY_LABELS[slug] || slug || "—"; }

  function categoryOptions(selected) {
    let html = '<option value="">اختر الفئة…</option>';
    Object.keys(CATEGORY_LABELS).forEach((slug) => {
      html += '<option value="' + esc(slug) + '"' + (slug === selected ? " selected" : "") + ">" +
        esc(CATEGORY_LABELS[slug]) + " (" + esc(slug) + ")</option>";
    });
    /* فئة غير معروفة موجودة في قاعدة البيانات: نُضيفها كي لا تضيع */
    if (selected && !CATEGORY_LABELS[selected]) {
      html += '<option value="' + esc(selected) + '" selected>' + esc(selected) + "</option>";
    }
    return html;
  }

  /* ------------------------------ عناصر مشتركة ------------------------------ */
  const SPINNER_HTML =
    '<div class="spinner-wrap"><div class="spinner"></div><span>جارٍ التحميل…</span></div>';

  function emptyState(icon, text) {
    return '<div class="empty-state"><i class="fa-solid ' + icon + '"></i><p>' + esc(text) + "</p></div>";
  }

  /* عرض حالة تحميل داخل حاوية */
  function setLoading(container) {
    if (container) container.innerHTML = SPINNER_HTML;
  }

  /* شريط ترقيم موحّد — scope يحدد لنطاق أي جدول نُسب الأزرار (orders/products) */
  function paginationHTML(scope, page, pages, total) {
    if (pages <= 1) {
      return '<div class="pagination"><span class="page-info">إجمالي ' + num(total) + " عنصر</span></div>";
    }
    let html = '<div class="pagination">';
    html += '<button class="page-btn" data-scope="' + scope + '" data-page="' + (page - 1) + '"' +
      (page <= 1 ? " disabled" : "") + ' aria-label="السابق">‹</button>';

    /* نعرض نافذة صغيرة حول الصفحة الحالية */
    let start = Math.max(1, page - 2);
    let end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);

    if (start > 1) html += '<span class="page-info">…</span>';
    for (let i = start; i <= end; i++) {
      html += '<button class="page-btn' + (i === page ? " active" : "") +
        '" data-scope="' + scope + '" data-page="' + i + '">' + i + "</button>";
    }
    if (end < pages) html += '<span class="page-info">…</span>';

    html += '<button class="page-btn" data-scope="' + scope + '" data-page="' + (page + 1) + '"' +
      (page >= pages ? " disabled" : "") + ' aria-label="التالي">›</button>';
    html += '<span class="page-info">صفحة ' + page + " من " + pages + " · " + num(total) + " عنصر</span>";
    html += "</div>";
    return html;
  }

  /* ===================================================================
     تطبيع استجابة /admin/stats (يدعم أسماء حقول مختلفة)
     =================================================================== */
  function normStats(raw) {
    const s = (raw && raw.data) ? raw.data : (raw || {});

    /* بعض الـ backends تُعيد الحالات كائن، وبعضها مصفوفة [{_id:'pending',count:2}] */
    let by = s.byStatus || s.statusBreakdown || s.ordersByStatus || s.status || {};
    if (Array.isArray(s.statusCounts)) {
      by = Object.assign({}, by);
      s.statusCounts.forEach((row) => {
        if (row && row._id) by[row._id] = row.count;
      });
    } else if (Array.isArray(by)) {
      const obj = {};
      by.forEach((row) => { if (row && row._id) obj[row._id] = row.count; });
      by = obj;
    }

    const topRaw = s.topProducts || s.topProductsBySales || s.bestSellers ||
      s.topSelling || s.top || [];

    return {
      totalSales: num(s.totalSales != null ? s.totalSales :
        (s.revenue != null ? s.revenue : (s.totalRevenue != null ? s.totalRevenue : s.sales))),
      ordersCount: num(s.ordersCount != null ? s.ordersCount :
        (s.totalOrders != null ? s.totalOrders : (Array.isArray(s.orders) ? s.orders.length : s.orders))),
      pending:   num(s.pending != null ? s.pending : by.pending),
      paid:      num(s.paid != null ? s.paid : by.paid),
      shipped:   num(s.shipped != null ? s.shipped : by.shipped),
      delivered: num(s.delivered != null ? s.delivered : by.delivered),
      cancelled: num(s.cancelled != null ? s.cancelled : by.cancelled),
      productsCount: num(s.productsCount != null ? s.productsCount : (s.totalProducts != null ? s.totalProducts : s.products)),
      customersCount: num(s.customersCount != null ? s.customersCount : (s.usersCount != null ? s.usersCount : s.customers)),
      averageOrder: num(s.averageOrder != null ? s.averageOrder : (s.avgOrderValue != null ? s.avgOrderValue : s.averageOrderValue)),
      topProducts: Array.isArray(topRaw) ? topRaw : []
    };
  }

  /* ===================================================================
     إظهار شاشة الدخول / لوحة التحكم
     =================================================================== */
  function showLogin() {
    const login = $("#login-screen");
    const dash = $("#dashboard");
    if (login) login.hidden = false;
    if (dash) dash.hidden = true;
    /* إعادة تعيين النموذج */
    const form = $("#login-form");
    if (form) form.reset();
    const err = $("#login-error");
    if (err) { err.hidden = true; err.textContent = ""; }
    document.title = "تسجيل الدخول | PC Master DZ Admin";
  }

  function showDashboard() {
    const login = $("#login-screen");
    const dash = $("#dashboard");
    if (login) login.hidden = true;
    if (dash) dash.hidden = false;
    /* عرض بريد المشرف إن عُرف */
    const chip = $("#admin-email");
    if (chip) {
      const user = window.AdminAPI && window.AdminAPI.getUser ? window.AdminAPI.getUser() : null;
      const email = (user && (user.email || user.mail)) || "المشرف";
      chip.innerHTML = '<i class="fa-regular fa-circle-user"></i> ' + esc(email);
    }
    document.title = "لوحة التحكم | PC Master DZ Admin";
  }

  /* تفعيل تبويب معيّن وإخفاء البقية */
  function setActiveTab(tab) {
    document.querySelectorAll(".nav-item[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tab);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === "tab-" + tab);
    });
  }

  /* ===================================================================
     لوحة القيادة — renderDashboard(stats)
     =================================================================== */
  function renderDashboard(rawStats) {
    const root = $("#tab-dashboard");
    if (!root) return;
    const s = normStats(rawStats);

    const cards =
      '<div class="cards-grid">' +
        card("c-sales", "fa-solid fa-sack-dollar", money(s.totalSales), "إجمالي المبيعات") +
        card("c-orders", "fa-solid fa-box-open", String(s.ordersCount), "عدد الطلبات") +
        card("c-pending", "fa-solid fa-hourglass-half", String(s.pending), "قيد المعالجة") +
        card("c-shipped", "fa-solid fa-truck-fast", String(s.shipped), "تم الشحن") +
        card("c-delivered", "fa-solid fa-circle-check", String(s.delivered), "تم التسليم") +
        card("c-cancelled", "fa-solid fa-ban", String(s.cancelled), "ملغاة") +
      "</div>";

    /* جدول أفضل 5 منتجات */
    let topRows = "";
    if (s.topProducts.length) {
      s.topProducts.slice(0, 5).forEach((t, i) => {
        const name = t.name || t.title ||
          (t.product && (t.product.name || t.product.title)) ||
          (t._id ? String(t._id).slice(0, 10) : "منتج " + (i + 1));
        const qty = num(t.sold != null ? t.sold : (t.totalSold != null ? t.totalSold :
          (t.quantity != null ? t.quantity : (t.count != null ? t.count : t.qty))));
        const revenue = t.revenue != null ? t.revenue :
          (t.totalRevenue != null ? t.totalRevenue :
          (t.totalSales != null ? t.totalSales : (t.total != null ? t.total : null)));
        topRows +=
          "<tr>" +
            '<td class="num">' + (i + 1) + "</td>" +
            '<td class="cell-name">' + esc(name) + "</td>" +
            '<td class="num">' + qty + "</td>" +
            '<td class="num">' + (revenue != null ? money(revenue) : "—") + "</td>" +
          "</tr>";
      });
    }

    const topPanel =
      '<div class="panel">' +
        '<div class="panel-head"><h3><i class="fa-solid fa-trophy" style="color:var(--warning)"></i> أفضل 5 منتجات مبيعاً</h3></div>' +
        (topRows
          ? '<div class="table-wrap"><table class="data-table">' +
              "<thead><tr><th>#</th><th>المنتج</th><th>الكمية المباعة</th><th>الإيراد</th></tr></thead>" +
              "<tbody>" + topRows + "</tbody></table></div>"
          : emptyState("fa-box-open", "لا توجد بيانات مبيعات بعد")) +
      "</div>";

    root.innerHTML =
      '<div class="page-head">' +
        "<div><h2>لوحة القيادة</h2><p>نظرة سريعة على أداء المتجر اليوم</p></div>" +
        '<button class="btn btn-outline btn-sm" data-refresh="dashboard"><i class="fa-solid fa-rotate"></i> تحديث</button>' +
      "</div>" +
      cards + topPanel;

    function card(cls, icon, value, label) {
      return '<div class="stat-card ' + cls + '">' +
        '<span class="stat-icon"><i class="' + icon + '"></i></span>' +
        '<div class="value">' + value + "</div>" +
        '<div class="label">' + esc(label) + "</div>" +
      "</div>";
    }
  }

  /* ===================================================================
     تبويب الإحصائيات — renderStats(stats) (عرض موسّع)
     =================================================================== */
  function renderStats(rawStats) {
    const root = $("#tab-stats");
    if (!root) return;
    const s = normStats(rawStats);

    const totalStatus = s.pending + s.paid + s.shipped + s.delivered + s.cancelled || 1;
    const bars = [
      ["pending", s.pending, "#ffc857"],
      ["paid", s.paid, "#4d9bff"],
      ["shipped", s.shipped, "#a77bff"],
      ["delivered", s.delivered, "#2ee6a6"],
      ["cancelled", s.cancelled, "#ff4d6d"]
    ].map(([key, value, color]) => {
      const pct = Math.round((value / totalStatus) * 100);
      return '<div style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">' +
          "<span>" + esc(statusInfo(key).label) + "</span>" +
          '<span class="muted num">' + value + " (" + pct + "%)</span>" +
        "</div>" +
        '<div style="height:9px;background:var(--bg-deep);border-radius:99px;overflow:hidden;border:1px solid var(--border)">' +
          '<div style="height:100%;width:' + pct + "%;background:" + color + ';border-radius:99px"></div>' +
        "</div>" +
      "</div>";
    }).join("");

    const avgOrder = s.averageOrder ||
      (s.ordersCount ? Math.round(s.totalSales / s.ordersCount) : 0);

    root.innerHTML =
      '<div class="page-head">' +
        "<div><h2>الإحصائيات</h2><p>مؤشرات المبيعات وتوزيع حالات الطلبات</p></div>" +
        '<button class="btn btn-outline btn-sm" data-refresh="stats"><i class="fa-solid fa-rotate"></i> تحديث</button>' +
      "</div>" +

      '<div class="cards-grid">' +
        '<div class="stat-card c-sales"><span class="stat-icon"><i class="fa-solid fa-sack-dollar"></i></span>' +
          '<div class="value">' + money(s.totalSales) + '</div><div class="label">إجمالي المبيعات</div></div>' +
        '<div class="stat-card c-orders"><span class="stat-icon"><i class="fa-solid fa-receipt"></i></span>' +
          '<div class="value">' + num(s.ordersCount) + '</div><div class="label">عدد الطلبات</div></div>' +
        '<div class="stat-card c-sales"><span class="stat-icon"><i class="fa-solid fa-calculator"></i></span>' +
          '<div class="value">' + money(avgOrder) + '</div><div class="label">متوسط قيمة الطلب</div></div>' +
        '<div class="stat-card c-delivered"><span class="stat-icon"><i class="fa-solid fa-layer-group"></i></span>' +
          '<div class="value">' + num(s.productsCount) + '</div><div class="label">عدد المنتجات</div></div>' +
        '<div class="stat-card c-shipped"><span class="stat-icon"><i class="fa-solid fa-users"></i></span>' +
          '<div class="value">' + num(s.customersCount) + '</div><div class="label">عدد الزبائن</div></div>' +
      "</div>" +

      '<div class="panel">' +
        '<div class="panel-head"><h3><i class="fa-solid fa-chart-pie" style="color:var(--neon)"></i> توزيع حالات الطلبات</h3></div>' +
        '<div class="panel-body">' + (bars || '<p class="muted">لا توجد بيانات</p>') + "</div>" +
      "</div>";
  }

  /* ===================================================================
     جدول الطلبات — renderOrdersTable(orders, {page, pages, total})
     =================================================================== */
  function renderOrdersTable(orders, meta, filters) {
    const root = $("#tab-orders");
    if (!root) return;
    const m = meta || {};
    const currentStatus = (filters && filters.status) || "";

    let rows = "";
    (orders || []).forEach((o) => {
      const customer =
        (o.user && (o.user.name || o.user.fullName)) ||
        (o.guestInfo && (o.guestInfo.name || o.guestInfo.fullName)) ||
        o.customerName || "زبون";
      const phone =
        (o.guestInfo && o.guestInfo.phone) ||
        (o.shippingAddress && o.shippingAddress.phone) ||
        (o.user && o.user.phone) || "—";
      const total = o.total != null ? o.total : (o.totalAmount != null ? o.totalAmount : o.amount);
      const status = o.status || "pending";
      const number = o.orderNumber || o.number || ("#" + String(o._id || "").slice(-6));

      rows +=
        '<tr class="clickable order-row" data-order-id="' + esc(o._id || o.id || "") + '">' +
          '<td class="cell-name num">' + esc(number) + "</td>" +
          "<td>" + esc(customer) + "</td>" +
          '<td class="num">' + esc(phone) + "</td>" +
          '<td class="num">' + money(total) + "</td>" +
          "<td>" + statusBadge(status) + "</td>" +
          '<td class="num small">' + date(o.createdAt || o.created) + "</td>" +
          '<td class="actions-cell"><button class="btn btn-outline btn-sm" data-order-id="' +
            esc(o._id || o.id || "") + '"><i class="fa-regular fa-eye"></i> عرض</button></td>' +
        "</tr>";
    });

    root.innerHTML =
      '<div class="page-head">' +
        "<div><h2>الطلبات</h2><p>إدارة طلبات الزبائن وتغيير حالتها</p></div>" +
        '<button class="btn btn-outline btn-sm" data-refresh="orders"><i class="fa-solid fa-rotate"></i> تحديث</button>' +
      "</div>" +

      '<div class="panel">' +
        '<div class="panel-head">' +
          "<h3>قائمة الطلبات</h3>" +
          '<div class="toolbar">' +
            '<label class="search-box" style="min-width:auto"><i class="fa-solid fa-filter"></i>' +
              '<select id="orders-status-filter" style="padding-inline-start:34px">' +
                statusOptions(currentStatus) +
              "</select>" +
            "</label>" +
            '<span class="small muted">الإجمالي: ' + num(m.total) + "</span>" +
          "</div>" +
        "</div>" +
        (rows
          ? '<div class="table-wrap"><table class="data-table">' +
              "<thead><tr>" +
                "<th>رقم الطلب</th><th>الزبون</th><th>الهاتف</th><th>المجموع</th>" +
                "<th>الحالة</th><th>التاريخ</th><th>إجراءات</th>" +
              "</tr></thead><tbody>" + rows + "</tbody></table></div>"
          : emptyState("fa-box-open", "لا توجد طلبات مطابقة")) +
        paginationHTML("orders", m.page || 1, m.pages || 1, m.total || 0) +
      "</div>";
  }

  /* ===================================================================
     مودال تفاصيل الطلب — renderOrderModal(order)
     =================================================================== */
  function renderOrderModal(order) {
    if (!order) return;
    const guest = order.guestInfo || {};
    const user = order.user && typeof order.user === "object" ? order.user : {};
    const addr = (order.shippingAddress && typeof order.shippingAddress === "object")
      ? order.shippingAddress
      : {};

    const customerName = user.name || user.fullName || guest.name || guest.fullName ||
      addr.fullName || addr.name || order.customerName || "زبون";
    const email = user.email || guest.email || "—";
    const phone = guest.phone || addr.phone || user.phone || order.phone || "—";

    /* العنوان: قد يكون كائناً أو نصاً واحداً */
    let addressText = "";
    if (typeof order.shippingAddress === "string") addressText = order.shippingAddress;
    else if (typeof order.address === "string") addressText = order.address;
    else {
      addressText = [
        addr.address || addr.street || addr.line1 || addr.details,
        addr.commune || addr.city,
        addr.wilaya || addr.state
      ].filter(Boolean).join("، ");
    }

    const items = order.items || order.products || order.lines || [];
    let itemRows = "";
    let computedSubtotal = 0;

    items.forEach((it) => {
      const p = it.product && typeof it.product === "object" ? it.product : {};
      const name = it.name || p.name || it.title || "منتج";
      const price = num(it.price != null ? it.price : it.unitPrice);
      const qty = num(it.quantity != null ? it.quantity : it.qty);
      const subtotal = it.subtotal != null ? num(it.subtotal) : price * qty;
      computedSubtotal += subtotal;
      itemRows +=
        "<tr>" +
          '<td class="cell-name">' + esc(name) + "</td>" +
          '<td class="num">' + money(price) + "</td>" +
          '<td class="num">' + qty + "</td>" +
          '<td class="num">' + money(subtotal) + "</td>" +
        "</tr>";
    });

    const shipping = num(order.shipping != null ? order.shipping :
      (order.shippingCost != null ? order.shippingCost : order.deliveryFee));
    const subtotal = order.subtotal != null ? num(order.subtotal) : computedSubtotal;
    const total = order.total != null ? num(order.total) :
      (order.totalAmount != null ? num(order.totalAmount) : subtotal + shipping);

    const status = order.status || "pending";
    const number = order.orderNumber || order.number || ("#" + String(order._id || "").slice(-6));

    const html =
      '<div class="modal-head">' +
        "<h3>تفاصيل الطلب <span class=\"num\" style=\"color:var(--neon)\">" + esc(number) + "</span></h3>" +
        '<button class="modal-close" data-modal-close aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>' +
      "</div>" +

      '<div class="modal-body">' +
        '<div class="info-grid">' +
          infoBox("الزبون", customerName) +
          infoBox("البريد الإلكتروني", email) +
          infoBox("الهاتف", phone) +
          infoBox("تاريخ الطلب", date(order.createdAt || order.created)) +
          infoBox("الحالة", statusBadge(status)) +
          infoBox("طريقة الدفع", order.paymentMethod || "—") +
        "</div>" +

        '<div class="info-grid">' +
          infoBox("عنوان التوصيل", addressText || "—") +
        "</div>" +

        '<div class="table-wrap"><table class="data-table">' +
          "<thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>المجموع</th></tr></thead>" +
          "<tbody>" + (itemRows || '<tr><td colspan="4" class="muted">لا توجد منتجات في هذا الطلب</td></tr>') + "</tbody>" +
        "</table></div>" +

        '<div class="totals">' +
          '<div class="row"><span>المجموع الفرعي</span><span class="num">' + money(subtotal) + "</span></div>" +
          '<div class="row"><span>الشحن</span><span class="num">' + money(shipping) + "</span></div>" +
          '<div class="row grand"><span>الإجمالي</span><span class="num">' + money(total) + "</span></div>" +
        "</div>" +

        '<div class="panel" style="margin-top:18px;margin-bottom:0">' +
          '<div class="panel-head"><h3>تحديث حالة الطلب</h3></div>' +
          '<div class="panel-body toolbar">' +
            '<select id="order-status-select">' +
              Object.keys(STATUS).map((k) =>
                '<option value="' + k + '"' + (k === status ? " selected" : "") + ">" +
                STATUS[k].label + "</option>").join("") +
            "</select>" +
            '<button class="btn btn-primary btn-sm" id="order-status-update" data-order-id="' +
              esc(order._id || order.id || "") + '"><i class="fa-solid fa-check"></i> تحديث</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    openModal(html);

    function infoBox(k, v) {
      return '<div class="info-box"><div class="k">' + esc(k) + '</div><div class="v">' + v + "</div></div>";
    }
  }

  /* ===================================================================
     جدول المنتجات — renderProductsTable(products, {page, pages, total})
     =================================================================== */
  function renderProductsTable(products, meta, filters) {
    const root = $("#tab-products");
    if (!root) return;
    const m = meta || {};
    const search = (filters && filters.search) || "";

    let rows = "";
    (products || []).forEach((p) => {
      const img = (Array.isArray(p.images) && p.images[0]) || p.image ||
        "images/products/placeholder.webp";
      const price = p.salePrice != null ? p.salePrice : p.price;
      const stock = num(p.stock);
      const stockCls = stock <= 0 ? "stock-out" : (stock <= 5 ? "stock-low" : "stock-ok");

      rows +=
        '<tr data-product-id="' + esc(p._id || p.id || "") + '">' +
          '<td><img class="cell-img" src="' + esc(img) + '" alt="" loading="lazy" ' +
            'onerror="this.style.opacity=.35"></td>' +
          '<td><div class="cell-name">' + esc(p.name) + "</div>" +
            '<div class="cell-sub">' + esc(p.brand || "") + "</div></td>" +
          "<td>" + esc(categoryLabel(p.category)) + "</td>" +
          '<td class="num">' + money(price) + "</td>" +
          '<td class="num ' + stockCls + '">' + stock + "</td>" +
          '<td class="actions-cell">' +
            '<button class="btn btn-outline btn-sm" data-action="edit" data-product-id="' + esc(p._id || p.id || "") + '">' +
              '<i class="fa-solid fa-pen"></i> تعديل</button>' +
            '<button class="btn btn-danger btn-sm" data-action="delete" data-product-id="' + esc(p._id || p.id || "") + '">' +
              '<i class="fa-solid fa-trash"></i> حذف</button>' +
          "</td>" +
        "</tr>";
    });

    root.innerHTML =
      '<div class="page-head">' +
        "<div><h2>المنتجات</h2><p>إضافة وتعديل وحذف منتجات المتجر</p></div>" +
        '<button class="btn btn-primary btn-sm" id="add-product-btn">' +
          '<i class="fa-solid fa-plus"></i> إضافة منتج جديد</button>' +
      "</div>" +

      '<div class="panel">' +
        '<div class="panel-head">' +
          "<h3>قائمة المنتجات</h3>" +
          '<div class="toolbar">' +
            '<label class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
              '<input type="search" id="products-search" placeholder="ابحث عن منتج…" value="' + esc(search) + '">' +
            "</label>" +
            '<span class="small muted">الإجمالي: ' + num(m.total) + "</span>" +
          "</div>" +
        "</div>" +
        (rows
          ? '<div class="table-wrap"><table class="data-table">' +
              "<thead><tr><th>الصورة</th><th>الاسم</th><th>الفئة</th><th>السعر</th><th>المخزون</th><th>إجراءات</th></tr></thead>" +
              "<tbody>" + rows + "</tbody></table></div>"
          : emptyState("fa-memory", "لا توجد منتجات مطابقة")) +
        paginationHTML("products", m.page || 1, m.pages || 1, m.total || 0) +
      "</div>";
  }

  /* ===================================================================
     مودال المنتج (إضافة/تعديل) — renderProductModal(product|null)
     =================================================================== */
  function renderProductModal(product) {
    const p = product || null;
    const isEdit = !!p;

    /* الصور الحالية (عند التعديل) */
    let existing = "";
    if (isEdit && Array.isArray(p.images) && p.images.length) {
      existing = '<div class="images-preview" id="existing-images">' +
        p.images.map((src) =>
          '<img src="' + esc(src) + '" alt="" onerror="this.style.opacity=.35">').join("") +
        "</div>";
    }

    const desc = (p && p.description) || {};
    const specsValue = p && p.specs ? safeStringify(p.specs) : "";

    const html =
      '<div class="modal-head">' +
        "<h3>" + (isEdit ? "تعديل المنتج" : "إضافة منتج جديد") + "</h3>" +
        '<button class="modal-close" data-modal-close aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>' +
      "</div>" +

      '<form id="product-form" data-product-id="' + esc(isEdit ? (p._id || p.id || "") : "") + '">' +
        '<div class="modal-body">' +
          '<div class="form-grid">' +
            '<label class="field"><span>اسم المنتج *</span>' +
              '<input type="text" name="name" value="' + esc(p && p.name ? p.name : "") + '" required></label>' +

            '<label class="field"><span>الماركة</span>' +
              '<input type="text" name="brand" value="' + esc(p && p.brand ? p.brand : "") + '" placeholder="ASUS, AMD, Corsair…"></label>' +

            '<label class="field"><span>الفئة</span>' +
              '<select name="category">' + categoryOptions(p && p.category ? p.category : "") + "</select></label>" +

            '<label class="field"><span>السعر (دج) *</span>' +
              '<input type="number" name="price" min="0" step="1" value="' + esc(p && p.price != null ? p.price : "") + '" required></label>' +

            '<label class="field"><span>سعر التخفيض (دج)</span>' +
              '<input type="number" name="salePrice" min="0" step="1" value="' + esc(p && p.salePrice != null ? p.salePrice : "") + '" placeholder="اتركه فارغاً إن لا يوجد"></label>' +

            '<label class="field"><span>المخزون</span>' +
              '<input type="number" name="stock" min="0" step="1" value="' + esc(p && p.stock != null ? p.stock : 0) + '"></label>' +

            '<label class="field full"><span>الوصف — العربية</span>' +
              '<textarea name="description[ar]" rows="3">' + esc(desc.ar || "") + "</textarea></label>" +

            '<label class="field full"><span>الوصف — الفرنسية</span>' +
              '<textarea name="description[fr]" rows="3">' + esc(desc.fr || "") + "</textarea></label>" +

            '<label class="field full"><span>الوصف — الإنجليزية</span>' +
              '<textarea name="description[en]" rows="3">' + esc(desc.en || "") + "</textarea></label>" +

            '<label class="field full"><span>المواصفات (JSON)</span>' +
              '<textarea name="specs" rows="4" placeholder="&#123;&quot;socket&quot;:&quot;AM5&quot;,&quot;cores&quot;:8&#125;">' +
              esc(specsValue) + "</textarea>" +
              '<span class="file-hint">حقول ديناميكية حسب الفئة — حالياً تُدخل كـ JSON صالح.</span></label>' +

            '<div class="field full"><span>الصور (حد أقصى 5)</span>' +
              '<input type="file" name="images" id="product-images" accept="image/*" multiple>' +
              '<span class="file-hint">اتركه فارغاً عند التعديل للإبقاء على الصور الحالية.</span>' +
              existing +
              '<div class="images-preview" id="images-preview"></div>' +
            "</div>" +
          "</div>" +
        "</div>" +

        '<div class="modal-foot">' +
          '<button type="button" class="btn btn-outline" data-modal-close>إلغاء</button>' +
          '<button type="submit" class="btn btn-primary" id="product-save-btn">' +
            '<i class="fa-solid fa-floppy-disk"></i> حفظ</button>' +
        "</div>" +
      "</form>";

    openModal(html, "wide");

    /* معاينة الصور المختارة فوراً */
    const fileInput = $("#product-images");
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        const preview = $("#images-preview");
        if (!preview) return;
        const files = Array.from(fileInput.files || []);
        if (files.length > 5) {
          fileInput.value = "";
          if (window.AdminUI && AdminUI.toast) AdminUI.toast("الحد الأقصى 5 صور لكل منتج", "error");
          return;
        }
        preview.innerHTML = "";
        files.forEach((f) => {
          const img = document.createElement("img");
          img.src = URL.createObjectURL(f);
          img.alt = f.name;
          preview.appendChild(img);
        });
      });
    }

    function safeStringify(obj) {
      try { return JSON.stringify(obj, null, 2); } catch (e) { return ""; }
    }
  }

  /* جمع بيانات نموذج المنتج → FormData (أو null عند خطأ) */
  function collectProductForm() {
    const form = $("#product-form");
    if (!form) return null;

    const fd = new FormData();
    const val = (name) => {
      const el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || "").trim() : "";
    };

    const name = val("name");
    const price = val("price");
    if (!name) { toast("يرجى إدخال اسم المنتج", "error"); return null; }
    if (price === "" || isNaN(Number(price))) { toast("يرجى إدخال سعر صالح", "error"); return null; }

    fd.append("name", name);
    fd.append("brand", val("brand"));
    fd.append("category", val("category"));
    fd.append("price", price);
    fd.append("salePrice", val("salePrice"));
    fd.append("stock", val("stock") || "0");
    fd.append("description[ar]", val("description[ar]"));
    fd.append("description[fr]", val("description[fr]"));
    fd.append("description[en]", val("description[en]"));

    /* المواصفات: نتحقق أنّها JSON صالح قبل الإرسال */
    const specsRaw = val("specs");
    if (specsRaw) {
      try {
        const parsed = JSON.parse(specsRaw);
        fd.append("specs", JSON.stringify(parsed));
      } catch (e) {
        toast("حقل المواصفات يجب أن يكون JSON صالحاً", "error");
        return null;
      }
    }

    /* الصور (حد أقصى 5) */
    const fileInput = $("#product-images");
    const files = fileInput ? Array.from(fileInput.files || []) : [];
    if (files.length > 5) {
      toast("الحد الأقصى 5 صور لكل منتج", "error");
      return null;
    }
    files.forEach((f) => fd.append("images", f));

    return fd;
  }

  /* ===================================================================
     المودال + حوار التأكيد + التوست
     =================================================================== */
  function openModal(html, extraClass) {
    const root = $("#modal-root");
    const box = $("#modal-content");
    if (!root || !box) return;
    box.className = "modal" + (extraClass ? " " + extraClass : "");
    box.innerHTML = html;
    root.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const root = $("#modal-root");
    if (root) root.hidden = true;
    const box = $("#modal-content");
    if (box) box.innerHTML = "";
    document.body.style.overflow = "";
  }

  /* حوار تأكيد — يُعيد Promise(true) عند الموافقة */
  function confirmAction(message) {
    return new Promise((resolve) => {
      const root = $("#confirm-root");
      const msg = $("#confirm-message");
      const yes = $("#confirm-yes");
      const no = $("#confirm-no");
      if (!root || !yes || !no) { resolve(window.confirm(message)); return; }

      if (msg) msg.textContent = message || "هل أنت متأكد؟";
      root.hidden = false;

      const cleanup = (result) => {
        root.hidden = true;
        yes.removeEventListener("click", onYes);
        no.removeEventListener("click", onNo);
        resolve(result);
      };
      const onYes = () => cleanup(true);
      const onNo = () => cleanup(false);
      yes.addEventListener("click", onYes);
      no.addEventListener("click", onNo);
    });
  }

  /* إشعارات Toast */
  function toast(message, type) {
    const wrap = $("#toast-wrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast " + (type || "success");
    const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
    el.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + esc(message) + "</span>";
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 320);
    }, 3400);
  }

  /* ===================================================================
     الواجهة العامة — window.AdminUI
     =================================================================== */
  window.AdminUI = {
    showLogin: showLogin,
    showDashboard: showDashboard,
    setActiveTab: setActiveTab,
    setLoading: setLoading,
    renderDashboard: renderDashboard,
    renderStats: renderStats,
    renderOrdersTable: renderOrdersTable,
    renderOrderModal: renderOrderModal,
    renderProductsTable: renderProductsTable,
    renderProductModal: renderProductModal,
    collectProductForm: collectProductForm,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirmAction,
    toast: toast,
    statusBadge: statusBadge,
    statusOptions: statusOptions,
    categoryLabel: categoryLabel,
    money: money,
    esc: esc,
    date: date
  };
})();
