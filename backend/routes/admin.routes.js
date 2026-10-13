/* ============================================================
   Admin routes — مسارات المسؤول (تحقق + صلاحية مدير)
   POST   /products              — إنشاء منتج (مع رفع صور)
   PUT    /products/:id          — تحديث منتج (مع رفع صور)
   DELETE /products/:id          — حذف ناعم
   GET    /orders                — كل الطلبات
   PUT    /orders/:id/status     — تغيير حالة الطلب
   GET    /stats                 — إحصائيات لوحة التحكم
   ============================================================ */

import { Router } from "express";
import { body } from "express-validator";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";
import { uploadImages } from "../middleware/upload.middleware.js";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import {
  getAllOrders,
  updateOrderStatus,
  getAdminStats,
} from "../controllers/order.controller.js";

const router = Router();

/* ---------- كل المسارات محمية بصلاحية المسؤول ---------- */
router.use(verifyToken, isAdmin);

/* ---------- قواعد التحقق لإنشاء منتج ---------- */
const createProductRules = [
  body("name").trim().notEmpty().withMessage("اسم المنتج مطلوب"),
  body("price").isFloat({ min: 0 }).withMessage("السعر مطلوب وأن يكون موجباً"),
  body("category").trim().notEmpty().withMessage("الفئة مطلوبة"),
];

/* ---------- قواعد التحقق لتغيير حالة الطلب ---------- */
const updateStatusRules = [
  body("status")
    .isIn(["pending", "paid", "shipped", "delivered", "cancelled"])
    .withMessage("حالة غير صالحة"),
];

router.post("/products", createProductRules, uploadImages, createProduct);
router.put("/products/:id", uploadImages, updateProduct);
router.delete("/products/:id", deleteProduct);

router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateStatusRules, updateOrderStatus);

router.get("/stats", getAdminStats);

export default router;
