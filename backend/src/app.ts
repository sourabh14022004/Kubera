import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes.js";
import storageRoutes from "./modules/storage/storage.routes.js";
import categoryRoutes from "./modules/components/category.routes.js";
import componentRoutes from "./modules/components/component.routes.js"
import assetRoutes from "./modules/assets/asset.routes.js" 
import loanRoutes from "./modules/assets/loan.routes.js"

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Category routes
app.use("/api/components/categories", categoryRoutes);

// Component routes
app.use("/api/components", componentRoutes);

// Assets routes
app.use("/api/assets", assetRoutes);

// Loans routes
app.use("/api/loans", loanRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "your api is running, tum maje karo",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/storage", storageRoutes);

export default app;
