/* ============================================================
   PC Master DZ — Backend entry point
   نقطة الدخول للخادم: تحميل البيئة، الاتصال بقاعدة البيانات،
   تثبيت الوسائط (middleware) وتوجيه المسارات (routes)
   ============================================================ */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import errorHandler from "./middleware/error.middleware.js";

const app = express();

/* ---------- وسائط عامة (CORS + JSON body parser) ---------- */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

/* ---------- مسار صحة للتحقق من عمل الخادم ---------- */
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, data: { status: "ok" } });
});

/* ---------- تثبيت المسارات تحت /api ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

/* ---------- معالج الأخطاء المركزي (يجب أن يكون الأخير) ---------- */
app.use(errorHandler);

/* ---------- تشغيل الخادم بعد الاتصال بقاعدة البيانات ---------- */
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
