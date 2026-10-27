import "dotenv/config";
import app from "./app.js";
import { validateAuthConfig } from "./config/auth.js";
import { connectDB, disconnectDB } from "./config/db.js";

const parsedPort = Number.parseInt(process.env.PORT, 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 5000;

async function startServer() {
  const authConfig = validateAuthConfig();

  if (!authConfig.valid) {
    throw new Error(authConfig.message);
  }

  const databaseConnected = await connectDB();

  if (!databaseConnected) {
    console.warn(
      "[server] API starting without a verified database connection. Data-backed endpoints will be unavailable."
    );
  }

  const server = app.listen(port, () => {
    console.log(`[server] PrepPilot AI API listening on http://localhost:${port}`);
    console.log(`[server] Health check: http://localhost:${port}/api/health`);
  });

  server.on("error", (error) => {
    console.error(`[server] Failed to start server on port ${port}: ${error.message}`);
    process.exitCode = 1;
  });

  let isShuttingDown = false;

  const shutdown = (signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`[server] Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[server] Shutdown timed out.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error(`[server] Startup failed: ${error.message}`);
  process.exit(1);
});
