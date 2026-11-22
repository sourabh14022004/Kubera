import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { 
    getAllLoansController, 
    getMyLoansController, 
    getLoanSummaryController, 
    getMemberLoanSummaryController,
    updateLoanDueDateController,
    getLoansByIdController,
} from "./asset.controller.js";

const router = Router();

router.use(...requireAuth);

// Get current member's loan summary
router.get("/me/summary", getMemberLoanSummaryController)

// Members can view their own borrowing history.
router.get("/me", getMyLoansController)

// Get all asset summary
router.get(
    "/summary",
    requireRole("SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"),
    getLoanSummaryController,
)

// Get loan summary
router.get("/:loanId", getLoansByIdController)

// Register the due-date route
router.patch(
  "/:loanId/due-date",
  requireRole("SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"),
  updateLoanDueDateController,
);

// Only management roles can view everyone's loans.
router.get(
    "/",
    requireRole("SUPER_ADMIN", "ADMIN", "CLUB_PRESIDENT", "VICE_PRESIDENT"),
    getAllLoansController,
);

export default router;