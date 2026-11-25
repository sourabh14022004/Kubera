import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { getBorrowingAnalyticsController, getDamageLossAnalyticsController, getInventoryActivityTrendsController, getInventoryOverviewController, getMovementAnalyticsController, getMovementHistoryController, getStockAlertsController } from "./report.controller.js";

const router = Router();

router.use(...requireAuth);


// GET stock overview
router.get(
  "/overview",
  getInventoryOverviewController,
);

// GET stock alerts
router.get(
  "/stock-alerts",
  getStockAlertsController,
);

// GET movements route
router.get(
  "/movements",
  getMovementHistoryController,
);

// GET movement analytics route
router.get(
  "/movement-analytics",
  getMovementAnalyticsController);

// GET damage loss analytics
router.get(
  "/damage-loss-analytics",
  getDamageLossAnalyticsController);

// GET borrowing analytics
router.get(
  "/borrowing-analytics",
  getBorrowingAnalyticsController);

// GET inventory activity trends
router.get(
  "/activity-trends",
  getInventoryActivityTrendsController);

export default router;