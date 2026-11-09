
import type { Request, Response } from "express";

import {
  getAllRacks,
  getRackById,
  getDrawerById,
} from "./storage.service.js";

// Basic UUID validation before querying PostgreSQL.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/storage/racks
export async function getAllRacksController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const racks = await getAllRacks();

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
