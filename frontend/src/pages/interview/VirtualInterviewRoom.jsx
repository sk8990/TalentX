import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField
} from "@mui/material";
import toast from "react-hot-toast";
import API, { getServerOrigin } from "../../api/axios";

const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const REASONS = ["STUDENT_NO_SHOW", "INTERVIEWER_UNAVAILABLE", "OTHER"];
const JOIN_STATUS = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
};

function formatDateTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
}

function nowInput(minutesAhead) {
  const date = new Date(Date.now() + minutesAhead * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function loadSocketClient(serverOrigin) {
  return new Promise((resolve, reject) => {
    if (typeof window.io === "function") return resolve(window.io);
    const existing = document.querySelector('script[data-socket-client="true"]');
    if (existing) {
      existing.addEventListener("load", () => (window.io ? resolve(window.io) : reject(new Error("Socket client unavailable"))), { once: true });
      existing.addEventListener("error", () => reject(new Error("Socket client load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = `${serverOrigin.replace(/\/+$/, "")}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketClient = "true";
    script.onload = () => (window.io ? resolve(window.io) : reject(new Error("Socket client unavailable")));
    script.onerror = () => reject(new Error("Socket client load failed"));
    document.body.appendChild(script);
  });
}

async function requestFullscreenSafe() {
  const fn = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  if (!fn) return false;
  try {
    await fn.call(document.documentElement);
    return true;
  } catch {
    return false;
  }
}

async function exitFullscreenSafe() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  if (!fn) return;
  try {
    await fn.call(document);
  } catch {
    // ignore
  }
}

function statusBadge(status) {
  if (status === "pass") return "text-emerald-700";
  if (status === "fail") return "text-rose-700";
  return "text-slate-600";
}

function normalizeJoinRequest(value) {
  const status = String(value?.status || JOIN_STATUS.NONE).trim().toUpperCase();
  return {
    status: Object.values(JOIN_STATUS).includes(status) ? status : JOIN_STATUS.NONE,
    requestedAt: value?.requestedAt || null,
    decidedAt: value?.decidedAt || null,
    rejectReason: String(value?.rejectReason || "").trim()
  };
}

export default function VirtualInterviewRoom({ role }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteSocketIdRef = useRef("");
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const autoStartAttemptedRef = useRef(false);

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState("idle");
  const [remoteName, setRemoteName] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [checks, setChecks] = useState({ internet: "pending", camera: "pending", microphone: "pending" });
  const [checkRunning, setCheckRunning] = useState(false);
  const [violation, setViolation] = useState("");
  const [violationCount, setViolationCount] = useState(0);
  const [supportOpen, setSupportOpen] = useState(false);
  const [joinRequest, setJoinRequest] = useState(() => normalizeJoinRequest(null));
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [decidingJoin, setDecidingJoin] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reschedule, setReschedule] = useState({
    open: false,
    reason: "STUDENT_NO_SHOW",
    newDate: nowInput(30),
    newEndDate: nowInput(60),
    notes: "",
    submitting: false
  });

  const endpoint = role === "interviewer" ? `/interviewer/interviews/${applicationId}/room` : `/application/${applicationId}/interview/room`;
  const backPath = role === "interviewer" ? "/interviewer" : "/student/interviews";
  const allChecksPassed = useMemo(() => Object.values(checks).every((v) => v === "pass"), [checks]);
  const joinStatus = joinRequest.status;
  const studentRequiresApproval = role === "student";
  const title = useMemo(() => {
    const job = roomData?.job?.title || "Interview";
    const company = roomData?.job?.companyName || "";
    return company ? `${job} - ${company}` : job;
  }, [roomData]);

  const closePeer = () => {
    try {
      if (peerRef.current) peerRef.current.close();
    } catch {
      // ignore
    }
    peerRef.current = null;
    remoteSocketIdRef.current = "";
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setRemoteName("");
    setConnectionState("idle");
  };

  const cleanupSession = async () => {
    closePeer();
    if (socketRef.current) {
      try {
        socketRef.current.emit("leave-interview-room", {}, () => {});
        socketRef.current.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    await exitFullscreenSafe();
  };

  const runSystemCheck = async () => {
    setCheckRunning(true);
    try {
      const base = { internet: navigator.onLine ? "pass" : "fail", camera: "pending", microphone: "pending" };
      if (!navigator.mediaDevices?.getUserMedia) {
        setChecks({ ...base, camera: "fail", microphone: "fail" });
        return;
      }
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const camera = probe.getVideoTracks().length ? "pass" : "fail";
      const microphone = probe.getAudioTracks().length ? "pass" : "fail";
      probe.getTracks().forEach((track) => track.stop());
      setChecks({ internet: base.internet, camera, microphone });
    } catch {
      setChecks({ internet: navigator.onLine ? "pass" : "fail", camera: "fail", microphone: "fail" });
    } finally {
      setCheckRunning(false);
    }
  };

  const leaveRoom = async () => {
    await cleanupSession();
    navigate(backPath);
  };

  const ensurePeer = (socketId) => {
    if (peerRef.current) return peerRef.current;
    remoteSocketIdRef.current = socketId;
    const peer = new RTCPeerConnection(RTC_CONFIG);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current));
    }
    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && remoteSocketIdRef.current) {
        socketRef.current.emit("signal", { targetId: remoteSocketIdRef.current, type: "ice-candidate", data: event.candidate });
      }
    };
    peer.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (stream && remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      setConnectionState("connected");
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(peer.connectionState)) setConnectionState("idle");
    };
    peerRef.current = peer;
    return peer;
  };

  const sendOfferTo = async (targetSocketId) => {
    if (!targetSocketId || !socketRef.current) return;
    const peer = ensurePeer(targetSocketId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socketRef.current.emit("signal", { targetId: targetSocketId, type: "offer", data: offer });
    setConnectionState("connecting");
  };

  const handleSignal = async (payload) => {
    const fromId = String(payload?.fromId || "");
    const type = String(payload?.type || "");
    if (!fromId || !type) return;
    if (!remoteSocketIdRef.current) remoteSocketIdRef.current = fromId;
    if (fromId !== remoteSocketIdRef.current) return;

    if (type === "offer") {
      let peer = ensurePeer(fromId);
      if (peer.signalingState !== "stable") {
        closePeer();
        peer = ensurePeer(fromId);
      }
      await peer.setRemoteDescription(payload.data);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socketRef.current?.emit("signal", { targetId: fromId, type: "answer", data: answer });
      return;
    }
    const peer = ensurePeer(fromId);
    if (type === "answer") await peer.setRemoteDescription(payload.data);
    if (type === "ice-candidate" && payload.data) {
      try {
        await peer.addIceCandidate(payload.data);
      } catch {
        // Ignore stale ICE candidates from previous connections.
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      try {
        const res = await API.get(endpoint);
        if (cancelled) return;
        setRoomData(res.data);
        setJoinRequest(normalizeJoinRequest(res.data?.joinRequest));
        await runSystemCheck();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to open interview room");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadMeta();
    return () => {
      cancelled = true;
      cleanupSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    if (!sessionStarted) return undefined;
    let cancelled = false;
    const startSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) return;
        localStreamRef.current = localStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        const origin = String(roomData?.socket?.url || getServerOrigin()).trim();
        const ioFactory = await loadSocketClient(origin);
        if (cancelled) return;
        const socket = ioFactory(origin, { path: roomData?.socket?.path || "/socket.io", auth: { token }, transports: ["websocket", "polling"], withCredentials: true });
        socketRef.current = socket;
        setConnecting(true);
        setConnectionState("connecting");

        socket.on("connect", () => {
          socket.emit("join-interview-room", { applicationId }, async (ack) => {
            setConnecting(false);
            if (!ack?.ok) {
              setError(ack?.message || "Unable to join room");
              return;
            }
            const participants = Array.isArray(ack.participants) ? ack.participants : [];
            if (!participants.length) {
              setConnectionState("waiting");
              return;
            }
            const peer = participants[0];
            setRemoteName(peer.name || "Participant");
            remoteSocketIdRef.current = String(peer.socketId || "");
            await sendOfferTo(remoteSocketIdRef.current);
          });
        });

        socket.on("participant-joined", async (participant) => {
          try {
            const participantSocketId = String(participant?.socketId || "");
            if (!participantSocketId) return;
            if (remoteSocketIdRef.current && remoteSocketIdRef.current !== participantSocketId) {
              closePeer();
            }
            remoteSocketIdRef.current = participantSocketId;
            setRemoteName(participant?.name || "Participant");
            if (localStreamRef.current) {
              await sendOfferTo(participantSocketId);
            } else {
              setConnectionState("waiting");
            }
          } catch {
            setConnectionState("waiting");
          }
        });
        socket.on("participant-left", () => {
          closePeer();
          setConnectionState("waiting");
        });
        socket.on("signal", (payload) => {
          handleSignal(payload).catch(() => {
            setConnectionState("waiting");
          });
        });
        socket.on("connect_error", () => setError("Realtime connection failed"));
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to start interview");
      }
    };
    startSession();
    return () => {
      cancelled = true;
      cleanupSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStarted, applicationId, roomData]);

  useEffect(() => {
    if (!sessionStarted) return undefined;
    const onVisibility = () => {
      if (document.hidden) {
        setViolationCount((v) => v + 1);
        setViolation("Tab switch/minimize detected. Return to interview.");
      }
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setViolationCount((v) => v + 1);
        setViolation("Fullscreen exited. Please return to fullscreen mode.");
      }
    };
    const onUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Interview is in progress.";
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [sessionStarted]);

  useEffect(() => {
    if (role !== "student" || sessionStarted || joinStatus !== JOIN_STATUS.PENDING) return undefined;
    let cancelled = false;
    const pollStatus = async () => {
      try {
        const res = await API.get(`/application/${applicationId}/interview/join-request`);
        if (cancelled) return;
        const next = normalizeJoinRequest(res.data?.joinRequest);
        setJoinRequest(next);
      } catch {
        // Ignore transient polling errors.
      }
    };
    pollStatus();
    const timer = setInterval(pollStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [role, sessionStarted, joinStatus, applicationId]);

  useEffect(() => {
    if (role !== "interviewer") return undefined;
    let cancelled = false;
    const pollInterviewerView = async () => {
      try {
        const res = await API.get(`/interviewer/interviews/${applicationId}/join-request`);
        if (cancelled) return;
        setJoinRequest(normalizeJoinRequest(res.data?.joinRequest));
      } catch {
        // Ignore if request is temporarily unavailable.
      }
    };
    pollInterviewerView();
    const timer = setInterval(pollInterviewerView, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [role, applicationId]);

  const enterSession = async () => {
    const full = await requestFullscreenSafe();
    if (!full) {
      setViolation("Fullscreen permission denied. Protected mode requires fullscreen.");
    }
    setSessionStarted(true);
  };

  useEffect(() => {
    if (role !== "student" || sessionStarted) return;
    if (joinStatus !== JOIN_STATUS.APPROVED) {
      autoStartAttemptedRef.current = false;
      return;
    }
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    toast.success("Interviewer approved your join request");
    enterSession().catch(() => {
      setError("Unable to start interview session");
    });
  }, [role, joinStatus, sessionStarted]);

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const next = !audioEnabled;
    localStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = next; });
    setAudioEnabled(next);
    socketRef.current?.emit("media-state", { audioEnabled: next, videoEnabled });
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const next = !videoEnabled;
    localStreamRef.current.getVideoTracks().forEach((track) => { track.enabled = next; });
    setVideoEnabled(next);
    socketRef.current?.emit("media-state", { audioEnabled, videoEnabled: next });
  };

  const sendJoinRequest = async () => {
    try {
      setRequestingJoin(true);
      const res = await API.post(`/application/${applicationId}/interview/join-request`);
      const next = normalizeJoinRequest(res.data?.joinRequest);
      setJoinRequest(next);
      if (next.status === JOIN_STATUS.PENDING) {
        toast.success("Join request sent. Waiting for interviewer approval.");
      }
      if (next.status === JOIN_STATUS.APPROVED) {
        await enterSession();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send join request");
    } finally {
      setRequestingJoin(false);
    }
  };

  const decideJoinRequest = async (decision) => {
    try {
      setDecidingJoin(true);
      const res = await API.put(`/interviewer/interviews/${applicationId}/join-request`, {
        decision,
        reason: decision === "REJECT" ? rejectReason : ""
      });
      setJoinRequest(normalizeJoinRequest(res.data?.joinRequest));
      toast.success(
        decision === "APPROVE" ? "Student join request approved" : "Student join request rejected"
      );
      if (decision === "REJECT") {
        setRejectReason("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update join request");
    } finally {
      setDecidingJoin(false);
    }
  };

  const startInterview = async () => {
    if (!allChecksPassed) return toast.error("Please pass all system checks first");
    if (studentRequiresApproval && joinStatus !== JOIN_STATUS.APPROVED) {
      await sendJoinRequest();
      return;
    }
    await enterSession();
  };

  const submitReschedule = async () => {
    try {
      setReschedule((prev) => ({ ...prev, submitting: true }));
      await API.post(`/interviewer/interviews/${applicationId}/reschedule`, {
        reason: reschedule.reason,
        notes: reschedule.notes,
        newDate: reschedule.newDate,
        newEndDate: reschedule.newEndDate
      });
      toast.success("Interview rescheduled");
      await leaveRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reschedule interview");
      setReschedule((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Preparing virtual interview room...</div>;
  if (error) return <div className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700"><p>{error}</p><button onClick={() => navigate(backPath)} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold">Back</button></div>;

  if (!sessionStarted) {
    return (
      <div className="space-y-4">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Virtual Interview Panel</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-300">Scheduled: {formatDateTime(roomData?.interview?.date)} to {formatDateTime(roomData?.interview?.endDate)}</p>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">System Check Before Start</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{Object.entries(checks).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-xs font-semibold uppercase text-slate-500">{key}</p><p className={`mt-1 text-sm font-semibold ${statusBadge(value)}`}>{value.toUpperCase()}</p></div>)}</div>
          {role === "student" ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interviewer Approval</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Status: {joinStatus === JOIN_STATUS.PENDING ? "Pending" : joinStatus === JOIN_STATUS.APPROVED ? "Approved" : joinStatus === JOIN_STATUS.REJECTED ? "Rejected" : "Not Requested"}
              </p>
              {joinStatus === JOIN_STATUS.PENDING ? (
                <p className="mt-1 text-xs text-amber-700">Your request has been sent. Waiting for interviewer decision.</p>
              ) : null}
              {joinStatus === JOIN_STATUS.REJECTED ? (
                <p className="mt-1 text-xs text-rose-700">{joinRequest.rejectReason || "The interviewer rejected your join request. You can request again."}</p>
              ) : null}
            </div>
          ) : null}
          {role === "interviewer" && joinStatus === JOIN_STATUS.PENDING ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Student Join Request</p>
              <p className="mt-1 text-sm font-semibold text-amber-900">A student is requesting entry to this interview room.</p>
              <TextField
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                size="small"
                fullWidth
                placeholder="Optional rejection reason"
                sx={{ mt: 1, bgcolor: "#fff" }}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => decideJoinRequest("APPROVE")} disabled={decidingJoin} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{decidingJoin ? "Saving..." : "Approve Join"}</button>
                <button onClick={() => decideJoinRequest("REJECT")} disabled={decidingJoin} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60">Reject</button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={runSystemCheck} disabled={checkRunning} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">{checkRunning ? "Running..." : "Retry Checks"}</button>
            <button onClick={startInterview} disabled={!allChecksPassed || checkRunning || requestingJoin || (role === "student" && joinStatus === JOIN_STATUS.PENDING)} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">{role === "student" ? (joinStatus === JOIN_STATUS.APPROVED ? "Start Interview (Fullscreen)" : joinStatus === JOIN_STATUS.PENDING ? "Waiting for Approval..." : requestingJoin ? "Sending Request..." : "Request Join Access") : "Start Interview (Fullscreen)"}</button>
            <button onClick={() => navigate(backPath)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">Cancel</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Virtual Interview Panel</p><h1 className="mt-1 text-2xl font-bold">{title}</h1></div>
          <div className="flex flex-wrap gap-2">
            {role === "interviewer" ? <button onClick={() => setReschedule((prev) => ({ ...prev, open: true }))} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">Reschedule Interview</button> : null}
            <button onClick={leaveRoom} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Exit Room</button>
          </div>
        </div>
      </section>

      {role === "interviewer" && joinStatus === JOIN_STATUS.PENDING ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Student requested to join this interview.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => decideJoinRequest("APPROVE")} disabled={decidingJoin} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{decidingJoin ? "Saving..." : "Approve Join"}</button>
            <button onClick={() => decideJoinRequest("REJECT")} disabled={decidingJoin} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60">Reject</button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-black"><video ref={remoteVideoRef} autoPlay playsInline className="h-[360px] w-full object-cover" />{!remoteName ? <div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-sm text-slate-200">Waiting for participant...</div> : null}<div className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">{remoteName || "Remote"}</div></article>
        <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-black"><video ref={localVideoRef} autoPlay playsInline muted className="h-[360px] w-full object-cover" /><div className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">You ({role})</div></article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Status: <span className="text-slate-900">{connecting ? "Connecting..." : connectionState === "connected" ? "Live" : connectionState === "waiting" ? "Waiting for participant" : "Ready"}</span></p>
        <p className="mt-1 text-xs font-semibold text-amber-700">Violation Count: {violationCount}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={toggleAudio} className={`rounded-xl px-4 py-2 text-sm font-semibold ${audioEnabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{audioEnabled ? "Mic On" : "Mic Off"}</button>
          <button onClick={toggleVideo} className={`rounded-xl px-4 py-2 text-sm font-semibold ${videoEnabled ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>{videoEnabled ? "Camera On" : "Camera Off"}</button>
          {role === "student" ? <button onClick={() => setSupportOpen(true)} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">Need Help?</button> : null}
          <button onClick={leaveRoom} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">End Interview</button>
        </div>
      </section>

      <Dialog open={Boolean(violation)} onClose={() => setViolation("")} fullWidth maxWidth="sm">
        <DialogTitle>Protected Mode Warning</DialogTitle>
        <DialogContent><p className="text-sm text-slate-700">{violation}</p></DialogContent>
        <DialogActions><Button onClick={async () => { await requestFullscreenSafe(); setViolation(""); }} variant="contained">Return to Fullscreen</Button></DialogActions>
      </Dialog>

      <Dialog open={supportOpen} onClose={() => setSupportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Interview Support</DialogTitle>
        <DialogContent><div className="space-y-2 text-sm"><p>Email: <a href="mailto:support@talentx.com" className="font-semibold text-indigo-700">support@talentx.com</a></p><p>WhatsApp: <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer" className="font-semibold text-indigo-700">+91 99999 99999</a></p><p>Application ID: <span className="font-semibold">{applicationId}</span></p></div></DialogContent>
        <DialogActions><Button onClick={() => setSupportOpen(false)} variant="contained">Close</Button></DialogActions>
      </Dialog>

      <Dialog open={reschedule.open} onClose={() => setReschedule((prev) => ({ ...prev, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>Reschedule Interview</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField select label="Reason" value={reschedule.reason} onChange={(e) => setReschedule((prev) => ({ ...prev, reason: e.target.value }))} size="small">{REASONS.map((reason) => <MenuItem key={reason} value={reason}>{reason.replaceAll("_", " ")}</MenuItem>)}</TextField>
          <TextField type="datetime-local" label="New Start Time" value={reschedule.newDate} onChange={(e) => setReschedule((prev) => ({ ...prev, newDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
          <TextField type="datetime-local" label="New End Time" value={reschedule.newEndDate} onChange={(e) => setReschedule((prev) => ({ ...prev, newEndDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
          <TextField multiline minRows={3} label="Notes" value={reschedule.notes} onChange={(e) => setReschedule((prev) => ({ ...prev, notes: e.target.value }))} size="small" placeholder="Add context..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReschedule((prev) => ({ ...prev, open: false }))} variant="outlined">Cancel</Button>
          <Button onClick={submitReschedule} disabled={reschedule.submitting} variant="contained">{reschedule.submitting ? "Rescheduling..." : "Confirm Reschedule"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
