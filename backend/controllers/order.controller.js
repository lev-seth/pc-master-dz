/* ============================================================
   Order controller — متحكم الطلبات
   createOrder: إنشاء طلب (يدعم الزوار — بدون تسجيل دخول)
                ويُعاد حساب الأسعار من قاعدة البيانات دائماً
   getMyOrders: طلبات المستخدم الحالي
   getOrderById: طلب واحد (المالك أو المسؤول فقط)
   updateOrderStatus: تغيير حالة الطلب (مسؤول فقط)
   getAllOrders: كل الطلبات مع الفلترة والترقيم (مسؤول فقط)
   ============================================================ */

import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
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

/* ---------- قواعد الشحن الجزائرية ---------- */
const getShippingCost = (subtotal, wilayaCode) => {
  // الشحن مجاني للطلبات فوق 150,000 دج
  if (subtotal >= 150000) return 0;
  // الولايات 1-48: 400 دج، باقي الولايات: 800 دج
  return wilayaCode <= 48 ? 400 : 800;
};

/* ---------- استخراج رقم الولاية من النص ---------- */
const extractWilayaCode = (wilayaString) => {
  const match = wilayaString.match(/\d+/);
  return match ? parseInt(match[0]) : 1;
};

/* ---------- إنشاء طلب جديد (يدعم طلبات الزوار — guest checkout) ---------- */
export const createOrder = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;

    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "السلة فارغة.",
      });
    }

    /* فصل معرّفات المنتجات: ما يشبه ObjectId يُبحث به، وما عداه (الـ slugs
       مثل "intel-core-i5-14400f" القادم من الواجهة) يُبحث بحقل slug */
    const rawIds = items.map((item) => item.product).filter(Boolean);
    const objectIds = [];
    const slugs = [];
    rawIds.forEach((v) => {
      if (mongoose.isValidObjectId(v)) objectIds.push(v);
      else slugs.push(String(v));
    });

    const products = await Product.find({
      $or: [{ _id: { $in: objectIds } }, { slug: { $in: slugs } }],
      isActive: true,
    });

    /* خريطة للبحث السريع بالمعرّف أو بالـ slug */
    const productMap = new Map();
    products.forEach((p) => {
      productMap.set(p._id.toString(), p);
      if (p.slug) productMap.set(p.slug, p);
    });

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(String(item.product));
      /* منتج غير موجود أو غير نشط → نتجاهله (تخطّي) بدل إلغاء الطلب */
      if (!product) continue;

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

      // التحقق من المخزون
      if (typeof product.stock === "number" && product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `الكمية المطلوبة من ${product.name} غير متوفرة (المتاح: ${product.stock}).`,
        });
      }

      // إعادة حساب السعر من قاعدة البيانات (لا نثق بأسعار العميل أبداً)
      // استخدام سعر التخفيض إذا كان متاحاً
      const effectivePrice = product.salePrice || product.price;
      const itemTotal = effectivePrice * qty;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: effectivePrice,
        quantity: qty,
        image: (product.images && product.images[0]) || "",
      });
    }

    /* لا يوجد أي منتج صالح في الطلب */
    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "لا توجد منتجات صالحة في الطلب.",
      });
    }

    // حساب الشحن: شمال (01-48) 400 دج، جنوب (49-69) 800 دج، مجاني فوق 150,000 دج
    const wilayaCode = extractWilayaCode(shippingAddress.wilaya);
    const shippingCost = getShippingCost(subtotal, wilayaCode);
    const total = subtotal + shippingCost;

    /* معلومات الزائر: من حقل guestInfo إن أُرسل، وإلا من عنوان التوصيل.
       (req.user يبقى محجوزاً للاستخدام المستقبلي عند تسجيل الدخول) */
    const guest = req.body.guestInfo || {};
    const guestInfo = {
      fullName: guest.fullName || shippingAddress.fullName,
      phone: guest.phone || shippingAddress.phone,
      email: guest.email,
    };

    // إنشاء الطلب
    const order = await Order.create({
      user: req.user && req.user.id ? req.user.id : undefined, // زائر → بدون user
      guestInfo,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingCost,
      total,
      orderNumber: "ORD-" + Date.now(), // رقم الطلب: ORD-<timestamp>
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: paymentMethod || "cod",
    });

    // خصم الكميات من المخزون (للبند المُضاف فعلياً فقط)
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({ success: true, data: { order } });
  } catch (error) {
    next(error);
  }
};

/* ---------- جلب طلبات المستخدم الحالي ---------- */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

/* ---------- جلب طلب واحد (المالك أو المسؤول) ---------- */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود.",
      });
    }

    // التحقق من الصلاحية: المسؤول دائماً، أو مالك الطلب.
    // طلبات الزوار ليس لها مستخدم (user = null) → يراها المسؤول فقط
    const isOwner = order.user && order.user.toString() === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "ممنوع: هذا الطلب لا يخصك.",
      });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ---------- تغيير حالة الطلب (مسؤول فقط) ---------- */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود.",
      });
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

/* ---------- جلب كل الطلبات (مسؤول فقط) ---------- */
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, fromDate, toDate, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    // فلترة بالتاريخ
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------- إحصائيات لوحة التحكم (مسؤول فقط) ---------- */
export const getAdminStats = async (req, res, next) => {
  try {
    // إجمالي المبيعات وعدد الطلبات (باستثناء الملغاة)
    const salesAgg = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
          ordersCount: { $sum: 1 },
        },
      },
    ]);

    // عدد الطلبات حسب الحالة
    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // أفضل 5 منتجات مبيعاً
    const topProducts = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSales: salesAgg[0]?.totalSales || 0,
        ordersCount: salesAgg[0]?.ordersCount || 0,
        statusCounts,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
