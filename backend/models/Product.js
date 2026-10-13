/* ============================================================
   Product model — نموذج المنتج
   قطع الكمبيوتر: المعالجات، كروت الشاشة، الذاكرة، التخزين...
   فهرس نصي للبحث بالاسم/العلامة التجارية
   ============================================================ */

import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "اسم المنتج مطلوب"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      ar: { type: String, default: "" },
      fr: { type: String, default: "" },
      en: { type: String, default: "" },
    },
    brand: { type: String, index: true },
    category: {
      type: String,
      required: [true, "الفئة مطلوبة"],
      index: true,
      // CPU, GPU, RAM, Storage, Motherboard, PSU, Case, Cooling, Monitor, Peripheral
    },
    price: {
      type: Number,
      required: [true, "السعر مطلوب"],
      min: [0, "السعر لا يمكن أن يكون سالباً"],
    },
    salePrice: { type: Number, default: null },
    stock: { type: Number, default: 0 },
    specs: { type: Object, default: {} }, // حقول حرّة: cores, threads, vram, socket...
    images: [{ type: String }], // روابط Cloudinary
    warrantyMonths: { type: Number, default: 12 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ---------- فهرس نصي للبحث ---------- */
productSchema.index({ name: "text", brand: "text", "description.ar": "text" });

/* ---------- توليد slug تلقائياً من الاسم عند الإنشاء ---------- */
productSchema.pre("save", function () {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  
});

const Product = mongoose.model("Product", productSchema);

export default Product;
