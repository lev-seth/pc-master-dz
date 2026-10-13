/* ============================================================
   PC Master DZ — وحدة الاتصال بـ API الخاصة بالإدارة (js/admin-api.js)
   تُعرَّف كـ window.AdminAPI وتستعمل JWT المحفوظ في localStorage.
   لا تُغيّر أي شيء في backend أو المتجر — هذه الوحدة مخصّصة للوحة فقط.
   ============================================================ */

(function () {
  "use strict";

  /* ------------------------------ الثوابت ------------------------------ */
  const API_BASE = "http://localhost:5000/api";   /* عنوان الـ backend */
  const TOKEN_KEY = "pcmaster_admin_token";       /* مفتاح حفظ التوكن */
  const USER_KEY = "pcmaster_admin_user";         /* مفتاح حفظ بيانات المشرف */

  /* --------------------- إدارة التوكن وبيانات المشرف --------------------- */
  function saveToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* localStorage معطّل */ }
  }

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) { /* تجاهل */ }
  }

  /* هل المشرف مسجّل دخول؟ (وجود توكن = مسجّل، والصلاحية تُفحص في كل طلب) */
  function isLoggedIn() {
    return !!getToken();
  }

  function saveUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user || {})); } catch (e) { /* تجاهل */ }
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch (e) { return null; }
  }

  function logout() {
    clearToken();
  }

  /* --------------------------- بناء الترويسات --------------------------- */
  function buildHeaders(extra) {
    const headers = Object.assign({}, extra || {});
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
  }

  /* --------------------- معالجة انتهاء الصلاحية (401/403) ---------------------
     نمسح التوكن ونُرسل حدثاً custom event تلتقطه admin.js لعرض شاشة الدخول. */
  function handleUnauthorized() {
    clearToken();
    try {
      window.dispatchEvent(new CustomEvent("admin:unauthorized", {
        detail: { message: "انتهت صلاحية الجلسة — يرجى تسجيل الدخول من جديد" }
      }));
    } catch (e) { /* تجاهل */ }
    /* استدعاء الخطاف إن كانت admin.js قد سجّلته */
    try {
      const api = window.AdminAPI;
      if (api && typeof api.onUnauthorized === "function") api.onUnauthorized();
    } catch (e) { /* تجاهل */ }
  }

  /* --------------------------- نداء fetch عام ---------------------------
     يُعيد البيانات المفكّكة (json) ويُرمي خطأ برسالة عربية عند الفشل. */
  async function request(path, options) {
    const opts = Object.assign({}, options || {});
    opts.headers = buildHeaders(opts.headers);

    /* المحتوى JSON افتراضياً — ما لم يكن FormData (يتركه المتصفح يحدّد الحدود) */
    if (opts.body && !(opts.body instanceof FormData)) {
      if (typeof opts.body !== "string") opts.body = JSON.stringify(opts.body);
      opts.headers["Content-Type"] = "application/json";
    }

    let res;
    try {
      res = await fetch(API_BASE + path, opts);
    } catch (e) {
      throw new Error("تعذّر الاتصال بالخادم — تأكّد من تشغيل الـ backend على المنفذ 5000");
    }

    /* 401 = غير مُصرّح، 403 = مُصرّح لكنه ليس admin */
    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      throw new Error(res.status === 403
        ? "هذه الحساب لا تملك صلاحيات المشرف"
        : "انتهت صلاحية الجلسة، يرجى تسجيل الدخول من جديد");
    }

    let json = null;
    try { json = await res.json(); } catch (e) { /* استجابة غير JSON */ }

    if (!res.ok) {
      throw new Error((json && (json.message || json.error)) ||
        ("خطأ في الخادم (HTTP " + res.status + ")"));
    }

    if (json && json.success === false) {
      throw new Error(json.message || "فشلت العملية، حاول مرة أخرى");
    }

    return json;
  }

  /* تفضيل حقل data ثم الإجابة الكاملة (يدعم الشكلين {success,data} و{...} */
  function unwrap(json) {
    if (json && json.data !== undefined && json.data !== null) return json.data;
    return json || {};
  }

  /* استخراج التوكن من استجابة تسجيل الدخول (قد يكون في token أو data.token) */
  function extractToken(json) {
    return (json && (json.token || json.accessToken)) ||
      (json && json.data && (json.data.token || json.data.accessToken)) || null;
  }

  function extractUser(json) {
    return (json && json.user) ||
      (json && json.data && json.data.user) ||
      (json && json.data && json.data.admin) ||
      (json && json.admin) || null;
  }

  /* --------------------------- استجابة عربية موحّدة --------------------------- */
  function messageOf(err, fallback) {
    return (err && err.message) || fallback || "حدث خطأ غير متوقّع";
  }

  /* ===================================================================
     تحويل FormData ← كائن JSON للحقول النصية + مصفوفة الملفات
     ملاحظة مهمة عن الـ backend (بدون تعديله):
       router.post("/products", createProductRules, uploadImages, ...)
     أي أنّ قواعد التحقق (express-validator) تعمل قبل multer، لذا لا تصل
     الحقول النصية إلى المحقّق إن أرسلنا multipart. الحل عندنا في العميل:
       1) نرسل الحقول كـ application/json  (يعمل التحقق بنجاح)
       2) ثم نرفق الصور عبر PUT multipart  (لا توجد قواعد تحقق على PUT)
     =================================================================== */
  function splitFormData(formData) {
    const payload = {};
    const files = [];
    if (!formData || typeof formData.entries !== "function") {
      return { payload: payload, files: files };
    }
    for (const pair of formData.entries()) {
      const key = pair[0];
      const value = pair[1];

      /* ملف مرفوع (File/Blob) */
      if (value && typeof value === "object" && typeof Blob !== "undefined" && value instanceof Blob) {
        files.push({ key: key, file: value });
        continue;
      }

      /* description[ar] ← description: { ar: ... } */
      const descMatch = /^description\[(\w+)\]$/.exec(key);
      if (descMatch) {
        if (!payload.description) payload.description = {};
        payload.description[descMatch[1]] = value;
        continue;
      }

      /* specs تُرسل كـ JSON object لا كنص */
      if (key === "specs") {
        if (value) {
          try { payload.specs = JSON.parse(value); }
          catch (e) { payload.specs = {}; }
        }
        continue;
      }

      /* salePrice فارغ ← null (المتجر يستعمل null للعدم وجود تخفيض) */
      if (key === "salePrice") {
        payload.salePrice = (value === "" || value == null) ? null : Number(value);
        continue;
      }

      /* أرقام كأرقام */
      if (key === "price" || key === "stock" || key === "warrantyMonths") {
        if (value !== "" && value != null) payload[key] = Number(value);
        continue;
      }

      payload[key] = value;
    }
    return { payload: payload, files: files };
  }

  /* رفع مجموعة ملفات فقط إلى منتج موجود (PUT multipart) */
  async function attachFiles(id, files) {
    if (!files || !files.length || !id) return null;
    const fd = new FormData();
    files.forEach((entry) => fd.append(entry.key || "images", entry.file));
    const json = await request("/admin/products/" + encodeURIComponent(id), {
      method: "PUT",
      body: fd
    });
    return unwrap(json);
  }

  /* ===================================================================
     الواجهة العامة — window.AdminAPI
     =================================================================== */
  const AdminAPI = {

    API_BASE: API_BASE,
    /* خطاف اختياري يُستدعى عند 401/403 (تُضافه admin.js) */
    onUnauthorized: null,

    /* ------------------------------ المصادقة ------------------------------ */
    async login(email, password) {
      const json = await request("/auth/login", {
        method: "POST",
        body: { email: email, password: password }
      });
      const token = extractToken(json);
      if (!token) throw new Error("استجابة تسجيل الدخول لا تحتوي على توكن");
      saveToken(token);
      saveUser(extractUser(json));
      return { token: token, user: extractUser(json) };
    },

    logout: logout,
    saveToken: saveToken,
    getToken: getToken,
    clearToken: clearToken,
    isLoggedIn: isLoggedIn,
    getUser: getUser,
    saveUser: saveUser,

    /* ------------------------------ الإحصائيات ------------------------------ */
    async getStats() {
      const json = await request("/admin/stats");
      return unwrap(json);
    },

    /* ------------------------------- الطلبات ------------------------------- */
    async getOrders(params) {
      const p = params || {};
      const qs = [];
      if (p.page) qs.push("page=" + encodeURIComponent(p.page));
      if (p.limit) qs.push("limit=" + encodeURIComponent(p.limit));
      if (p.status) qs.push("status=" + encodeURIComponent(p.status));
      const json = await request("/admin/orders" + (qs.length ? "?" + qs.join("&") : ""));
      const data = unwrap(json);

      /* توحيد شكل الاستجابة بغضّ النظر عن تسمية الحقول في الـ backend */
      const orders = data.orders || data.items || data.results ||
        (Array.isArray(data) ? data : []);
      return {
        orders: orders,
        page: Number(data.page || p.page || 1),
        pages: Number(data.pages || data.totalPages || 1),
        total: Number(data.total || orders.length || 0)
      };
    },

    async getOrder(id) {
      const json = await request("/admin/orders/" + encodeURIComponent(id));
      const data = unwrap(json);
      return data.order || data;   /* بعض الـ backends يعيد {order: {...}} */
    },

    async updateOrderStatus(id, status) {
      const json = await request("/admin/orders/" + encodeURIComponent(id) + "/status", {
        method: "PUT",
        body: { status: status }
      });
      return unwrap(json);
    },

    /* ------------------------------ المنتجات ------------------------------ */
    /* قائمة المنتجات عامة (GET /products) لكننا نرسل التوكن إن وُجد */
    async getProducts(params) {
      const p = params || {};
      const qs = [];
      qs.push("page=" + encodeURIComponent(p.page || 1));
      qs.push("limit=" + encodeURIComponent(p.limit || 100));
      if (p.search) qs.push("search=" + encodeURIComponent(p.search));
      const json = await request("/products?" + qs.join("&"));
      const data = unwrap(json);

      const products = data.products || data.items || data.results ||
        (Array.isArray(data) ? data : []);
      return {
        products: products,
        page: Number(data.page || p.page || 1),
        pages: Number(data.pages || data.totalPages || 1),
        total: Number(data.total || products.length || 0)
      };
    },

    /* إنشاء منتج — multipart/form-data (الصور) مع التحويل الموضّح أعلاه */
    async createProduct(formData) {
      const split = splitFormData(formData);
      const json = await request("/admin/products", {
        method: "POST",
        body: split.payload
      });
      const created = unwrap(json);
      /* إن وُجدت صور مرفوعة نرسلها في طلب PUT ثانٍ (multer يعمل هناك).
         فشل الرفع (مثلاً: مفاتيح Cloudinary غير مضبوطة) لا يُلغي إنشاء المنتج —
         نُعيده كتنبيه كي تعرضه الواجهة دون كسر العملية. */
      if (split.files.length) {
        const id = created && (created._id || created.id);
        try {
          await attachFiles(id, split.files);
        } catch (err) {
          if (created && typeof created === "object") {
            created._warning = "تم إنشاء المنتج، لكن رفع الصور فشل: " +
              messageOf(err, "خطأ غير معروف");
          }
        }
      }
      return created;
    },

    /* تعديل منتج — JSON للحقول + multipart للصور عند وجودها */
    async updateProduct(id, formData) {
      const split = splitFormData(formData);
      let result = null;
      if (Object.keys(split.payload).length) {
        const json = await request("/admin/products/" + encodeURIComponent(id), {
          method: "PUT",
          body: split.payload
        });
        result = unwrap(json);
      }
      if (split.files.length) {
        try {
          const updated = await attachFiles(id, split.files);
          if (updated) result = updated;
        } catch (err) {
          const warn = "تم حفظ بيانات المنتج، لكن رفع الصور فشل: " +
            messageOf(err, "خطأ غير معروف");
          if (result && typeof result === "object") result._warning = warn;
          else throw new Error(warn);
        }
      }
      return result;
    },

    async deleteProduct(id) {
      const json = await request("/admin/products/" + encodeURIComponent(id), {
        method: "DELETE"
      });
      return unwrap(json);
    },

    /* مساعد: تحويل أي خطأ إلى رسالة عربية مناسبة */
    errorMessage: function (err, fallback) {
      return messageOf(err, fallback);
    }
  };

  window.AdminAPI = AdminAPI;
})();
