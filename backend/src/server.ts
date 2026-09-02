import dotenv from "dotenv";
import path from "path";

// Load environment variables FIRST before loading database config
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

import express from "express";
import cors from "cors";

// Import database & associations (requires process.env.DATABASE_URL)
import sequelize from "./config/database";
import "./models/Associations";

// Import API routes
import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import candidateProfileRoutes from "./routes/candidateProfileRoutes";
import resumeRoutes from "./routes/resumeRoutes";
import jobRoutes from "./routes/jobRoutes";
import applicationRoutes from "./routes/applicationRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/profile/resume", resumeRoutes);
app.use("/api/profile", candidateProfileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check & root endpoints
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Backend service is running" });
});

// Start Server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Database connection authenticated successfully.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
}

startServer();
