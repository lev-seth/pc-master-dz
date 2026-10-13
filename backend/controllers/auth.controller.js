/* ============================================================
   Auth controller — متحكم المصادقة
   register: إنشاء حساب جديد وإرجاع رمز JWT
   login: تسجيل الدخول بالبريد وكلمة المرور
   getMe: جلب بيانات المستخدم الحالي
   updateProfile: تحديث الاسم/الهاتف/الولاية/العنوان
   ============================================================ */

import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { validationResult } from "express-validator";

/* ---------- التحقق من صحة المدخلات ---------- */
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
    return false;
  }
  return true;
};

/* ---------- تسجيل حساب جديد ---------- */
export const register = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;

    const { name, email, password, phone, wilaya, address } = req.body;

    // التحقق من عدم وجود البريد مسبقاً
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني مسجل مسبقاً.",
      });
    }

    // إنشاء المستخدم (سيتم تشفير كلمة المرور تلقائياً في pre-save)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      wilaya,
      address,
    });

    // إرجاع الرمز والمستخدم
    const token = generateToken(user._id.toString(), user.role);
    res.status(201).json({
      success: true,
      data: { token, user },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------- تسجيل الدخول ---------- */
export const login = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;

    const { email, password } = req.body;

    // جلب المستخدم مع كلمة المرور (select: false)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      });
    }

    // مقارنة كلمة المرور
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      });
    }

    const token = generateToken(user._id.toString(), user.role);
    res.status(200).json({
      success: true,
      data: { token, user },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------- جلب بيانات المستخدم الحالي ---------- */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/* ---------- تحديث الملف الشخصي ---------- */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, wilaya, address } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
    }

    // تحديث الحقول المسموح بها فقط
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (wilaya !== undefined) user.wilaya = wilaya;
    if (address !== undefined) user.address = address;

    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
