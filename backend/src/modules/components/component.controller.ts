import type { Request, Response } from "express";
import { TrackingType } from "../../generated/prisma/client.js";
import {
    createComponent,
    getAllComponents,
    updateComponent,
    type ComponentStatus,
    type ComponentStockStatus,
} from "./component.service.js";

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

// POST /api/components
export async function createComponentController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const {
            code,
            name,
            description,
            categoryId,
            trackingType,
            initialQuantity,
            unit,
            minimumStock,
            storageDrawerId,
        } = body;

        // Validate required fields.
        if (typeof code !== "string" || !code.trim()) {
            res.status(400).json({
                success: false,
                message: "Component code is required.",
            });
            return;
        }

        if (typeof name !== "string" || !name.trim()) {
            res.status(400).json({
                success: false,
                message: "Component name is required.",
            });
            return;
        }

        if (typeof categoryId !== "string" || !UUID_REGEX.test(categoryId)) {
            res.status(400).json({
                success: false,
                message: "A valid category ID is required.",
            });
            return;
        }

        // Validate tracking type.
        if (
            trackingType !== TrackingType.BULK &&
            trackingType !== TrackingType.INDIVIDUAL
        ) {
            res.status(400).json({
                success: false,
                message: "Tracking type must be BULK or INDIVIDUAL.",
            });
            return;
        }

        // Validate optional description.
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

        // Validate initial quantity.
        if (
            initialQuantity !== undefined &&
            (!Number.isInteger(initialQuantity) || initialQuantity < 0)
        ) {
            res.status(400).json({
                success: false,
                message: "Initial quantity must be a non-negative integer.",
            });
            return;
        }

        if (
            trackingType === TrackingType.INDIVIDUAL &&
            initialQuantity !== undefined
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Initial quantity is not applicable to INDIVIDUAL components. Register physical assets separately.",
            });
            return;
        }

        // Validate minimum stock.
        if (
            minimumStock !== undefined &&
            (!Number.isInteger(minimumStock) || minimumStock < 0)
        ) {
            res.status(400).json({
                success: false,
                message: "Minimum stock must be a non-negative integer.",
            });
            return;
        }

        // Validate unit.
        if (
            unit !== undefined &&
            (typeof unit !== "string" || !unit.trim())
        ) {
            res.status(400).json({
                success: false,
                message: "Unit must be a non-empty string.",
            });
            return;
        }

        // Validate optional drawer.
        if (
            storageDrawerId !== undefined &&
            storageDrawerId !== null &&
            (typeof storageDrawerId !== "string" ||
                !UUID_REGEX.test(storageDrawerId))
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid storage drawer ID.",
            });
            return;
        }

        // Get the authenticated internal Kubera user.
        const user = res.locals.KuberaUser;

        if (!user?.id || !UUID_REGEX.test(user.id)) {
            res.status(401).json({
                success: false,
                message: "Authenticated Kubera user not found.",
            });
            return;
        }

        const result = await createComponent({
            code,
            name,
            description,
            categoryId,
            trackingType,
            initialQuantity,
            unit,
            minimumStock,
            storageDrawerId,
            performedById: user.id,
        });

        switch (result.outcome) {
            case "CATEGORY_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Category not found.",
                });
                return;

            case "CATEGORY_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot create a component under an inactive category.",
                });
                return;

            case "DRAWER_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Storage drawer not found.",
                });
                return;

            case "RACK_RETIRED":
                res.status(409).json({
                    success: false,
                    message: "Cannot assign a component to a retired rack.",
                });
                return;

            case "CREATED":
                res.status(201).json({
                    success: true,
                    message: "Component created successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        if (hasPrismaErrorCode(error, "P2002")) {
            res.status(409).json({
                success: false,
                message: "A component with this code already exists.",
            });
            return;
        }

        if (hasPrismaErrorCode(error, "P2003")) {
            res.status(409).json({
                success: false,
                message: "A referenced record no longer exists.",
            });
            return;
        }

        console.error("Create component error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

// GET /api/components
export async function getAllComponentsController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const {
            search,
            categoryId,
            trackingType,
            storageDrawerId,
            status,
            stockStatus,
            page,
            limit,
        } = req.query;

        // Ensure query parameters are single strings.
        const queryValues = [
            search,
            categoryId,
            trackingType,
            storageDrawerId,
            status,
            stockStatus,
            page,
            limit,
        ];

        if (queryValues.some((value) => value !== undefined && typeof value !== "string")) {
            res.status(400).json({
                success: false,
                message: "Invalid query parameters.",
            });
            return;
        }

        // Validate status.
        const componentStatus = String(status ?? "ACTIVE").toUpperCase();

        if (!["ACTIVE", "INACTIVE", "ALL"].includes(componentStatus)) {
            res.status(400).json({
                success: false,
                message: "Status must be ACTIVE, INACTIVE, or ALL.",
            });
            return;
        }

        // Validate tracking type.
        const selectedTrackingType =
            trackingType === undefined
                ? undefined
                : String(trackingType).toUpperCase();

        if (
            selectedTrackingType !== undefined &&
            selectedTrackingType !== TrackingType.BULK &&
            selectedTrackingType !== TrackingType.INDIVIDUAL
        ) {
            res.status(400).json({
                success: false,
                message: "Tracking type must be BULK or INDIVIDUAL.",
            });
            return;
        }

        // Validate optional UUID filters.
        if (
            categoryId !== undefined &&
            !UUID_REGEX.test(String(categoryId))
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID.",
            });
            return;
        }

        if (
            storageDrawerId !== undefined &&
            !UUID_REGEX.test(String(storageDrawerId))
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid storage drawer ID.",
            });
            return;
        }

        const selectedStockStatus =
            stockStatus === undefined
                ? undefined
                : String(stockStatus).toUpperCase();

        if (
            selectedStockStatus !== undefined &&
            !["LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"].includes(
                selectedStockStatus,
            )
        ) {
            res.status(400).json({
                success: false,
                message: "Stock status must be LOW_STOCK, OUT_OF_STOCK, or IN_STOCK.",
            });
            return;
        }

        // Validate pagination.
        const pageNumber = Number(page ?? "1");
        const limitNumber = Number(limit ?? "20");

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1 ||
            !Number.isInteger(limitNumber) ||
            limitNumber < 1 ||
            limitNumber > 100
        ) {
            res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100.",
            });
            return;
        }

        const result = await getAllComponents({
            search: typeof search === "string" ? search.trim() : undefined,
            categoryId: categoryId as string | undefined,
            trackingType: selectedTrackingType as TrackingType | undefined,
            storageDrawerId: storageDrawerId as string | undefined,
            status: componentStatus as ComponentStatus,
            stockStatus: selectedStockStatus as ComponentStockStatus | undefined,
            page: pageNumber,
            limit: limitNumber,
        });

        res.status(200).json({
            success: true,
            count: result.data.length,
            pagination: result.pagination,
            data: result.data,
        });
    } catch (error) {
        console.error("Get components error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }

}

// PATCH /api/components/:componentId
export async function updateComponentController(
  req: Request<{ componentId: string }>,
  res: Response,
): Promise<void> {
  try {
    const { componentId } = req.params;

    if (!UUID_REGEX.test(componentId)) {
      res.status(400).json({
        success: false,
        message: "Invalid component ID.",
      });
      return;
    }

    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
      return;
    }

    const allowedFields = [
      "code",
      "name",
      "description",
      "categoryId",
      "unit",
      "minimumStock",
      "storageDrawerId",
    ];

    const unsupportedFields = Object.keys(body).filter(
      (key) => !allowedFields.includes(key),
    );

    if (unsupportedFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "Unsupported fields in request body.",
        fields: unsupportedFields,
      });
      return;
    }

    const {
      code,
      name,
      description,
      categoryId,
      unit,
      minimumStock,
      storageDrawerId,
    } = body;

    if (
      Object.keys(body).length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
      return;
    }

    if (
      code !== undefined &&
      (typeof code !== "string" || !code.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Component code must be a non-empty string.",
      });
      return;
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Component name must be a non-empty string.",
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

    if (
      categoryId !== undefined &&
      (typeof categoryId !== "string" ||
        !UUID_REGEX.test(categoryId))
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID.",
      });
      return;
    }

    if (
      unit !== undefined &&
      (typeof unit !== "string" || !unit.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Unit must be a non-empty string.",
      });
      return;
    }

    if (
      minimumStock !== undefined &&
      (!Number.isInteger(minimumStock) || minimumStock < 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Minimum stock must be a non-negative integer.",
      });
      return;
    }

    if (
      storageDrawerId !== undefined &&
      storageDrawerId !== null &&
      (typeof storageDrawerId !== "string" ||
        !UUID_REGEX.test(storageDrawerId))
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid storage drawer ID.",
      });
      return;
    }

    const result = await updateComponent(componentId, {
      code,
      name,
      description,
      categoryId,
      unit,
      minimumStock,
      storageDrawerId,
    });

    switch (result.outcome) {
      case "NOT_FOUND":
        res.status(404).json({
          success: false,
          message: "Component not found.",
        });
        return;

      case "CATEGORY_NOT_FOUND":
        res.status(404).json({
          success: false,
          message: "Category not found.",
        });
        return;

      case "CATEGORY_INACTIVE":
        res.status(409).json({
          success: false,
          message: "Cannot assign an inactive category.",
        });
        return;

      case "DRAWER_NOT_FOUND":
        res.status(404).json({
          success: false,
          message: "Storage drawer not found.",
        });
        return;

      case "RACK_RETIRED":
        res.status(409).json({
          success: false,
          message: "Cannot assign a component to a retired rack.",
        });
        return;

      case "UPDATED":
        res.status(200).json({
          success: true,
          message: "Component updated successfully.",
          data: result.data,
        });
        return;
    }
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      res.status(409).json({
        success: false,
        message: "A component with this code already exists.",
      });
      return;
    }

    if (hasPrismaErrorCode(error, "P2003")) {
      res.status(409).json({
        success: false,
        message: "A referenced record no longer exists.",
      });
      return;
    }

    if (hasPrismaErrorCode(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Component not found.",
      });
      return;
    }

    console.error("Update component error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}