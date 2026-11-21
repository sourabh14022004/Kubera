import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import {
    registerAssetController,
    getAllAssetsController,
    checkoutAssetController,
    returnAssetController,
} from "./asset.controller.js";

const router = Router();

router.use(...requireAuth);

router.get("/", getAllAssetsController)

router.post(
    "/",
    requireRole(
        "SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"
    ),
    registerAssetController,
)

router.post(
    "/:assetId/checkout",
    requireRole(
        "SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"
    ),
    checkoutAssetController,
)

router.patch(
    "/:assetId/return",
    requireRole("SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"),
    returnAssetController,
)

export default router;