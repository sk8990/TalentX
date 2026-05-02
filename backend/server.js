require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { startScheduledTasks } = require("./scheduler");
const { initializeRealtime, closeRealtime } = require("./services/realtimeService");
const { buildApp, isAllowedOrigin } = require("./app");

/* ===========================
   ENV VALIDATION
=========================== */
const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET === "supersecret") {
  console.warn(
    "WARNING: JWT_SECRET is set to a weak default value. Please change it in .env for production!"
  );
}

const app = buildApp();
const httpServer = http.createServer(app);
const shouldStartScheduler =
  String(process.env.ENABLE_SCHEDULER || "true").trim().toLowerCase() !== "false";

process.on("unhandledRejection", (reason) => {
  console.error("[PROCESS] Unhandled Rejection:", reason);
});

process.on("uncaughtException", async (err) => {
  console.error("[PROCESS] Uncaught Exception:", err);
  await closeRealtime();
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await initializeRealtime(httpServer, { isAllowedOrigin });

    httpServer.listen(PORT, () => {
      console.log(`Server is Running on port ${PORT}`);
      if (shouldStartScheduler) {
        startScheduledTasks();
      } else {
        console.log("Scheduled tasks are disabled for this instance");
      }
    });
  } catch (err) {
    console.error("Server startup failed:", err);
    await closeRealtime();
    process.exit(1);
  }
}

startServer();
