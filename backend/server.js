require('dotenv').config();
const express = require('express');
const http = require("http");
const mongoose = require('mongoose');
const cors = require('cors');
const path = require("path");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const { startScheduledTasks } = require("./scheduler");
const { initializeRealtime, closeRealtime } = require("./services/realtimeService");

/* ===========================
   ENV VALIDATION (S7)
=========================== */
const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET === "supersecret") {
  console.warn("WARNING: JWT_SECRET is set to a weak default value. Please change it in .env for production!");
}

const app = express();
const httpServer = http.createServer(app);
const isProduction = process.env.NODE_ENV === "production";
const shouldStartScheduler = String(process.env.ENABLE_SCHEDULER || "true").trim().toLowerCase() !== "false";

/* ===========================
   SECURITY MIDDLEWARE (S2, S3, S4, S5)
=========================== */

// S5: Helmet for HTTP security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// S2: CORS — restrict to frontend origin
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://talent-x-five.vercel.app"
];
const defaultOriginPatterns = [
  /^https:\/\/talent-x-five(?:-[a-z0-9-]+)?\.vercel\.app$/i
];

function normalizeOrigin(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return new URL(rawValue).origin.toLowerCase();
  } catch (_err) {
    return rawValue.replace(/\/+$/, "").toLowerCase();
  }
}
const envOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);
const envOriginPatterns = String(process.env.CORS_ORIGIN_PATTERNS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .flatMap((pattern) => {
    try {
      return [new RegExp(pattern, "i")];
    } catch (err) {
      console.warn(`[CORS] Ignoring invalid CORS_ORIGIN_PATTERNS entry "${pattern}": ${err.message}`);
      return [];
    }
  });
const allowedOrigins = [...new Set([...defaultOrigins.map(normalizeOrigin), ...envOrigins])];
const allowedOriginPatterns = [...defaultOriginPatterns, ...envOriginPatterns];

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  if (allowedOriginPatterns.some((pattern) => pattern.test(normalizedOrigin))) return true;

  // Allow LAN/private-IP dev origins without forcing env changes on every machine.
  if (
    !isProduction &&
    /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/i.test(normalizedOrigin)
  ) {
    return true;
  }

  return false;
}

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// S3: Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const envGeneralLimit = Number(process.env.GENERAL_RATE_LIMIT_MAX);
const generalRateLimitMax =
  Number.isFinite(envGeneralLimit) && envGeneralLimit > 0
    ? envGeneralLimit
    : (isProduction ? 200 : 2000);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: generalRateLimitMax,
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/", generalLimiter);

app.use(express.json({ limit: "10mb" }));

// Request id + response time logging for traceability
app.use((req, res, next) => {
  const inboundRequestId = String(req.headers["x-request-id"] || "").trim();
  const requestId = inboundRequestId || crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (process.env.NODE_ENV !== "production" || res.statusCode >= 400) {
      console.log(
        `[${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)}ms)`
      );
    }
  });

  next();
});

// S4: MongoDB query injection protection
// express-mongo-sanitize's default middleware is incompatible with Express 5
// because req.query is a read-only getter in Express 5.
// Custom middleware: sanitize body/params normally, sanitize query in-place.
app.use((req, _res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }
  if (req.params) {
    req.params = mongoSanitize.sanitize(req.params);
  }
  // Sanitize req.query values in-place (can't reassign req.query in Express 5)
  if (req.query && typeof req.query === 'object') {
    const sanitized = mongoSanitize.sanitize(req.query);
    for (const key of Object.keys(req.query)) {
      if (!(key in sanitized)) {
        delete req.query[key];
      }
    }
    for (const [key, value] of Object.entries(sanitized)) {
      req.query[key] = value;
    }
  }
  next();
});

/* ===========================
   API ROUTES
=========================== */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    dbState: mongoose.connection.readyState
  });
});

app.use("/api/auth", authLimiter, require("./routes/authRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/company", require("./routes/companyRoutes"));
app.use("/api/application", require("./routes/applicationRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/recruiter", require("./routes/recruiterRoutes"));
app.use("/api/interviewer", require("./routes/interviewerRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/offer", require("./routes/offerRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/export", require("./routes/exportRoutes"));
app.use("/api/bulk", require("./routes/bulkRoutes"));

/* ===========================
   STATIC FILES
=========================== */
app.use("/uploads", express.static("uploads"));
app.use("/offers", express.static(path.join(__dirname, "offers")));

/* ===========================
   GLOBAL ERROR HANDLER (Bug 15)
=========================== */
app.use((err, req, res, _next) => {
  console.error("Unhandled Error:", err.stack || err.message);

  if (err.name === "MulterError") {
    return res.status(400).json({ message: `File upload error: ${err.message}` });
  }

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS: Origin not allowed" });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message
  });
});

/* ===========================
   START SERVER
=========================== */
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
