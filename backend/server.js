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
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");
const { validateInterviewRoomAccess } = require("./services/interviewRoomService");
const { startScheduledTasks } = require("./scheduler");

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
  "http://localhost:3000"
];
const envOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

function extractSocketToken(handshake) {
  const fromAuth = String(handshake?.auth?.token || "").trim();
  if (fromAuth) return fromAuth;

  const authHeader = String(handshake?.headers?.authorization || "").trim();
  if (/^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  const queryToken = handshake?.query?.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }

  return "";
}

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

io.use(async (socket, next) => {
  try {
    const token = extractSocketToken(socket.handshake);
    if (!token) {
      return next(new Error("Authentication failed"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("name role isActive mustChangePassword");

    if (!user || !user.isActive) {
      return next(new Error("Authentication failed"));
    }

    socket.user = {
      id: user._id.toString(),
      name: user.name || "Participant",
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword)
    };

    return next();
  } catch (_err) {
    return next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  const emitParticipantLeft = () => {
    const roomName = String(socket.data?.roomName || "");
    if (!roomName) return;

    socket.to(roomName).emit("participant-left", {
      socketId: socket.id,
      userId: socket.user?.id || "",
      role: socket.data?.participantRole || socket.user?.role || "",
      name: socket.data?.participantName || socket.user?.name || "Participant"
    });
  };

  const leaveCurrentRoom = () => {
    const roomName = String(socket.data?.roomName || "");
    if (!roomName) return;
    emitParticipantLeft();
    socket.leave(roomName);
    socket.data.roomName = "";
    socket.data.participantRole = "";
    socket.data.participantName = "";
    socket.data.applicationId = "";
  };

  socket.on("join-interview-room", async (payload = {}, callback) => {
    try {
      if (!["student", "interviewer"].includes(socket.user?.role)) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "Only students and interviewers can join interview rooms" });
        }
        return;
      }

      if (socket.user.role === "interviewer" && socket.user.mustChangePassword) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "Password reset is required before joining interview rooms" });
        }
        return;
      }

      const applicationId = String(payload?.applicationId || "").trim();
      const accessResult = await validateInterviewRoomAccess({
        applicationId,
        userId: socket.user.id,
        role: socket.user.role
      });

      if (!accessResult.ok) {
        if (typeof callback === "function") {
          callback({ ok: false, message: accessResult.message, code: accessResult.statusCode });
        }
        return;
      }

      const nextRoomName = accessResult.roomName;
      const previousRoomName = String(socket.data?.roomName || "");
      if (previousRoomName && previousRoomName !== nextRoomName) {
        leaveCurrentRoom();
      }

      socket.join(nextRoomName);
      socket.data.roomName = nextRoomName;
      socket.data.applicationId = String(accessResult.application?._id || "");
      socket.data.participantRole = accessResult.participantRole;
      socket.data.participantName = accessResult.participantName;

      const peers = await io.in(nextRoomName).fetchSockets();
      const existingParticipants = peers
        .filter((peer) => peer.id !== socket.id)
        .map((peer) => ({
          socketId: peer.id,
          userId: peer.user?.id || "",
          role: peer.data?.participantRole || peer.user?.role || "",
          name: peer.data?.participantName || peer.user?.name || "Participant"
        }));

      socket.to(nextRoomName).emit("participant-joined", {
        socketId: socket.id,
        userId: socket.user.id,
        role: accessResult.participantRole,
        name: accessResult.participantName
      });

      if (typeof callback === "function") {
        callback({
          ok: true,
          roomName: nextRoomName,
          access: accessResult.access,
          self: {
            socketId: socket.id,
            userId: socket.user.id,
            role: accessResult.participantRole,
            name: accessResult.participantName
          },
          participants: existingParticipants
        });
      }
    } catch (err) {
      console.error("join-interview-room error:", err);
      if (typeof callback === "function") {
        callback({ ok: false, message: "Failed to join interview room" });
      }
    }
  });

  socket.on("signal", (payload = {}, callback) => {
    try {
      const roomName = String(socket.data?.roomName || "");
      if (!roomName) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "Join an interview room first" });
        }
        return;
      }

      const targetId = String(payload?.targetId || "").trim();
      const type = String(payload?.type || "").trim();
      if (!targetId || !type) {
        if (typeof callback === "function") {
          callback({ ok: false, message: "targetId and type are required" });
        }
        return;
      }

      io.to(targetId).emit("signal", {
        fromId: socket.id,
        fromUserId: socket.user.id,
        fromRole: socket.data?.participantRole || socket.user?.role || "",
        fromName: socket.data?.participantName || socket.user?.name || "Participant",
        type,
        data: payload?.data ?? null
      });

      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (err) {
      console.error("signal relay error:", err);
      if (typeof callback === "function") {
        callback({ ok: false, message: "Failed to relay signal" });
      }
    }
  });

  socket.on("media-state", (payload = {}) => {
    const roomName = String(socket.data?.roomName || "");
    if (!roomName) return;

    socket.to(roomName).emit("media-state", {
      socketId: socket.id,
      userId: socket.user?.id || "",
      audioEnabled: Boolean(payload?.audioEnabled),
      videoEnabled: Boolean(payload?.videoEnabled)
    });
  });

  socket.on("leave-interview-room", (_payload = {}, callback) => {
    leaveCurrentRoom();
    if (typeof callback === "function") {
      callback({ ok: true });
    }
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom();
  });
});

// S3: Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
const isProduction = process.env.NODE_ENV === "production";
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
   DATABASE CONNECTION
=========================== */
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });

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

process.on("uncaughtException", (err) => {
  console.error("[PROCESS] Uncaught Exception:", err);
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is Running on port ${PORT}`);
  startScheduledTasks();
});
