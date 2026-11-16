import type { Request, Response } from "express";
import {
    getAllCategories,
    createCategory,
    deleteCategory,
    updateCategory,
    deactivateCategory,
    activateCategory,
    type CategoryStatus
} from "./category.service.js";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasPrismaErrorCode(error: unknown, code: string): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code
    );
}

// GET /api/components/categories
export async function getAllCategoriesController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const status = String(req.query.status ?? "ACTIVE").toUpperCase();

        if (!["ACTIVE", "INACTIVE", "ALL"].includes(status)) {
            res.status(400).json({
                success: false,
                message: "Invalid status. Use ACTIVE, INACTIVE, or ALL.",
            });
            return;
        }

        const categories = await getAllCategories(status as CategoryStatus);

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        console.error("Get categories error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

// POST /api/components/categories
export async function createCategoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const { name, description } = req.body ?? {};

        if (typeof name !== "string" || !name.trim()) {
            res.status(400).json({
                success: false,
                message: "Category name is required.",
            });
            return;
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {
            res.status(400).json({
                success: false,
                message: "Description must be a string.",
            });
            return;
        }

        const category = await createCategory({
            name,
            description,
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            data: category,
        });
    } catch (error) {
        if (hasPrismaErrorCode(error, "P2002")) {
            res.status(409).json({
                success: false,
                message: "A category with this name already exists.",
            });
            return;
        }

        console.error("Create category error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

// DELETE /api/components/categories/:categoryId
export async function deleteCategoryController(
    req: Request<{ categoryId: string }>,
    res: Response,
): Promise<void> {
    try {
        const { categoryId } = req.params;

        if (!UUID_REGEX.test(categoryId)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID.",
            });
            return;
        }

        const result = await deleteCategory(categoryId);

        switch (result.outcome) {
            case "NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Category not found.",
                });
                return;

            case "HAS_COMPONENTS":
                res.status(409).json({
                    success: false,
                    message: "Category cannot be deleted because it contains components.",
                    componentCount: result.componentCount,
                });
                return;

            case "BLOCKED_BY_REFERENCE":
                res.status(409).json({
                    success: false,
                    message: "Category is referenced by existing records and cannot be deleted.",
                });
                return;

            case "DELETED":
                res.status(200).json({
                    success: true,
                    message: "Category deleted successfully.",
                });
                return;
        }
    } catch (error) {
        console.error("Delete category error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

// PATCH /api/components/categories/:categoryId
export async function updateCategoryController(
    req: Request<{ categoryId: string }>,
    res: Response,
): Promise<void> {
    try {
        const { categoryId } = req.params;

        if (!UUID_REGEX.test(categoryId)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID.",
            });
            return;
        }

        const body = req.body ?? {};
        const { name, description } = body;

        if (name !== undefined && (typeof name !== "string" || !name.trim())) {
            res.status(400).json({
                success: false,
                message: "Category name must be a non-empty string.",
            });
            return;
        }

        if (
            description !== undefined &&
            description !== null &&
            typeof description !== "string"
        ) {
            res.status(400).json({
                success: false,
                message: "Description must be a string or null.",
            });
            return;
        }

        if (name === undefined && description === undefined) {
            res.status(400).json({
                success: false,
                message: "Provide at least one field to update.",
            });
            return;
        }

        const category = await updateCategory(categoryId, {
            ...(name !== undefined && { name: name.trim() }),
            ...(description !== undefined && {
                description: description === null ? null : description.trim(),
            }),
        });

        res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: category,
        });
    } catch (error) {
        if (hasPrismaErrorCode(error, "P2002")) {
            res.status(409).json({
                success: false,
                message: "A category with this name already exists.",
            });
            return;
        }

        if (hasPrismaErrorCode(error, "P2025")) {
            res.status(404).json({
                success: false,
                message: "Category not found.",
            });
            return;
        }

        console.error("Update category error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

// PATCH /api/components/categories/:categoryId/deactivate
export async function deactivateCategoryController(
    req: Request<{ categoryId: string }>,
    res: Response,
): Promise<void> {
    try {
        const { categoryId } = req.params;

        if (!UUID_REGEX.test(categoryId)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID.",
            });
            return;
        }

        const result = await deactivateCategory(categoryId);

        switch (result.outcome) {
            case "NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Category not found.",
                });
                return;

            case "ALREADY_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Category is already inactive.",
                });
                return;

            case "DEACTIVATED":
                res.status(200).json({
                    success: true,
                    message: "Category deactivated successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Deactivate category error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

// PATCH /api/components/categories/:categoryId/activate
export async function activateCategoryController(
    req: Request<{ categoryId: string }>,
    res: Response,
): Promise<void> {
    try {
        const { categoryId } = req.params;

        if (!UUID_REGEX.test(categoryId)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID.",
            });
            return;
        }

        const result = await activateCategory(categoryId);

        switch (result.outcome) {
            case "NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Category not found.",
                });
                return;

            case "ALREADY_ACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Category is already active.",
                });
                return;

            case "ACTIVATED":
                res.status(200).json({
                    success: true,
                    message: "Category activated successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Activate category error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}