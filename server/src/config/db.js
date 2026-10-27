import mongoose from "mongoose";

const connectionStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
  99: "uninitialized",
};

export function getDatabaseStatus() {
  return connectionStates[mongoose.connection.readyState] || "unknown";
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("[db] MONGODB_URI is not configured. Database connection skipped.");
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(
      `[db] Connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}.`
    );
    return true;
  } catch (error) {
    console.error(`[db] MongoDB connection failed: ${error.message}`);
    return false;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.disconnect();
    console.log("[db] MongoDB connection closed.");
  } catch (error) {
    console.error(`[db] Failed to close MongoDB connection: ${error.message}`);
  }
}
