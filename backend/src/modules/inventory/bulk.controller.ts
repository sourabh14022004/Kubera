import type { Request, Response } from "express";
import { adjustBulkInventory, checkoutBulkInventory, returnBulkInventory, stockInBulkInventory, writeOffBulkInventory, writeOffBulkLoan } from "./bulk.service.js";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


export async function checkoutBulkInventoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        const {
            componentId,
            memberId,
            quantity,
            dueAt,
            note,
        } = req.body;

        // Validate component ID
        if (
            typeof componentId !== "string" ||
            !UUID_REGEX.test(componentId) ||
            typeof memberId !== "string" ||
            !UUID_REGEX.test(memberId)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid component ID or member ID.",
            });
            return;
        }

        // Validate member ID
        if (
            typeof memberId !== "string" ||
            !UUID_REGEX.test(memberId)
        ) {
            res.status(400).json({
                success: false,
                message: "A valid member ID is required.",
            });
            return;
        }

        // Validate quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
            res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer.",
            });
            return;
        }

        // Validate optional due date
        let parsedDueAt: Date | undefined;

        if (dueAt !== undefined && dueAt !== null) {
            if (
                typeof dueAt !== "string" ||
                Number.isNaN(Date.parse(dueAt)) ||
                Date.parse(dueAt) <= Date.now()
            ) {
                res.status(400).json({
                    success: false,
                    message: "Due date must be a valid future date.",
                });
                return;
            }

            parsedDueAt = new Date(dueAt);
        }

        // Validate optional note
        if (note !== undefined && typeof note !== "string") {
            res.status(400).json({
                success: false,
                message: "Note must be a string.",
            });
            return;
        }

        const issuedById = res.locals.KuberaUser.id;

        const result = await checkoutBulkInventory({
            componentId,
            memberId,
            issuedById,
            quantity,
            dueAt: parsedDueAt,
            note,
        });

        switch (result.outcome) {
            case "COMPONENT_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Component not found.",
                });
                return;

            case "COMPONENT_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Component is inactive.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(400).json({
                    success: false,
                    message: "This component is not tracked as bulk inventory.",
                });
                return;

            case "INVALID_STOCK_CONFIGURATION":
                res.status(409).json({
                    success: false,
                    message: "Invalid bulk stock configuration.",
                });
                return;

            case "MEMBER_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Member not found.",
                });
                return;

            case "MEMBER_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Member account is inactive.",
                });
                return;

            case "INVALID_QUANTITY":
                res.status(400).json({
                    success: false,
                    message: "Quantity must be a positive integer.",
                });
                return;

            case "INSUFFICIENT_STOCK":
                res.status(409).json({
                    success: false,
                    message: "Insufficient stock available.",
                    availableQuantity: result.availableQuantity,
                });
                return;

            case "CHECKED_OUT":
                res.status(201).json({
                    success: true,
                    message: "Bulk inventory checked out successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Bulk checkout error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function returnBulkInventoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { loanId, quantity, note } = req.body;

        // Validate loan ID
        if (
            typeof loanId !== "string" ||
            !UUID_REGEX.test(loanId)
        ) {
            res.status(400).json({
                success: false,
                message: "Valid loan ID is required.",
            });
            return;
        }

        // Validate quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
            res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer.",
            });
            return;
        }

        // Validate optional note
        if (note !== undefined && typeof note !== "string") {
            res.status(400).json({
                success: false,
                message: "Note must be a string.",
            });
            return;
        }

        const result = await returnBulkInventory({
            loanId,
            quantity,
            note,
            returnedById: res.locals.KuberaUser.id,
        });

        switch (result.outcome) {
            case "INVALID_QUANTITY":
                res.status(400).json({
                    success: false,
                    message: "Invalid return quantity.",
                });
                return;

            case "LOAN_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Loan not found.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(409).json({
                    success: false,
                    message: "This loan is not a bulk inventory loan.",
                });
                return;

            case "INVALID_STOCK_CONFIGURATION":
                res.status(409).json({
                    success: false,
                    message: "Invalid component stock configuration.",
                });
                return;

            case "LOAN_ALREADY_CLOSED":
                res.status(409).json({
                    success: false,
                    message: "This loan is already closed.",
                });
                return;

            case "EXCEEDS_OUTSTANDING_QUANTITY":
                res.status(409).json({
                    success: false,
                    message: "Return quantity exceeds outstanding quantity.",
                    outstandingQuantity: result.outstandingQuantity,
                });
                return;

            case "CONCURRENT_UPDATE":
                res.status(409).json({
                    success: false,
                    message: "Loan was updated concurrently. Please retry.",
                });
                return;

            case "RETURNED":
                res.status(200).json({
                    success: true,
                    message: "Bulk inventory returned successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Bulk return error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function stockInBulkInventoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { componentId, quantity, note } = req.body;

        if (
            typeof componentId !== "string" ||
            !UUID_REGEX.test(componentId)
        ) {
            res.status(400).json({
                success: false,
                message: "Valid component ID is required.",
            });
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer.",
            });
            return;
        }

        if (note !== undefined && typeof note !== "string") {
            res.status(400).json({
                success: false,
                message: "Note must be a string.",
            });
            return;
        }

        const result = await stockInBulkInventory({
            componentId,
            quantity,
            note,
            performedById: res.locals.KuberaUser.id,
        });

        switch (result.outcome) {
            case "INVALID_QUANTITY":
                res.status(400).json({
                    success: false,
                    message: "Invalid stock-in quantity.",
                });
                return;

            case "COMPONENT_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Component not found.",
                });
                return;

            case "COMPONENT_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot add stock to an inactive component.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(409).json({
                    success: false,
                    message: "Stock-in is only supported for bulk components.",
                });
                return;

            case "INVALID_STOCK_CONFIGURATION":
                res.status(409).json({
                    success: false,
                    message: "Invalid component stock configuration.",
                });
                return;

            case "STOCK_UPDATE_FAILED":
                res.status(409).json({
                    success: false,
                    message: "Stock could not be updated. Please retry.",
                });
                return;

            case "STOCK_ADDED":
                res.status(200).json({
                    success: true,
                    message: "Bulk inventory stock added successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Bulk stock-in error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function adjustBulkInventoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { componentId, adjustment, note } = req.body;

        if (
            typeof componentId !== "string" ||
            !UUID_REGEX.test(componentId)
        ) {
            res.status(400).json({
                success: false,
                message: "Valid component ID is required.",
            });
            return;
        }

        if (
            !Number.isSafeInteger(adjustment) ||
            adjustment === 0 ||
            Math.abs(adjustment) > 2147483647
        ) {
            res.status(400).json({
                success: false,
                message: "Adjustment must be a non-zero integer.",
            });
            return;
        }

        if (typeof note !== "string" || !note.trim()) {
            res.status(400).json({
                success: false,
                message: "A reason for the adjustment is required.",
            });
            return;
        }

        const result = await adjustBulkInventory({
            componentId,
            adjustment,
            note,
            performedById: res.locals.KuberaUser.id,
        });

        switch (result.outcome) {
            case "INVALID_ADJUSTMENT":
                res.status(400).json({
                    success: false,
                    message: "Invalid stock adjustment.",
                });
                return;

            case "NOTE_REQUIRED":
                res.status(400).json({
                    success: false,
                    message: "A reason for the adjustment is required.",
                });
                return;

            case "COMPONENT_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Component not found.",
                });
                return;

            case "COMPONENT_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot adjust stock of an inactive component.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(409).json({
                    success: false,
                    message: "Stock adjustment is only supported for bulk components.",
                });
                return;

            case "INVALID_STOCK_CONFIGURATION":
                res.status(409).json({
                    success: false,
                    message: "Invalid component stock configuration.",
                });
                return;

            case "INSUFFICIENT_STOCK":
                res.status(409).json({
                    success: false,
                    message: "Adjustment would reduce stock below zero.",
                    availableQuantity: result.availableQuantity,
                });
                return;

            case "STOCK_UPDATE_FAILED":
                res.status(409).json({
                    success: false,
                    message: "Stock adjustment failed. Please retry.",
                });
                return;

            case "ADJUSTED":
                res.status(200).json({
                    success: true,
                    message: "Bulk inventory adjusted successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Bulk stock adjustment error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function writeOffBulkInventoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        if (
            typeof req.body !== "object" ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid request body.",
            });
            return;
        }

        const { componentId, quantity, reason, note } = req.body;

        if (
            typeof componentId !== "string" ||
            !UUID_REGEX.test(componentId)
        ) {
            res.status(400).json({
                success: false,
                message: "Valid component ID is required.",
            });
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer.",
            });
            return;
        }

        if (reason !== "DAMAGED" && reason !== "LOST") {
            res.status(400).json({
                success: false,
                message: "Reason must be DAMAGED or LOST.",
            });
            return;
        }

        if (typeof note !== "string" || !note.trim()) {
            res.status(400).json({
                success: false,
                message: "A reason description is required.",
            });
            return;
        }

        const result = await writeOffBulkInventory({
            componentId,
            quantity,
            reason,
            note,
            performedById: res.locals.KuberaUser.id,
        });

        switch (result.outcome) {
            case "INVALID_QUANTITY":
                res.status(400).json({
                    success: false,
                    message: "Invalid write-off quantity.",
                });
                return;

            case "NOTE_REQUIRED":
                res.status(400).json({
                    success: false,
                    message: "A reason description is required.",
                });
                return;

            case "INVALID_REASON":
                res.status(400).json({
                    success: false,
                    message: "Invalid write-off reason.",
                });
                return;

            case "COMPONENT_NOT_FOUND":
                res.status(404).json({
                    success: false,
                    message: "Component not found.",
                });
                return;

            case "COMPONENT_INACTIVE":
                res.status(409).json({
                    success: false,
                    message: "Cannot write off stock from an inactive component.",
                });
                return;

            case "INVALID_TRACKING_TYPE":
                res.status(409).json({
                    success: false,
                    message: "Write-off is only supported for bulk components.",
                });
                return;

            case "INVALID_STOCK_CONFIGURATION":
                res.status(409).json({
                    success: false,
                    message: "Invalid component stock configuration.",
                });
                return;

            case "INSUFFICIENT_STOCK":
                res.status(409).json({
                    success: false,
                    message: "Write-off quantity exceeds available stock.",
                    availableQuantity: result.availableQuantity,
                });
                return;

            case "WRITTEN_OFF":
                res.status(200).json({
                    success: true,
                    message: "Bulk inventory written off successfully.",
                    data: result.data,
                });
                return;
        }
    } catch (error) {
        console.error("Bulk inventory write-off error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

export async function writeOffBulkLoanController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (
      typeof req.body !== "object" ||
      req.body === null ||
      Array.isArray(req.body)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
      return;
    }

    const { loanId, quantity, reason, note } = req.body;

    if (
      typeof loanId !== "string" ||
      !UUID_REGEX.test(loanId)
    ) {
      res.status(400).json({
        success: false,
        message: "Valid loan ID is required.",
      });
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 2147483647
    ) {
      res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer.",
      });
      return;
    }

    if (reason !== "DAMAGED" && reason !== "LOST") {
      res.status(400).json({
        success: false,
        message: "Reason must be DAMAGED or LOST.",
      });
      return;
    }

    if (typeof note !== "string" || !note.trim()) {
      res.status(400).json({
        success: false,
        message: "A reason description is required.",
      });
      return;
    }

    const result = await writeOffBulkLoan({
      loanId,
      quantity,
      reason,
      note,
      performedById: res.locals.KuberaUser.id,
    });

    switch (result.outcome) {
      case "INVALID_QUANTITY":
        res.status(400).json({
          success: false,
          message: "Invalid write-off quantity.",
        });
        return;

      case "NOTE_REQUIRED":
        res.status(400).json({
          success: false,
          message: "A reason description is required.",
        });
        return;

      case "INVALID_REASON":
        res.status(400).json({
          success: false,
          message: "Invalid write-off reason.",
        });
        return;

      case "LOAN_NOT_FOUND":
        res.status(404).json({
          success: false,
          message: "Loan not found.",
        });
        return;

      case "INVALID_TRACKING_TYPE":
        res.status(409).json({
          success: false,
          message: "This is not a bulk inventory loan.",
        });
        return;

      case "LOAN_ALREADY_CLOSED":
        res.status(409).json({
          success: false,
          message: "This loan is already closed.",
        });
        return;

      case "EXCEEDS_OUTSTANDING_QUANTITY":
        res.status(409).json({
          success: false,
          message: "Write-off quantity exceeds outstanding quantity.",
          outstandingQuantity: result.outstandingQuantity,
        });
        return;

      case "CONCURRENT_UPDATE":
        res.status(409).json({
          success: false,
          message: "Loan was updated concurrently. Please retry.",
        });
        return;

      case "WRITTEN_OFF":
        res.status(200).json({
          success: true,
          message: "Borrowed inventory written off successfully.",
          data: result.data,
        });
        return;
    }
  } catch (error) {
    console.error("Bulk loan write-off error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}