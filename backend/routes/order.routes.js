/* ============================================================
   Order routes — مسارات الطلبات
   POST /     — إنشاء طلب جديد (يدعم طلبات الزوار — بدون تسجيل دخول)
   GET  /     — كل الطلبات (مسؤول فقط)
   GET  /my   — طلباتي
   GET  /:id  — طلب واحد (المالك أو المسؤول)
   ============================================================ */

import { Router } from "express";
import { body } from "express-validator";
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
} from "../controllers/order.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

/* ---------- قواعد التحقق لإنشاء طلب ---------- */
const createOrderRules = [
  body("items").isArray({ min: 1 }).withMessage("السلة فارغة"),
  body("items.*.product").notEmpty().withMessage("معرّف المنتج مطلوب"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("الكمية يجب أن تكون 1 على الأقل"),
  body("shippingAddress.fullName")
    .trim()
    .notEmpty()
    .withMessage("الاسم الكامل مطلوب"),
  body("shippingAddress.phone")
    .trim()
    .notEmpty()
    .withMessage("رقم الهاتف مطلوب"),
  body("shippingAddress.wilaya")
    .trim()
    .notEmpty()
    .withMessage("الولاية مطلوبة"),
  body("shippingAddress.address")
    .trim()
    .notEmpty()
    .withMessage("العنوان مطلوب"),
];

/* إنشاء الطلب: بدون verifyToken لقبول طلبات الزوار (guest checkout).
   تبقى قواعد التحقق من صحة الحقول مفعّلة */
router.post("/", createOrderRules, createOrder);

/* كل الطلبات: مسؤول فقط (يعرض طلبات الزوار أيضاً — user = null) */
router.get("/", verifyToken, isAdmin, getAllOrders);

router.get("/my", verifyToken, getMyOrders);
router.get("/:id", verifyToken, getOrderById);

export default router;
