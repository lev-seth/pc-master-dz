/* ============================================================
   Auth middleware — وسائط المصادقة
   verifyToken: يتحقق من رمز JWT في ترويسة Authorization
   isAdmin: يتحقق من أن المستخدم مدير (يجب تشغيله بعد verifyToken)
   ============================================================ */

import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* ---------- التحقق من رمز JWT ---------- */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح: لا يوجد رمز. يرجى تسجيل الدخول.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // جلب المستخدم من القاعدة للتأكد من أنه لا يزال موجوداً
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "رمز غير صالح أو منتهي الصلاحية.",
    });
  }
};

/* ---------- التحقق من أن المستخدم مدير ---------- */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "ممنوع: الوصول للمسؤول فقط.",
  });
};
