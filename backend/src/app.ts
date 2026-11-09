
import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes.js";
import storageRoutes from "./modules/storage/storage.routes.js";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "your api is running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/storage", storageRoutes);

export default app;
