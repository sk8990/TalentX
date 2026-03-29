import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import API, { getServerOrigin } from "../../api/axios";

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

function loadSocketClient(serverOrigin) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser context required"));
      return;
    }

    if (typeof window.io === "function") {
      resolve(window.io);
      return;
    }

    const existing = document.querySelector('script[data-socket-client="true"]');
    if (existing) {
      existing.addEventListener("load", () => {
        if (typeof window.io === "function") resolve(window.io);
        else reject(new Error("Socket client script loaded but window.io is unavailable"));
      }, { once: true });
      existing.addEventListener("error", () => {
        reject(new Error("Failed to load socket client script"));
      }, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `${serverOrigin.replace(/\/+$/, "")}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketClient = "true";
    script.onload = () => {
      if (typeof window.io === "function") resolve(window.io);
      else reject(new Error("Socket client script loaded but window.io is unavailable"));
    };
    script.onerror = () => reject(new Error("Failed to load socket client script"));
    document.body.appendChild(script);
  });
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
}

export default function VirtualInterviewRoom({ role }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const remoteSocketIdRef = useRef("");

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState("idle");

  const endpoint = role === "interviewer"
    ? `/interviewer/interviews/${applicationId}/room`
    : `/application/${applicationId}/interview/room`;

  const backPath = role === "interviewer" ? "/interviewer" : "/student/interviews";

  const interviewTitle = useMemo(() => {
    const title = roomData?.job?.title || "Interview";
    const company = roomData?.job?.companyName || "";
    return company ? `${title} - ${company}` : title;
  }, [roomData]);

  const closePeer = () => {
    try {
      if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.close();
      }
    } catch (_err) {
      // Ignore close errors
    }
    peerRef.current = null;
    remoteSocketIdRef.current = "";
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteParticipant(null);
    setConnectionState("idle");
  };

  const cleanupRoomResources = ({ disconnectSocket = true, stopLocalStream = true } = {}) => {
    closePeer();

    if (disconnectSocket && socketRef.current) {
      try {
        socketRef.current.emit("leave-interview-room", {}, () => {});
        socketRef.current.disconnect();
      } catch (_err) {
        // Ignore disconnect errors
      }
      socketRef.current = null;
    }

    if (stopLocalStream && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  };

  const ensurePeerConnection = (targetSocketId) => {
    if (peerRef.current) {
      return peerRef.current;
    }

    remoteSocketIdRef.current = targetSocketId;
    const peer = new RTCPeerConnection(RTC_CONFIG);
    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    }

    peer.onicecandidate = (event) => {
      const socket = socketRef.current;
      const targetId = remoteSocketIdRef.current;
      if (!socket || !targetId || !event.candidate) return;
      socket.emit("signal", {
        targetId,
        type: "ice-candidate",
        data: event.candidate
      });
    };

    peer.ontrack = (event) => {
      const incomingStream = event.streams?.[0];
      if (incomingStream) {
        remoteStreamRef.current = incomingStream;
      } else if (event.track) {
        const existingStream = remoteStreamRef.current || new MediaStream();
        const alreadyAdded = existingStream
          .getTracks()
          .some((track) => track.id === event.track.id);
        if (!alreadyAdded) {
          existingStream.addTrack(event.track);
        }
        remoteStreamRef.current = existingStream;
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      setConnectionState("connected");
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "connected") {
        setConnectionState("connected");
      }
      if (["failed", "disconnected", "closed"].includes(state)) {
        setConnectionState("idle");
      }
    };

    peerRef.current = peer;
    return peer;
  };

  const createOfferForPeer = async (targetSocketId) => {
    const socket = socketRef.current;
    if (!socket || !targetSocketId) return;

    try {
      const peer = ensurePeerConnection(targetSocketId);
      if (peer.signalingState !== "stable") return;
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("signal", {
        targetId: targetSocketId,
        type: "offer",
        data: offer
      });
    } catch (err) {
      console.error("Failed to create offer:", err);
      toast.error("Failed to establish video connection");
    }
  };

  const handleSignalMessage = async (payload) => {
    const fromId = String(payload?.fromId || "").trim();
    const type = String(payload?.type || "").trim();
    if (!fromId || !type) return;

    try {
      if (!remoteSocketIdRef.current) {
        remoteSocketIdRef.current = fromId;
      }

      if (fromId !== remoteSocketIdRef.current) {
        return;
      }

      if (type === "offer") {
        if (peerRef.current && peerRef.current.signalingState !== "stable") {
          closePeer();
        }
        const peer = ensurePeerConnection(fromId);
        await peer.setRemoteDescription(payload.data);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socketRef.current?.emit("signal", {
          targetId: fromId,
          type: "answer",
          data: answer
        });
        setConnectionState("connecting");
        return;
      }

      const peer = ensurePeerConnection(fromId);
      if (type === "answer") {
        await peer.setRemoteDescription(payload.data);
        setConnectionState("connected");
        return;
      }

      if (type === "ice-candidate" && payload.data) {
        await peer.addIceCandidate(payload.data);
      }
    } catch (err) {
      console.error("Signal handling failed:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initializeRoom = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication is required. Please login again.");
          return;
        }

        const roomRes = await API.get(endpoint);
        if (cancelled) return;
        setRoomData(roomRes.data);

        if (
          !navigator?.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
          setError("Your browser does not support camera/microphone access.");
          return;
        }

        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        if (cancelled) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        const serverOrigin = String(roomRes.data?.socket?.url || getServerOrigin()).trim();
        const ioFactory = await loadSocketClient(serverOrigin);
        if (cancelled) return;

        const socket = ioFactory(serverOrigin, {
          path: roomRes.data?.socket?.path || "/socket.io",
          auth: { token },
          transports: ["websocket", "polling"],
          withCredentials: true
        });

        socketRef.current = socket;
        setConnecting(true);
        setConnectionState("connecting");

        socket.on("connect", () => {
          socket.emit(
            "join-interview-room",
            { applicationId },
            async (acknowledgement) => {
              if (cancelled) return;
              setConnecting(false);

              if (!acknowledgement?.ok) {
                setError(acknowledgement?.message || "Unable to join interview room");
                setConnectionState("idle");
                return;
              }

              const participants = Array.isArray(acknowledgement.participants)
                ? acknowledgement.participants
                : [];

              if (participants.length > 0) {
                const peer = participants[0];
                remoteSocketIdRef.current = String(peer.socketId || "");
                setRemoteParticipant({
                  socketId: peer.socketId,
                  name: peer.name || "Participant",
                  role: peer.role || "participant",
                  audioEnabled: true,
                  videoEnabled: true
                });
                await createOfferForPeer(remoteSocketIdRef.current);
              } else {
                setConnectionState("waiting");
              }
            }
          );
        });

        socket.on("participant-joined", (participant) => {
          if (cancelled) return;
          if (remoteSocketIdRef.current) return;

          setRemoteParticipant({
            socketId: participant?.socketId || "",
            name: participant?.name || "Participant",
            role: participant?.role || "participant",
            audioEnabled: true,
            videoEnabled: true
          });
          setConnectionState("waiting");
        });

        socket.on("participant-left", (participant) => {
          if (cancelled) return;
          const socketId = String(participant?.socketId || "");
          if (!socketId || socketId !== remoteSocketIdRef.current) return;
          closePeer();
          setConnectionState("waiting");
          toast("Other participant left the room");
        });

        socket.on("signal", async (payload) => {
          if (cancelled) return;
          await handleSignalMessage(payload);
        });

        socket.on("media-state", (payload) => {
          if (cancelled) return;
          const socketId = String(payload?.socketId || "");
          if (!socketId || socketId !== remoteSocketIdRef.current) return;

          setRemoteParticipant((prev) =>
            prev
              ? {
                  ...prev,
                  audioEnabled: Boolean(payload?.audioEnabled),
                  videoEnabled: Boolean(payload?.videoEnabled)
                }
              : prev
          );
        });

        socket.on("connect_error", (err) => {
          if (cancelled) return;
          setConnecting(false);
          setError(err?.message || "Realtime connection failed");
        });
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Failed to open interview room";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initializeRoom();

    return () => {
      cancelled = true;
      cleanupRoomResources({ disconnectSocket: true, stopLocalStream: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, endpoint]);

  const publishMediaState = (nextAudio, nextVideo) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("media-state", {
      audioEnabled: Boolean(nextAudio),
      videoEnabled: Boolean(nextVideo)
    });
  };

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !audioEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setAudioEnabled(next);
    publishMediaState(next, videoEnabled);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const next = !videoEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setVideoEnabled(next);
    publishMediaState(audioEnabled, next);
  };

  const leaveRoom = () => {
    cleanupRoomResources({ disconnectSocket: true, stopLocalStream: true });
    navigate(backPath);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Preparing virtual interview room...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="text-sm font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Virtual Interview Panel</p>
            <h1 className="mt-1 text-2xl font-bold">{interviewTitle}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Scheduled: {formatDateTime(roomData?.interview?.date)} to {formatDateTime(roomData?.interview?.endDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={leaveRoom}
            className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Exit Room
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-[360px] w-full object-cover"
          />
          {!remoteParticipant ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/70 px-6 text-center text-sm text-slate-200">
              Waiting for the other participant to join...
            </div>
          ) : null}
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">
            {remoteParticipant?.name || "Remote"} ({remoteParticipant?.role || "participant"})
          </div>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-[360px] w-full object-cover"
          />
          <div className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">
            You ({role})
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            Status:{" "}
            <span className="text-slate-900">
              {connecting
                ? "Connecting to room..."
                : connectionState === "connected"
                ? "Live"
                : connectionState === "waiting"
                ? "Waiting for participant"
                : "Ready"}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                audioEnabled
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-rose-100 text-rose-700 hover:bg-rose-200"
              }`}
            >
              {audioEnabled ? <MicIcon sx={{ fontSize: 16 }} /> : <MicOffIcon sx={{ fontSize: 16 }} />}
              {audioEnabled ? "Mic On" : "Mic Off"}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                videoEnabled
                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
              }`}
            >
              {videoEnabled ? <VideocamIcon sx={{ fontSize: 16 }} /> : <VideocamOffIcon sx={{ fontSize: 16 }} />}
              {videoEnabled ? "Camera On" : "Camera Off"}
            </button>

            <button
              type="button"
              onClick={leaveRoom}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <CallEndIcon sx={{ fontSize: 16 }} />
              End
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
