import { Router } from "express";
import {
    getAllCategoriesController,
    createCategoryController,
    deleteCategoryController,
    updateCategoryController,
    deactivateCategoryController,
    activateCategoryController,
} from "./category.controller.js";

import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";

const router = Router();

// All category routes require authentication.
router.use(...requireAuth);

// GET /api/components/categories
router.get("/", getAllCategoriesController);

// POST /api/components/categories
router.post(
    "/",
    requireRole("SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT"),
    createCategoryController,
);

// DELETE /api/components/categories/:categoryId
router.delete(
    "/:categoryId",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT"),
    deleteCategoryController,
);

// PATCH /api/components/categories/:categoryId
router.patch(
    "/:categoryId",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT"),
    updateCategoryController,
);

// PATCH /api/components/categories/:categoryId/deactivate
router.patch(
    "/:categoryId/deactivate",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT"),
    deactivateCategoryController,
);

// PATCH /api/components/categories/:categoryId/activate
router.patch(
    "/:categoryId/activate",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT"),
    activateCategoryController,
);

export default router;