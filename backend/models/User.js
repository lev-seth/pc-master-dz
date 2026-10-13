/* ============================================================
   User model — نموذج المستخدم
   التسجيل، تسجيل الدخول، الدور (عميل/مدير)، بيانات التوصيل
   ============================================================ */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "الاسم مطلوب"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "البريد الإلكتروني مطلوب"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "كلمة المرور مطلوبة"],
      minlength: [6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"],
      select: false, // لا تُرسل في الاستجابات العادية
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    phone: { type: String },
    wilaya: { type: String }, // اسم الولاية الجزائرية
    address: { type: String },
  },
  { timestamps: true }
);

/* ---------- تشفير كلمة المرور قبل الحفظ (فقط إذا تغيّرت) ---------- */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
});

/* ---------- مقارنة كلمة المرور المُدخلة مع المخزّنة ---------- */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/* ---------- إزالة كلمة المرور من أي استجابة JSON ---------- */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model("User", userSchema);

export default User;
