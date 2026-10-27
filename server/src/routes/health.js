import { Router } from "express";
import { getDatabaseStatus, isDatabaseConnected } from "../config/db.js";

const router = Router();

router.get("/health", (req, res) => {
  const databaseConnected = isDatabaseConnected();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    api: "running",
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString(),
    service: "PrepPilot AI API",
    uptimeSeconds: Math.round(process.uptime()),
  });
});

export default router;
