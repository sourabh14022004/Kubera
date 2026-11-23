import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import {
    adjustBulkInventoryController,
    checkoutBulkInventoryController,
    returnBulkInventoryController,
    stockInBulkInventoryController,
    writeOffBulkInventoryController,
    writeOffBulkLoanController
} from "./bulk.controller.js";

const router = Router();

// All bulk routes require authentication.
router.use(...requireAuth);


// POST Checkout route
router.post(
    "/checkout",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    checkoutBulkInventoryController,
);


// POST Return route
router.post(
    "/return",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    returnBulkInventoryController,
);

// POST StockIn route
router.post(
    "/stock-in",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    stockInBulkInventoryController,
);

// POST Adjust route
router.post(
    "/adjust",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    adjustBulkInventoryController,
);


// POST lost or damage route
router.post(
    "/write-off",
    requireRole(
        "SUPER_ADMIN",
        "ADMIN",
        "CLUB_PRESIDENT",
        "VICE_PRESIDENT",
    ),
    writeOffBulkInventoryController,
);


// POST loan's lost found route
router.post(
  "/loan-write-off",
  requireRole(
    "SUPER_ADMIN",
    "ADMIN",
    "CLUB_PRESIDENT",
    "VICE_PRESIDENT",
  ),
  writeOffBulkLoanController,
);

export default router;