import { Router } from "express";
import {
    getAllRacksController,
    getDrawerByIdController,
    getRackByIdController,
    createRackController,
    retireRackController,
    restoreRackController,
    deleteRackController
} from "./storage.controller.js";
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

// PATCH /api/storage/racks/:rackId/retire
router.patch(
    "/racks/:rackId/retire",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
    ),
    retireRackController,
);

// PATCH /api/storage/racks/:rackId/restore
router.patch(
    "/racks/:rackId/restore",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT"
    ),
    restoreRackController,
);

// DELETE /api/storage/racks/:rackId
router.delete(
    "/racks/:rackId",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT"
    ),
    deleteRackController,
);


//GET /api/storage/racks
router.get("/racks", getAllRacksController);

// GET / api/storage/racks/:rackId
router.get("/racks/:rackId", getRackByIdController);

// GET /api/storage/drawers/:drawerId
router.get("/drawers/:drawerId", getDrawerByIdController);

export default router;