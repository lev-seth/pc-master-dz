/* ============================================================
   Order model — نموذج الطلب
   يحتوي على المنتجات المطلوبة، عنوان التوصيل، الحالة، الدفع
   رقم الطلب يُولَّد تلقائياً بنمط ORD-<timestamp>
   ============================================================ */

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // اختياري: طلبات الزوار (guest) ليس لها مستخدم
    },
    /* معلومات الزائر — تُملأ عند الطلب بدون تسجيل دخول */
    guestInfo: {
      fullName: String,
      phone: String,
      email: String,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true }, // يُحفظ من قاعدة البيانات (لا يُؤتمن على العميل)
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      wilaya: { type: String, required: true }, // الولاية الجزائرية
      address: { type: String, required: true },
      notes: { type: String },
    },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "chargily", "stripe"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    orderNumber: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

/* ---------- توليد رقم الطلب تلقائياً قبل التحقق ---------- */
orderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    this.orderNumber = "ORD-" + Date.now();
  }
  ;
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
