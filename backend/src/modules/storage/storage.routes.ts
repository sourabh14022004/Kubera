import { Router } from "express";
import { getAllRacksController, getDrawerByIdController, getRackByIdController } from "./storage.controller.js";
import { requireAuth } from "../../middlewares/requireAuth.js";


const router = Router();

// Protect every storage endpoint.
router.use(...requireAuth);

//GET /api/storage/racks
router.get("/racks", getAllRacksController);

// GET / api/storage/racks/:rackId
router.get("/racks/:rackId", getRackByIdController);

// GET /api/storage/drawers/:drawerId
router.get("/drawers/:drawerId", getDrawerByIdController);

export default router;