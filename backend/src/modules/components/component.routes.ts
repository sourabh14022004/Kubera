import { Router } from "express";
import { 
    createComponentController, 
    getAllComponentsController, 
    updateComponentController 
} from "./component.controller.js";

import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";

const router = Router();

// All component routes require authentication.
router.use(...requireAuth);

// GET /api/components
router.get("/", getAllComponentsController);

// POST /api/components
router.post(
    "/",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    createComponentController,
);

// PATCH /api/components/:componentId
router.patch(
    "/:componentId",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    updateComponentController,
);

export default router;