"use strict";

/**
 * app.js — Express application factory.
 *
 * This module builds and exports the Express app WITHOUT connecting to
 * MongoDB or starting the HTTP server. It is used by:
 *   - server.js  (production: connects DB then calls app.listen)
 *   - tests      (test DB is connected by the test harness before each suite)
 *
 * The only production change from the original server.js is that the
 * mongoose.connect() and httpServer.listen() calls have been moved to
 * server.js, which imports this module.
 */

const express = require("express");
const http = require("http");
const crypto = require("crypto");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const mongoose = require("mongoose");

const isProduction = process.env.NODE_ENV === "production";

// ── CORS ─────────────────────────────────────────────────────────────────────

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
  } catch {
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
    try { return [new RegExp(pattern, "i")]; } catch { return []; }
  });

const allowedOrigins = [...new Set([...defaultOrigins.map(normalizeOrigin), ...envOrigins])];
const allowedOriginPatterns = [...defaultOriginPatterns, ...envOriginPatterns];

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;
  if (allowedOriginPatterns.some((p) => p.test(normalizedOrigin))) return true;
  if (
    !isProduction &&
    /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/i.test(normalizedOrigin)
  ) return true;
  return false;
}

// ── Build app ─────────────────────────────────────────────────────────────────

function buildApp() {
  const app = express();

  // Helmet
  const cspFrameAncestors = ["'self'", ...allowedOrigins];
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: cspFrameAncestors,
        frameSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"]
      }
    }
  }));

  // CORS
  app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  }));

  // Rate limiting — disabled in test environment to avoid flaky tests
  if (process.env.NODE_ENV !== "test") {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: { message: "Too many requests from this IP, please try again after 15 minutes" },
      standardHeaders: true,
      legacyHeaders: false
    });
    const generalRateLimitMax = (() => {
      const envLimit = Number(process.env.GENERAL_RATE_LIMIT_MAX);
      return Number.isFinite(envLimit) && envLimit > 0 ? envLimit : (isProduction ? 200 : 2000);
    })();
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: generalRateLimitMax,
      message: { message: "Too many requests, please try again later" },
      standardHeaders: true,
      legacyHeaders: false
    });
    app.use("/api/auth", authLimiter);
    app.use("/api/", generalLimiter);
  }

  app.use(express.json({ limit: "10mb" }));

  // Request ID + timing
  app.use((req, res, next) => {
    const requestId = String(req.headers["x-request-id"] || "").trim() || crypto.randomUUID();
    const startedAt = process.hrtime.bigint();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" || res.statusCode >= 400) {
        console.log(`[${requestId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs.toFixed(1)}ms)`);
      }
    });
    next();
  });

  // Mongo sanitize
  app.use((req, _res, next) => {
    if (req.body) req.body = mongoSanitize.sanitize(req.body);
    if (req.params) req.params = mongoSanitize.sanitize(req.params);
    if (req.query && typeof req.query === "object") {
      const sanitized = mongoSanitize.sanitize(req.query);
      for (const key of Object.keys(req.query)) {
        if (!(key in sanitized)) delete req.query[key];
      }
      for (const [key, value] of Object.entries(sanitized)) {
        req.query[key] = value;
      }
    }
    next();
  });

  // ── Routes ──────────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      dbState: mongoose.connection.readyState
    });
  });

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/public", require("./routes/publicRoutes"));
  app.use("/api/packages", require("./routes/publicPackagesRoutes"));
  app.use("/api/enterprise-requests", require("./routes/enterpriseRequestRoutes"));
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
  app.use("/api/onboarding", require("./routes/onboardingRoutes"));
  app.use("/api/documents", require("./routes/documentRoutes"));
  app.use("/api/payments", require("./routes/paymentRoutes"));
  app.use("/api/subscriptions", require("./routes/subscriptionRoutes"));
  app.use("/api/super-admin", require("./routes/superAdminRoutes"));
  app.use("/api/college-admin", require("./routes/collegeAdminRoutes"));
  app.use("/api/files", require("./routes/fileRoutes"));

  // Global error handler
  app.use((err, req, res, _next) => {
    if (err.name === "MulterError") {
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    if (err.message === "Not allowed by CORS") {
      return res.status(403).json({ message: "CORS: Origin not allowed" });
    }
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
    });
  });

  return app;
}

module.exports = { buildApp, isAllowedOrigin };
