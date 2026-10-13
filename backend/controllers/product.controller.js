/* ============================================================
   Product controller — متحكم المنتجات
   getProducts: قائمة المنتجات مع فلترة وبحث وترتيب وترقيم صفحات
   getProductById: منتج واحد بالمعرّف أو slug
   createProduct / updateProduct / deleteProduct: عمليات الإدارة
   getCategories: الفئات مع عدد المنتجات في كل فئة
   ============================================================ */

import Product from "../models/Product.js";
import { validationResult } from "express-validator";

/* ============================================================
   مساعدات تحويل مسارات صور المنتج إلى روابط GitHub Raw كاملة
   ============================================================ */

// الأساس (Base URL) لمخزن صور الكتالوج على GitHub
const GITHUB_BASE = 'https://raw.githubusercontent.com/BenzidaneMo/PC-components-mock-catalog-dz/main';

// تحويل مسار صورة نسبي إلى رابط GitHub Raw كامل مع ترميز المسار (URL Encoding)
function toFullImageUrl(imgPath) {
  if (!imgPath) return null;                 // مسار فارغ → لا شيء
  if (imgPath.startsWith('http')) return imgPath; // رابط كامل مسبقاً → إرجاعه كما هو
  const clean = imgPath.trim().replace(/^\/+/, ''); // إزالة الأشرطة المائلة "/" الأولى من المسار
  const parts = clean.split('/');                 // تقسيم المسار إلى أجزاء
  const encoded = parts.map(part => encodeURIComponent(part)).join('/'); // ترميز كل جزء
  return GITHUB_BASE + '/' + encoded;             // دمج الأساس مع المسار المُرمَّز
}

// تحويل مستند منتج (Mongoose document أو كائن عادي) إلى كائن جاهز للإرسال
// مع تحويل كل الصور إلى روابط كاملة وحذف القيم الفارغة
function transformProduct(p) {
  const obj = p.toObject ? p.toObject() : { ...p };
  obj.images = (obj.images || []).map(toFullImageUrl).filter(Boolean);
  return obj;
}

/* ============================================================
   خريطة تطابق الفئات: المعرّف (slug) الفرنسي من الواجهة الأمامية
   ↔ اسم الفئة الإنجليزي المحفوظ في قاعدة البيانات
   ============================================================ */
const CATEGORY_MAP = {
  'processeurs': 'CPU',
  'cartes-graphiques': 'GPU',
  'cartes-meres': 'Motherboard',
  'memoire-ram': 'RAM',
  'ssd': 'SSD',
  'disques-durs': 'HDD',
  'alimentations': 'PSU',
  'boitiers': 'Case',
  'ventirads': 'CPU Cooler',
  'watercooling': 'Water Cooling',
  'pates-thermiques': 'Thermal Paste',
  'ventilateurs': 'Case Fan',
  'ecrans': 'Monitor',
  'claviers': 'Keyboard',
  'souris': 'Mouse',
  'casques': 'Headset',
  'webcams': 'Webcam',
  'microphones': 'Microphone',
  'imprimantes': 'Printer',
  'routeurs': 'Router',
  'adaptateurs-wifi': 'WiFi Adapter',
  'switchs': 'Network Switch',
  'cables-reseau': 'Network Cable',
  'tapis-de-souris': 'Mouse Pad',
  'chaises-gaming': 'Gaming Chair',
  'tables-gaming': 'Gaming Desk',
  'manettes': 'Gamepad',
  'sacs': 'Bag',
  'cables-adaptateurs': 'Cable/Adapter',
  'pc-gamer-fixe': 'Gaming PC',
  'portables-gaming': 'Gaming Laptop',
  'portables-bureautique': 'Office Laptop',
  'pc-bureau': 'Office PC'
};

// مجموعات الفئات: معرّف مجموعة واحدة يُرجع عدة فئات معاً (بحث بـ $in)
const CATEGORY_GROUPS = {
  'stockage': ['SSD', 'HDD'],
  'refroidissement': ['CPU Cooler', 'Water Cooling', 'Thermal Paste', 'Case Fan'],
  'peripheriques': ['Monitor', 'Keyboard', 'Mouse', 'Headset', 'Webcam',
                    'Microphone', 'Printer'],
  'reseau': ['Router', 'WiFi Adapter', 'Network Switch', 'Network Cable'],
  'accessoires': ['Mouse Pad', 'Gaming Chair', 'Gaming Desk', 'Gamepad',
                  'Bag', 'Cable/Adapter'],
  'pc-gamer': ['Gaming PC', 'Office PC'],
  'pc-portables': ['Gaming Laptop', 'Office Laptop']
};

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

/* ---------- جلب المنتجات مع الفلترة والبحث ---------- */
export const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // بناء فلتر البحث
    const filter = { isActive: true };

    // تطبيق فلترة الفئة: ترجمة المعرّف الفرنسي القادم من الواجهة
    // إلى اسم الفئة الإنجليزي المحفوظ في قاعدة البيانات قبل الفلترة
    let categoryFilter = req.query.category;
    if (categoryFilter) {
      // المجموعات → فلترة بـ $in بعدة فئات
      if (CATEGORY_GROUPS[categoryFilter]) {
        categoryFilter = { $in: CATEGORY_GROUPS[categoryFilter] };
      }
      // المعرّفات الفردية → الاسم الإنجليزي المقابل
      else if (CATEGORY_MAP[categoryFilter]) {
        categoryFilter = CATEGORY_MAP[categoryFilter];
      }
      // غير ذلك → تُمرَّر القيمة كما هي (اسم فئة مباشر بالإنجليزية)
      filter.category = categoryFilter;
    }
    if (brand) filter.brand = brand;

    // فلترة بالسعر (يستخدم salePrice إذا كان موجوداً)
    if (minPrice || maxPrice) {
      filter.$or = [{ price: {} }, { salePrice: {} }];
      if (minPrice) {
        filter.$or[0].price.$gte = Number(minPrice);
        filter.$or[1].salePrice = filter.$or[1].salePrice || {};
        filter.$or[1].salePrice.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.$or[0].price.$lte = Number(maxPrice);
        filter.$or[1].salePrice = filter.$or[1].salePrice || {};
        filter.$or[1].salePrice.$lte = Number(maxPrice);
      }
    }

    // بحث نصي بالاسم أو العلامة التجارية
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { brand: regex }];
    }

    // الترتيب
    let sortOption = { createdAt: -1 }; // الأحدث افتراضياً
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };
    else if (sort === "newest") sortOption = { createdAt: -1 };

    // الترقيم
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortOption).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        // تحويل كل منتج في القائمة إلى روابط صور كاملة
        products: products.map(transformProduct),
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ---------- جلب منتج واحد بالمعرّف أو slug ---------- */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // محاولة البحث بالـ slug أولاً ثم بالمعرّف
    let product = await Product.findOne({ slug: id, isActive: true });
    if (!product) {
      product = await Product.findById(id);
    }

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "المنتج غير موجود.",
      });
    }

    // تحويل المنتج الواحد إلى روابط صور كاملة قبل الإرسال
    res.status(200).json({ success: true, data: transformProduct(product) });
  } catch (error) {
    next(error);
  }
};

/* ---------- إنشاء منتج جديد (مسؤول فقط) ---------- */
export const createProduct = async (req, res, next) => {
  try {
    if (!validate(req, res)) return;

    const {
      name,
      description,
      brand,
      category,
      price,
      salePrice,
      stock,
      specs,
      warrantyMonths,
    } = req.body;

    const product = await Product.create({
      name,
      description,
      brand,
      category,
      price,
      salePrice,
      stock,
      specs,
      warrantyMonths,
      images: req.imageUrls || [], // الصور المُرفعَة إلى Cloudinary
    });

    // تحويل المنتج الجديد إلى روابط صور كاملة قبل الإرسال
    res.status(201).json({ success: true, data: transformProduct(product) });
  } catch (error) {
    next(error);
  }
};

/* ---------- تحديث منتج (مسؤول فقط) ---------- */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "المنتج غير موجود.",
      });
    }

    const {
      name,
      description,
      brand,
      category,
      price,
      salePrice,
      stock,
      specs,
      warrantyMonths,
      isActive,
    } = req.body;

    // تحديث الحقول المُرسلة فقط
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (brand !== undefined) product.brand = brand;
    if (category !== undefined) product.category = category;
    if (price !== undefined) product.price = price;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (stock !== undefined) product.stock = stock;
    if (specs !== undefined) product.specs = specs;
    if (warrantyMonths !== undefined) product.warrantyMonths = warrantyMonths;
    if (isActive !== undefined) product.isActive = isActive;

    // استبدال الصور إذا تم رفع صور جديدة
    if (req.imageUrls && req.imageUrls.length > 0) {
      product.images = req.imageUrls;
    }

    await product.save();
    // تحويل المنتج المُحدَّث إلى روابط صور كاملة قبل الإرسال
    res.status(200).json({ success: true, data: transformProduct(product) });
  } catch (error) {
    next(error);
  }
};

/* ---------- حذف منتج (حذف ناعم — مسؤول فقط) ---------- */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "المنتج غير موجود.",
      });
    }

    // حذف ناعم: إخفاء المنتج بدل حذفه فعلياً
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: "تم حذف المنتج بنجاح.",
    });
  } catch (error) {
    next(error);
  }
};

/* ---------- جلب الفئات مع عدد المنتجات ---------- */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};
