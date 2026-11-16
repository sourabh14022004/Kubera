
import type { Request, Response } from "express";
import {
  StorageColor,
  StorageRackStatus
} from "../../generated/prisma/enums.js";
import {
  getAllRacks,
  getRackById,
  getDrawerById,
  createRack,
  ALLOWED_DRAWERS,
  retireRack,
  restoreRack
} from "./storage.service.js";
import { json } from "node:stream/consumers";

// Basic UUID validation before querying PostgreSQL.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/storage/racks

export async function getAllRacksController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const requestedStatus = req.query.status;

    let status: StorageRackStatus | "ALL" =
      StorageRackStatus.ACTIVE;

    if (requestedStatus !== undefined) {
      const allowedStatuses = [
        "ACTIVE",
        "RETIRED",
        "ALL",
      ];

      if (
        typeof requestedStatus !== "string" ||
        !allowedStatuses.includes(requestedStatus)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid rack status filter.",
        });
        return;
      }

      status = requestedStatus as StorageRackStatus | "ALL";
    }

    const racks = await getAllRacks(status);

    res.status(200).json({
      success: true,
      count: racks.length,
      data: racks,
    });
  } catch (error) {
    console.error("Failed to fetch storage racks:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch storage racks.",
    });
  }
}


// GET /api/storage/racks/:rackId
export async function getRackByIdController(
  req: Request<{ rackId: string }>,
  res: Response,
): Promise<void> {
  try {
    const { rackId } = req.params;

    if (!UUID_REGEX.test(rackId)) {
      res.status(400).json({
        success: false,
        message: "Invalid rack ID.",
      });
      return;
    }

    const rack = await getRackById(rackId);

    if (!rack) {
      res.status(404).json({
        success: false,
        message: "Storage rack not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: rack,
    });
  } catch (error) {
    console.error("Failed to fetch storage rack:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch storage rack.",
    });
  }
}

// GET /api/storage/drawers/:drawerId
export async function getDrawerByIdController(
  req: Request<{ drawerId: string }>,
  res: Response,
): Promise<void> {
  try {
    const { drawerId } = req.params;

    if (!UUID_REGEX.test(drawerId)) {
      res.status(400).json({
        success: false,
        message: "Invalid drawer ID.",
      });
      return;
    }

    const drawer = await getDrawerById(drawerId);

    if (!drawer) {
      res.status(404).json({
        success: false,
        message: "Storage drawer not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: drawer,
    });
  } catch (error) {
    console.error("Failed to fetch storage drawer:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch storage drawer.",
    });
  }
}


// POST /api/storage/racks 
export async function createRackController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { color, drawersPerRack } = req.body;

    // Validate storage color.
    if (
      typeof color !== "string" ||
      !Object.values(StorageColor).includes(color as StorageColor)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid storage color.",
      });
      return;
    }

    // Validate drawer count against physical rack configuration.
    if (
      typeof drawersPerRack !== "number" ||
      !Number.isInteger(drawersPerRack) ||
      !ALLOWED_DRAWERS[color as StorageColor].includes(drawersPerRack)
    ) {
      res.status(400).json({
        success: false,
        message: `Invalid drawer count for ${color}.`,
      });
      return;
    }

    const rack = await createRack(
      color as StorageColor,
      drawersPerRack,
    );

    res.status(201).json({
      success: true,
      message: "Storage rack created successfully.",
      data: rack,
    });
  } catch (error) {
    console.error("Failed to create storage rack:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create storage rack.",
    });
  }
}

// Retire Rack unit controller..
export async function retireRackController(
  req: Request<{ rackId: string }>,
  res: Response,
): Promise<void> {
  try {
    const { rackId } = req.params;

    if (!UUID_REGEX.test(rackId)) {
      res.status(400).json({
        success: false,
        message: "Invalid rack ID.",
      });

      return;
    }

    const result = await retireRack(rackId);

    switch (result.outcome) {
      case "NOT_FOUND":
        res.status(404).json({
          success: false,
          message: "Storage rack not found.",
        })
        return;

      case "ALREADY_RETIRED":
        res.status(409).json({
          success: false,
          message: "This rack is already retired.",
        });
        return;

      case "HAS_COMPONENTS":
        res.status(409).json({
          success: false,
          message: "Cannot retire a rack containing components.",
          componentCount: result.componentCount,
        });
        return;

      case "RETIRED":
        res.status(200).json({
          success: true,
          message: "Storage rack retired successfully.",
          data: result.data,
        });
        return;
    }

  } catch (error) {
    console.log("Failed to retire storage rack:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retire storage rack.",
    });
  }
}

export async function restoreRackController(
  req: Request<{ rackId: string }>,
  res: Response,
): Promise<void> {
  try {
    const { rackId } = req.params;

    if (!UUID_REGEX.test(rackId)) {
      res.status(400).json({
        success: false,
        message: "Ivalid rack ID."
      })
      return;
    }
    const result = await restoreRack(rackId);

    switch (result.outcome) {
      case "NOT_FOUND":
        res.status(404).json({
          success: false,
          message: "Rack not Found."
        })
        return;

      case "ALREADY_ACTIVE":
        res.status(409).json({
          success: false,
          message: "Rack is already active.",
        })
        return;
      
      case "RESTORED": 
        res.status(200).json({
          success: true,
          message: "Rack restored successfully.",
          data: result.data,
        });
        return;
    }

  } catch (error) {
    console.log("Restored rack error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}