/* ============================================================
   Auth routes — مسارات المصادقة
   POST /register  — إنشاء حساب
   POST /login     — تسجيل الدخول
   GET  /me        — بياناتي (محمي)
   PUT  /profile   — تحديث الملف الشخصي (محمي)
   ============================================================ */

import { Router } from "express";
import { body } from "express-validator";
import {
  register,
  login,
  getMe,
  updateProfile,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

/* ---------- قواعد التحقق للتسجيل ---------- */
const registerRules = [
  body("name").trim().notEmpty().withMessage("الاسم مطلوب"),
  body("email").isEmail().withMessage("البريد الإلكتروني غير صالح"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
];

/* ---------- قواعد التحقق لتسجيل الدخول ---------- */
const loginRules = [
  body("email").isEmail().withMessage("البريد الإلكتروني غير صالح"),
  body("password").notEmpty().withMessage("كلمة المرور مطلوبة"),
];

router.post("/register", registerRules, register);
router.post("/login", loginRules, login);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);

export default router;
