/* ============================================================
   Error middleware — معالج الأخطاء المركزي
   يلتقط أي خطأ ويرد بـ JSON موحّد: { success, message, stack? }
   stack يظهر فقط في وضع التطوير (NODE_ENV=development)
   ============================================================ */

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);

  // خطأ multer: حجم الملف كبير جداً
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "حجم الصورة أكبر من 5 ميغابايت.",
    });
  }

  // خطأ MongoDB: المعرف غير صالح (CastError)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "معرّف غير صالح.",
    });
  }

  // خطأ MongoDB: تكرار قيمة فريدة (مثل البريد الإلكتروني)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "الحقل";
    return res.status(400).json({
      success: false,
      message: `قيمة موجودة مسبقاً في ${field}.`,
    });
  }

  // خطأ التحقق من المدخلات (Mongoose ValidationError)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  // خطأ عام
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "خطأ في الخادم.",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default errorHandler;
