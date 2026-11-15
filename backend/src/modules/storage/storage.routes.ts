import { Router } from "express";
import { getAllRacksController, getDrawerByIdController, getRackByIdController, createRackController } from "./storage.controller.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

import { requireRole } from "../../middlewares/requireRole.js";

const router = Router();

// Protect every storage endpoint.
router.use(...requireAuth);

// POST /api/storage/racks
router.post(
  "/racks",
  requireRole(
    "SUPER_ADMIN",
    "ADMIN",
    "CLUB_PRESIDENT",
    "VICE_PRESIDENT",
  ),
  createRackController,
);

//GET /api/storage/racks
router.get("/racks", getAllRacksController);

// GET / api/storage/racks/:rackId
router.get("/racks/:rackId", getRackByIdController);

// GET /api/storage/drawers/:drawerId
router.get("/drawers/:drawerId", getDrawerByIdController);

export default router;