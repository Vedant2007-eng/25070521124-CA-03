import "dotenv/config";
import cors from "cors";
import express from "express";
import analyticsRoutes from "./routes/analytics.js";
import authRoutes from "./routes/auth.js";
import healthRoutes from "./routes/health.js";
import quizRoutes from "./routes/quizzes.js";
import revisionRoutes from "./routes/revisions.js";
import studyPlanRoutes from "./routes/studyPlans.js";
import subjectRoutes from "./routes/subjects.js";
import { ApiError } from "./utils/http.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction =
  (process.env.NODE_ENV || "").trim().toLowerCase() === "production";
const loopbackHostnames = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "::1",
]);

function isPrivateIpv4Hostname(hostname) {
  const octets = hostname.split(".");

  if (
    octets.length !== 4 ||
    !octets.every((part) => /^\d{1,3}$/.test(part))
  ) {
    return false;
  }

  const [first, second, third, fourth] = octets.map(Number);

  if ([first, second, third, fourth].some((part) => part > 255)) {
    return false;
  }

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  try {
    const requestUrl = new URL(origin);
    const hostname = requestUrl.hostname.toLowerCase();

    if (loopbackHostnames.has(hostname)) {
      return true;
    }

    return (
      !isProduction &&
      requestUrl.protocol === "http:" &&
      isPrivateIpv4Hostname(hostname)
    );
  } catch {
    return false;
  }
}

app.disable("x-powered-by");

const trustProxy = process.env.TRUST_PROXY?.trim();

if (trustProxy === "true") {
  app.set("trust proxy", 1);
} else if (/^\d+$/.test(trustProxy)) {
  app.set("trust proxy", Number(trustProxy));
} else if (trustProxy) {
  app.set("trust proxy", trustProxy);
}

app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store",
  });
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/study-plans", studyPlanRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/revisions", revisionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", healthRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found.",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON body.",
    });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large.",
    });
  }

  console.error(
    `[api] Unhandled request error: ${error?.name || "Error"}${
      error?.code ? ` (${error.code})` : ""
    }`
  );

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
  });
});

export default app;
