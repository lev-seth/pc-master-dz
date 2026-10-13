/* ============================================================
   Product routes — مسارات المنتجات (عام)
   GET /            — قائمة المنتجات مع فلترة وبحث
   GET /categories  — الفئات مع عدد المنتجات
   GET /:id         — منتج واحد بالمعرّف أو slug
   ============================================================ */

import { Router } from "express";
import {
  getProducts,
  getProductById,
  getCategories,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProductById);

export default router;
