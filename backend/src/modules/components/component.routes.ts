import { Router } from "express";
import { createComponentController } from "./component.controller.js";

import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";

const router = Router();

// All component routes require authentication.
router.use(...requireAuth);

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

export default router;