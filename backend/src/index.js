import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

import aiRoutes from "./routes/ai.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import abtestRoutes from "./routes/abtest.routes.js";

app.use("/api", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/abtest", abtestRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Marketing GPT API is running",
    timestamp: new Date().toISOString(),
    database: "connected",
  });
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
