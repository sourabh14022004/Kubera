import express from "express";
import cors from "cors";
import helmet from "helmet";

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

export default app;
        




















































































