import type { Request, Response } from "express";
import { TrackingType } from "../../generated/prisma/client.js";
import { createComponent } from "./component.service.js";

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