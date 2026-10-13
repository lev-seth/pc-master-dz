/* ============================================================
   Upload middleware — وسائط رفع الصور
   multer: يستقبل الصور في الذاكرة (memoryStorage)
   cloudinary: يرفع كل صورة ويعيد الرابط (secure_url)
   uploadImages: مصفوفة من الوسائط (حتى 5 صور) → req.imageUrls
   ============================================================ */

import multer from "multer";
import cloudinary from "../config/cloudinary.js";

/* ---------- إعداد multer: تخزين مؤقت في الذاكرة ---------- */
const storage = multer.memoryStorage();

/* ---------- فلتر: صور فقط، بحد أقصى 5 ميغابايت ---------- */
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("الملفات المسموحة هي الصور فقط."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* ---------- رفع buffer إلى Cloudinary ---------- */
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "pc-store/products" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/* ---------- الوسيط المُركّب: استقبال الصور ثم رفعها ---------- */
export const uploadImages = [
  upload.array("images", 5), // اسم الحقل: images، حتى 5 ملفات
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        req.imageUrls = [];
        return next();
      }
      const uploads = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );
      req.imageUrls = uploads.map((u) => u.secure_url);
      next();
    } catch (error) {
      next(error);
    }
  },
];
