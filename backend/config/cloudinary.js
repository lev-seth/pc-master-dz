/* ============================================================
   Cloudinary config — إعداد رفع الصور على Cloudinary
   تحميل متغيرات البيئة وتثبيت النسخة المُهيّأة من المكتبة
   ============================================================ */

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
