const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const User = require("../models/User");
const { validateInterviewRoomAccess } = require("./interviewRoomService");

let ioInstance = null;
let redisClients = null;

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

function getRealtimeServer() {
  return ioInstance;
}

function emitToUser(userId, eventName, payload) {
  const normalizedUserId = String(userId || "").trim();
  if (!ioInstance || !normalizedUserId) return false;
  ioInstance.to(`user:${normalizedUserId}`).emit(eventName, payload);
  return true;
}

function emitToRoom(roomName, eventName, payload) {
  const normalizedRoomName = String(roomName || "").trim();
  if (!ioInstance || !normalizedRoomName) return false;
  ioInstance.to(normalizedRoomName).emit(eventName, payload);
  return true;
}

async function attachRedisAdapter(io) {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  if (!redisUrl) {
    console.warn("[REALTIME] REDIS_URL is not configured. Using single-server Socket.IO mode.");
    return;
  }

  const prefix = String(process.env.REDIS_KEY_PREFIX || "talentx").trim() || "talentx";
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => {
    console.error("[REALTIME] Redis pub client error:", err.message);
  });
  subClient.on("error", (err) => {
    console.error("[REALTIME] Redis sub client error:", err.message);
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient, { key: `${prefix}:socket.io` }));
  redisClients = { pubClient, subClient };
  console.log(`[REALTIME] Redis adapter connected with prefix "${prefix}"`);
}

async function authenticateSocket(socket, next) {
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
}

function registerRealtimeEvents(io) {
  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

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

        await socket.join(nextRoomName);
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
}

async function initializeRealtime(httpServer, { isAllowedOrigin }) {
  if (ioInstance) return ioInstance;

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true
    }
  });

  await attachRedisAdapter(io);
  io.use(authenticateSocket);
  registerRealtimeEvents(io);
  ioInstance = io;
  return ioInstance;
}

async function closeRealtime() {
  if (redisClients) {
    const { pubClient, subClient } = redisClients;
    redisClients = null;
    await Promise.allSettled([pubClient?.quit?.(), subClient?.quit?.()]);
  }
  if (ioInstance) {
    ioInstance.removeAllListeners();
  }
}

module.exports = {
  initializeRealtime,
  getRealtimeServer,
  emitToUser,
  emitToRoom,
  closeRealtime
};
