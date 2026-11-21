import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { getAllLoansController } from "./asset.controller.js";

const router = Router();

router.use(...requireAuth);

router.get(
    "/",
    requireRole("SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"),
    getAllLoansController,
);

export default router;