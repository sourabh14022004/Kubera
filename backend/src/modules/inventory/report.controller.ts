import type { Request, Response } from "express";
import { getBorrowingAnalytics, getDamageLossAnalytics, getInventoryActivityTrends, getInventoryOverview, getMovementAnalytics, getMovementHistory, getStockAlerts } from "./report.service.js";
import { InventoryMovementType } from "../../generated/prisma/enums.js";


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getInventoryOverviewController(
    _req: Request,
    res: Response,
): Promise<void> {
    try {
        const data = await getInventoryOverview();

        res.status(200).json({
            success: true,
            message: "Inventory overview retrieved successfully.",
            data,
        });
    } catch (error) {
        console.error("Inventory overview error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory overview.",
        });
    }
}

export async function getStockAlertsController(
    _req: Request,
    res: Response,
): Promise<void> {
    try {
        const data = await getStockAlerts();

        res.status(200).json({
            success: true,
            message: "Stock alerts retrieved successfully.",
            data,
            total: data.length,
        });
    } catch (error) {
        console.error("Stock alerts error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve stock alerts.",
        });
    }
}

export async function getMovementHistoryController(
    req: Request,
    res: Response,
): Promise<void> {
    try {
        // 1. Validate query parameter types
        const queryFields = [
            "componentId",
            "movementType",
            "memberId",
            "performedById",
            "from",
            "to",
            "page",
            "limit",
        ] as const;

        for (const field of queryFields) {
            const value = req.query[field];

            if (value !== undefined && typeof value !== "string") {
                res.status(400).json({
                    success: false,
                    message: `Invalid ${field} query parameter.`,
                });
                return;
            }
        }

        const componentId = req.query.componentId as string | undefined;
        const movementType = req.query.movementType as string | undefined;
        const memberId = req.query.memberId as string | undefined;
        const performedById = req.query.performedById as string | undefined;
        const fromValue = req.query.from as string | undefined;
        const toValue = req.query.to as string | undefined;
        const pageValue = req.query.page as string | undefined;
        const limitValue = req.query.limit as string | undefined;

        // 2. Validate UUID filters
        for (const [field, value] of [
            ["componentId", componentId],
            ["memberId", memberId],
            ["performedById", performedById],
        ] as const) {
            if (value !== undefined && !UUID_REGEX.test(value)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid ${field}.`,
                });
                return;
            }
        }

        // 3. Validate movement type
        if (
            movementType !== undefined &&
            !Object.values(InventoryMovementType).includes(
                movementType as InventoryMovementType,
            )
        ) {
            res.status(400).json({
                success: false,
                message: "Invalid movement type.",
                allowedMovementTypes: Object.values(InventoryMovementType),
            });
            return;
        }

        // 4. Validate date range
        const from = fromValue ? new Date(fromValue) : undefined;
        const to = toValue ? new Date(toValue) : undefined;

        if (from && Number.isNaN(from.getTime())) {
            res.status(400).json({
                success: false,
                message: "Invalid from date.",
            });
            return;
        }

        if (to && Number.isNaN(to.getTime())) {
            res.status(400).json({
                success: false,
                message: "Invalid to date.",
            });
            return;
        }

        if (from && to && from > to) {
            res.status(400).json({
                success: false,
                message: "From date cannot be later than to date.",
            });
            return;
        }

        // 5. Validate pagination
        const page = pageValue === undefined ? 1 : Number(pageValue);
        const limit = limitValue === undefined ? 20 : Number(limitValue);

        if (!Number.isSafeInteger(page) || page < 1) {
            res.status(400).json({
                success: false,
                message: "Page must be a positive integer.",
            });
            return;
        }

        if (
            !Number.isSafeInteger(limit) ||
            limit < 1 ||
            limit > 100
        ) {
            res.status(400).json({
                success: false,
                message: "Limit must be between 1 and 100.",
            });
            return;
        }

        // 6. Retrieve filtered movement history
        const data = await getMovementHistory({
            componentId,
            movementType: movementType as InventoryMovementType | undefined,
            memberId,
            performedById,
            from,
            to,
            page,
            limit,
        });

        res.status(200).json({
            success: true,
            message: "Inventory movement history retrieved successfully.",
            data,
        });
    } catch (error) {
        console.error("Movement history report error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory movement history.",
        });
    }
}

export async function getMovementAnalyticsController(
    _req: Request,
    res: Response
) {
    try {
        const data = await getMovementAnalytics();

        return res.status(200).json({
            success: true,
            message: "Movement analytics retrieved successfully.",
            data,
        });
    } catch (error) {
        console.error("Movement analytics error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve movement analytics.",
        });
    }
}


export async function getDamageLossAnalyticsController(
  _req: Request,
  res: Response
) {
  try {
    const data = await getDamageLossAnalytics();

    return res.status(200).json({
      success: true,
      message: "Damage and loss analytics retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("Damage and loss analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve damage and loss analytics.",
    });
  }
}



export async function getBorrowingAnalyticsController(
  _req: Request,
  res: Response
) {
  try {
    const data = await getBorrowingAnalytics();

    return res.status(200).json({
      success: true,
      message: "Borrowing analytics retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("Borrowing analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve borrowing analytics.",
    });
  }
}



function parseActivityDate(value: unknown): Date | null | "INVALID" {
  if (value === undefined) return null;

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "INVALID";
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return "INVALID";
  }

  return date;
}

export async function getInventoryActivityTrendsController(
  req: Request,
  res: Response
) {
  try {
    const intervalQuery = req.query.interval;

    if (
      intervalQuery !== undefined &&
      typeof intervalQuery !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Interval must be DAY or MONTH.",
      });
    }

    const interval =
      intervalQuery === undefined ? "DAY" : intervalQuery.toUpperCase();

    if (interval !== "DAY" && interval !== "MONTH") {
      return res.status(400).json({
        success: false,
        message: "Invalid interval. Use DAY or MONTH.",
      });
    }

    const fromDate = parseActivityDate(req.query.from);
    const toDate = parseActivityDate(req.query.to);

    if (fromDate === "INVALID" || toDate === "INVALID") {
      return res.status(400).json({
        success: false,
        message: "Dates must be valid and use YYYY-MM-DD format.",
      });
    }

    if (fromDate && toDate && fromDate > toDate) {
      return res.status(400).json({
        success: false,
        message: "'from' date cannot be after 'to' date.",
      });
    }

    // Calculate the effective range, including default dates.
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const effectiveStart =
      fromDate ??
      (interval === "DAY"
        ? new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
        : new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1)
          ));

    const effectiveEnd = toDate ?? today;

    let bucketCount: number;

    if (interval === "DAY") {
      const start = Date.UTC(
        effectiveStart.getUTCFullYear(),
        effectiveStart.getUTCMonth(),
        effectiveStart.getUTCDate()
      );

      const endExclusive = Date.UTC(
        effectiveEnd.getUTCFullYear(),
        effectiveEnd.getUTCMonth(),
        effectiveEnd.getUTCDate() + 1
      );

      bucketCount = (endExclusive - start) / (24 * 60 * 60 * 1000);
    } else {
      const startMonth =
        effectiveStart.getUTCFullYear() * 12 +
        effectiveStart.getUTCMonth();

      const endMonth =
        effectiveEnd.getUTCFullYear() * 12 +
        effectiveEnd.getUTCMonth();

      bucketCount = endMonth - startMonth + 1;
    }

    const maxBuckets = interval === "DAY" ? 366 : 60;

    if (bucketCount <= 0 || bucketCount > maxBuckets) {
      return res.status(400).json({
        success: false,
        message:
          interval === "DAY"
            ? "Daily trends support a maximum range of 366 days."
            : "Monthly trends support a maximum range of 60 months.",
      });
    }

    const data = await getInventoryActivityTrends({
      interval,
      from: fromDate ?? undefined,
      to: toDate ?? undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Inventory activity trends retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("Inventory activity trends error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inventory activity trends.",
    });
  }
}
