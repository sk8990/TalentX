import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@mui/material";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import PauseCircleRoundedIcon from "@mui/icons-material/PauseCircleRounded";
import SlowMotionVideoRoundedIcon from "@mui/icons-material/SlowMotionVideoRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import SupportRoundedIcon from "@mui/icons-material/SupportRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import toast from "react-hot-toast";
import API from "../../api/axios";

const TERMINAL_STATUSES = ["COMPLETED", "ABANDONED", "FAILED"];

function logAIInterviewClient(event, payload = {}) {
  if (typeof window === "undefined") return;
  if (!import.meta.env.DEV && window.localStorage?.getItem("aiInterviewDebug") !== "true") {
    return;
  }

  const timestamp = new Date().toISOString();
  console.info(`[AIInterviewRoom][${timestamp}] ${event}`, payload);
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
}

function formatDurationClock(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    // Ignore fullscreen exit failures.
  }
}

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getDefaultChecks() {
  return {
    internet: "pending",
    camera: "pending",
    microphone: "pending",
    speechOutput: "pending",
    speechInput: "pending"
  };
}

function getStatusBoxClasses(status) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "fail") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function normalizeTranscript(value) {
  return Array.isArray(value)
    ? [...value].sort((a, b) => Number(a?.questionIndex || 0) - Number(b?.questionIndex || 0))
    : [];
}

function getAiPresenceLabel({ completed, listening, narrationState, sessionStarted }) {
  if (completed) return "Completed";
  if (!sessionStarted) return "Ready";
  if (listening) return "Listening";
  if (narrationState === "paused") return "Paused";
  if (narrationState === "speaking") return "Speaking";
  return "Waiting";
}

function getQuestionChipLabel({ completed, listening, narrationState, sessionStarted }) {
  if (completed) return "Interview submitted";
  if (!sessionStarted) return "System check first";
  if (listening) return "Listening to your answer";
  if (narrationState === "speaking") return "AI is asking the question";
  if (narrationState === "paused") return "Question paused";
  return "Ready when you are";
}

export default function AIInterviewRoom({ roomData }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const spokenQuestionKeyRef = useRef("");
  const activeUtteranceRef = useRef(null);
  const speechStartTimeoutRef = useRef(null);
  const voiceStopSubmitTimeoutRef = useRef(null);
  const answerDraftRef = useRef(String(roomData?.aiInterview?.currentAnswer || ""));
  const shouldAutoSubmitVoiceRef = useRef(false);
  const suppressRecognitionEndSubmitRef = useRef(false);
  const recognitionHadErrorRef = useRef(false);
  const speechFailureCountRef = useRef(0);
  const initialStatus = String(roomData?.aiInterview?.status || "").trim().toUpperCase();

  const [roomState, setRoomState] = useState(roomData);
  const [checks, setChecks] = useState(getDefaultChecks());
  const [checkRunning, setCheckRunning] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [violation, setViolation] = useState("");
  const [violationCount, setViolationCount] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(initialStatus === "IN_PROGRESS");
  const [startingInterview, setStartingInterview] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState("");
  const [answerDraft, setAnswerDraft] = useState(roomData?.aiInterview?.currentAnswer || "");
  const [answerSource, setAnswerSource] = useState("TEXT");
  const [supportOpen, setSupportOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [completed, setCompleted] = useState(TERMINAL_STATUSES.includes(initialStatus));
  const [slowMode, setSlowMode] = useState(false);
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const [narrationState, setNarrationState] = useState("idle");
  const [narrationMessage, setNarrationMessage] = useState(
    TERMINAL_STATUSES.includes(initialStatus) ? "Interview submitted" : "AI interviewer ready"
  );

  const backPath = "/student/interviews";
  const aiInterview = roomState?.aiInterview || {};
  const transcript = useMemo(() => normalizeTranscript(aiInterview?.transcript), [aiInterview?.transcript]);
  const currentQuestion = aiInterview?.currentQuestion || null;
  const currentQuestionIndex = currentQuestion?.index ?? aiInterview.currentQuestionIndex ?? 0;
  const currentSavedEntry = transcript.find((entry) => Number(entry?.questionIndex) === Number(currentQuestionIndex)) || null;
  const title = useMemo(() => {
    const job = roomState?.job?.title || "AI Interview";
    const company = roomState?.job?.companyName || "";
    return company ? `${job} - ${company}` : job;
  }, [roomState]);
  const participantName = roomState?.participant?.name || "Candidate";
  const companyName = roomState?.job?.companyName || "TalentX";
  const headerTitle = `${companyName} Screening - ${roomState?.job?.title || "Interview"}`;

  const aiConfig = useMemo(
    () => roomState?.interview?.aiConfig || {
      questionCount: 5,
      durationMinutes: 20,
      difficulty: "MEDIUM",
      focusAreas: []
    },
    [roomState]
  );

  const allRequiredChecksPassed = useMemo(
    () => ["internet", "camera", "microphone"].every((key) => checks[key] === "pass"),
    [checks]
  );
  const speechOutputAvailable = checks.speechOutput !== "warn" && typeof window !== "undefined" && "speechSynthesis" in window;
  const speechInputAvailable = checks.speechInput !== "warn" && Boolean(getSpeechRecognitionCtor());
  const aiPresenceLabel = getAiPresenceLabel({ completed, listening, narrationState, sessionStarted });
  const questionChipLabel = getQuestionChipLabel({ completed, listening, narrationState, sessionStarted });
  const progressLabel = currentQuestion
    ? `Question ${currentQuestion.index + 1} of ${aiInterview.totalQuestions || aiConfig.questionCount}`
    : `Question ${Math.min(currentQuestionIndex + 1, aiInterview.totalQuestions || aiConfig.questionCount)} of ${aiInterview.totalQuestions || aiConfig.questionCount}`;
  const unsavedDraft = String(answerDraft || "").trim();
  const hasUnsavedDraft = Boolean(
    unsavedDraft && (!currentSavedEntry || String(currentSavedEntry.answer || "").trim() !== unsavedDraft)
  );
  const scheduledEndMs = roomState?.interview?.endDate ? new Date(roomState.interview.endDate).getTime() : NaN;
  const remainingSeconds = Number.isFinite(scheduledEndMs)
    ? Math.max(0, Math.floor((scheduledEndMs - clockNowMs) / 1000))
    : 0;
  const headerTimeChip = sessionStarted && !completed && remainingSeconds > 0
    ? formatDurationClock(remainingSeconds)
    : `${aiConfig.durationMinutes || 20} min`;

  const stopRecognition = ({ suppressAutoSubmit = false } = {}) => {
    if (suppressAutoSubmit) {
      suppressRecognitionEndSubmitRef.current = true;
      shouldAutoSubmitVoiceRef.current = false;
    }
    logAIInterviewClient("recognition.stop.requested", {
      applicationId,
      hasRecognitionInstance: Boolean(recognitionRef.current),
      suppressAutoSubmit
    });
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // Ignore stop errors.
    }
    recognitionRef.current = null;
    setListening(false);
  };

  const clearPendingSpeechStart = () => {
    if (speechStartTimeoutRef.current) {
      window.clearTimeout(speechStartTimeoutRef.current);
      speechStartTimeoutRef.current = null;
    }
  };

  const clearPendingVoiceStopSubmit = () => {
    if (voiceStopSubmitTimeoutRef.current) {
      window.clearTimeout(voiceStopSubmitTimeoutRef.current);
      voiceStopSubmitTimeoutRef.current = null;
    }
  };

  const cancelNarration = () => {
    logAIInterviewClient("speech.cancel", {
      applicationId,
      hadUtterance: Boolean(activeUtteranceRef.current),
      speechState: narrationState
    });
    clearPendingSpeechStart();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;
    setNarrationState("idle");
    if (!completed) {
      setNarrationMessage("AI interviewer ready");
    }
  };

  const submitVoiceAnswerAfterStop = (trigger) => {
    clearPendingVoiceStopSubmit();
    voiceStopSubmitTimeoutRef.current = window.setTimeout(() => {
      const latestTranscript = String(answerDraftRef.current || "").trim();
      logAIInterviewClient("recognition.stop_submit.fallback", {
        applicationId,
        trigger,
        transcriptLength: latestTranscript.length,
        submittingAnswer,
        endingInterview,
        completed
      });

      if (!latestTranscript || submittingAnswer || endingInterview || completed) {
        if (!latestTranscript) {
          setRecognitionError("No voice answer was captured. Please try again or type your answer.");
        }
        return;
      }

      void submitAnswerAndContinue({
        transcriptOverride: latestTranscript,
        sourceOverride: "VOICE",
        skipRecognitionStop: true,
        trigger
      });
    }, 350);
  };

  const stopListeningAndSubmit = () => {
    logAIInterviewClient("recognition.stop_submit.requested", {
      applicationId,
      hasRecognitionInstance: Boolean(recognitionRef.current),
      transcriptLength: String(answerDraftRef.current || "").trim().length
    });
    stopRecognition({ suppressAutoSubmit: true });
    submitVoiceAnswerAfterStop("voice-stop-submit");
  };

  const cleanupLocalMedia = async () => {
    stopRecognition();
    cancelNarration();
    clearPendingVoiceStopSubmit();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    await exitFullscreenSafe();
  };

  const runSystemCheck = async () => {
    setCheckRunning(true);
    setCheckError("");

    try {
      const base = {
        internet: navigator.onLine ? "pass" : "fail",
        camera: "pending",
        microphone: "pending",
        speechOutput: typeof window !== "undefined" && "speechSynthesis" in window ? "pass" : "warn",
        speechInput: getSpeechRecognitionCtor() ? "pass" : "warn"
      };

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setChecks({ ...base, camera: "fail", microphone: "fail" });
        setCheckError("Camera and microphone require HTTPS or localhost. Open this project on your own laptop's localhost for AI interview mode.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setChecks({ ...base, camera: "fail", microphone: "fail" });
        setCheckError("Camera and microphone APIs are unavailable in this browser.");
        return;
      }

      const probe = await ensureLocalPreview();
      const camera = probe.getVideoTracks().length ? "pass" : "fail";
      const microphone = probe.getAudioTracks().length ? "pass" : "fail";
      setChecks({ ...base, camera, microphone });

      if (base.speechInput === "warn") {
        setRecognitionError("Browser speech recognition is unavailable here. Manual typing will remain available.");
      } else {
        setRecognitionError("");
      }
    } catch (err) {
      setChecks((prev) => ({
        ...prev,
        internet: navigator.onLine ? "pass" : "fail",
        camera: "fail",
        microphone: "fail"
      }));
      const errorName = String(err?.name || "").trim();
      if (errorName === "NotAllowedError") {
        setCheckError("Browser permission for camera or microphone was denied. Allow access in site permissions and retry.");
      } else if (errorName === "NotReadableError") {
        setCheckError("Camera or microphone is busy in another app. Close the other app and retry.");
      } else {
        setCheckError("System check failed. Verify mic and camera access, then retry.");
      }
    } finally {
      setCheckRunning(false);
    }
  };

  const ensureLocalPreview = async () => {
    if (localStreamRef.current && localStreamRef.current.getTracks().every((track) => track.readyState === "live")) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const speakQuestion = (question, options = {}) => {
    const overrideRate = Number(options?.overrideRate);
    const rate = Number.isFinite(overrideRate) ? overrideRate : (slowMode ? 0.84 : 1);

    if (!question?.prompt || typeof window === "undefined" || !("speechSynthesis" in window)) {
      logAIInterviewClient("speech.skipped.unavailable", {
        applicationId,
        hasPrompt: Boolean(question?.prompt),
        hasSpeechSynthesis: typeof window !== "undefined" && "speechSynthesis" in window
      });
      return;
    }

    const key = `${question.id}:${question.index}`;
    if (!options.force && spokenQuestionKeyRef.current === key) {
      logAIInterviewClient("speech.skipped.duplicate", {
        applicationId,
        key,
        force: Boolean(options.force)
      });
      return;
    }

    logAIInterviewClient("speech.queue", {
      applicationId,
      key,
      index: question.index,
      questionId: question.id,
      rate,
      force: Boolean(options.force)
    });
    spokenQuestionKeyRef.current = key;
    clearPendingSpeechStart();
    window.speechSynthesis.cancel();
    setNarrationState("idle");
    setNarrationMessage("Preparing question audio");
    const prefix = question.index === 0
      ? "Welcome to your AI interview. Please answer clearly and naturally. First question. "
      : `Question ${question.index + 1}. `;
    const utterance = new SpeechSynthesisUtterance(`${prefix}${question.prompt}`);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.onstart = () => {
      logAIInterviewClient("speech.started", {
        applicationId,
        key,
        index: question.index,
        questionId: question.id
      });
      setNarrationState("speaking");
      setNarrationMessage("AI interviewer is speaking");
    };
    utterance.onpause = () => {
      logAIInterviewClient("speech.paused", {
        applicationId,
        key
      });
      setNarrationState("paused");
      setNarrationMessage("Question paused");
    };
    utterance.onresume = () => {
      logAIInterviewClient("speech.resumed", {
        applicationId,
        key
      });
      setNarrationState("speaking");
      setNarrationMessage("AI interviewer is speaking");
    };
    utterance.onend = () => {
      logAIInterviewClient("speech.ended", {
        applicationId,
        key
      });
      activeUtteranceRef.current = null;
      setNarrationState("idle");
      setNarrationMessage("Ready when you are");
    };
    utterance.onerror = (event) => {
      logAIInterviewClient("speech.error", {
        applicationId,
        key,
        error: String(event?.error || "unknown")
      });
      activeUtteranceRef.current = null;
      setNarrationState("idle");
      setNarrationMessage("Unable to play question audio");
    };

    speechStartTimeoutRef.current = window.setTimeout(() => {
      speechStartTimeoutRef.current = null;
      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }, 160);
  };

  const repeatQuestion = () => {
    if (!speechOutputAvailable) {
      toast.error("Question replay is unavailable in this browser.");
      return;
    }
    if (!currentQuestion) {
      toast.error("No active question is ready yet.");
      return;
    }
    speakQuestion(currentQuestion, { force: true });
  };

  const togglePauseNarration = () => {
    if (!speechOutputAvailable) {
      toast.error("Narration controls are unavailable in this browser.");
      return;
    }

    if (narrationState === "speaking") {
      window.speechSynthesis.pause();
      setNarrationState("paused");
      setNarrationMessage("Question paused");
      return;
    }

    if (narrationState === "paused") {
      window.speechSynthesis.resume();
      setNarrationState("speaking");
      setNarrationMessage("AI interviewer is speaking");
      return;
    }

    if (currentQuestion) {
      speakQuestion(currentQuestion, { force: true });
    }
  };

  const toggleSlowMode = () => {
    const nextSlowMode = !slowMode;
    setSlowMode(nextSlowMode);

    if (speechOutputAvailable && currentQuestion) {
      speakQuestion(currentQuestion, {
        force: true,
        overrideRate: nextSlowMode ? 0.84 : 1
      });
    }
  };

  const finalizeInterview = async (reason, successMessage = "") => {
    try {
      setEndingInterview(true);
      stopRecognition({ suppressAutoSubmit: true });
      const res = await API.post(`/application/${applicationId}/ai-interview/end`, { reason });
      setRoomState((prev) => ({
        ...prev,
        aiInterview: res.data?.aiInterview || prev?.aiInterview || {},
        interviewSession: {
          endedAt: res.data?.aiInterview?.endedAt || new Date().toISOString(),
          endedBy: null
        }
      }));
      setCompleted(true);
      setSessionStarted(false);
      setNarrationMessage("Interview submitted");
      await cleanupLocalMedia();
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to finish AI interview");
    } finally {
      setEndingInterview(false);
    }
  };

  const startListening = () => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setRecognitionError("Speech recognition is not supported in this browser. Type your answer manually.");
      setChecks((prev) => ({ ...prev, speechInput: "warn" }));
      return;
    }

    stopRecognition({ suppressAutoSubmit: true });
    setRecognitionError("");
    recognitionHadErrorRef.current = false;
    shouldAutoSubmitVoiceRef.current = true;
    suppressRecognitionEndSubmitRef.current = false;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      setAnswerSource("VOICE");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        answerDraftRef.current = transcript;
        setAnswerDraft(transcript);
      }
    };

    recognition.onerror = (event) => {
      const errorCode = String(event?.error || "unknown");
      recognitionHadErrorRef.current = true;
      shouldAutoSubmitVoiceRef.current = false;
      speechFailureCountRef.current += 1;
      setRecognitionError(`Speech recognition failed: ${errorCode}. You can retry or type the answer manually.`);

      if (speechFailureCountRef.current >= 3) {
        toast.error("Repeated speech recognition failures detected. Ending the AI interview for safety.");
        finalizeInterview("FAILED");
      }
    };

    recognition.onend = () => {
      const shouldAutoSubmit = shouldAutoSubmitVoiceRef.current;
      const suppressAutoSubmit = suppressRecognitionEndSubmitRef.current;
      const latestTranscript = String(answerDraftRef.current || "").trim();
      shouldAutoSubmitVoiceRef.current = false;
      suppressRecognitionEndSubmitRef.current = false;
      setListening(false);
      recognitionRef.current = null;

      logAIInterviewClient("recognition.ended", {
        applicationId,
        shouldAutoSubmit,
        suppressAutoSubmit,
        hadError: recognitionHadErrorRef.current,
        transcriptLength: latestTranscript.length
      });

      if (
        suppressAutoSubmit ||
        recognitionHadErrorRef.current ||
        !shouldAutoSubmit ||
        !latestTranscript ||
        submittingAnswer ||
        endingInterview ||
        completed
      ) {
        recognitionHadErrorRef.current = false;
        return;
      }

      recognitionHadErrorRef.current = false;
      void submitAnswerAndContinue({
        transcriptOverride: latestTranscript,
        sourceOverride: "VOICE",
        skipRecognitionStop: true,
        trigger: "voice-auto-submit"
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const startInterview = async () => {
    if (!allRequiredChecksPassed) {
      toast.error("Please pass the internet, camera, and microphone checks first.");
      return;
    }

    try {
      setStartingInterview(true);
      logAIInterviewClient("interview.start.requested", {
        applicationId,
        initialStatus,
        allRequiredChecksPassed
      });
      const full = await requestFullscreenSafe();
      if (!full) {
        setViolation("Fullscreen permission was denied. Protected mode works best in fullscreen.");
      }

      await ensureLocalPreview();
      const alreadyInProgress = String(roomState?.aiInterview?.status || "").trim().toUpperCase() === "IN_PROGRESS";
      const res = await API.post(`/application/${applicationId}/ai-interview/start`);
      setRoomState((prev) => ({
        ...prev,
        aiInterview: res.data?.aiInterview || prev?.aiInterview || {}
      }));
      setSessionStarted(true);
      setCompleted(false);
      answerDraftRef.current = res.data?.aiInterview?.currentAnswer || "";
      setAnswerDraft(res.data?.aiInterview?.currentAnswer || "");
      setAnswerSource("TEXT");
      speechFailureCountRef.current = 0;
      spokenQuestionKeyRef.current = "";
      setNarrationMessage("Ready when you are");
      logAIInterviewClient("interview.start.response", {
        applicationId,
        questionIndex: res.data?.aiInterview?.currentQuestion?.index,
        questionId: res.data?.aiInterview?.currentQuestion?.id,
        totalQuestions: res.data?.aiInterview?.totalQuestions,
        transcriptCount: res.data?.aiInterview?.transcriptCount
      });
      speakQuestion(res.data?.aiInterview?.currentQuestion, { force: true });
      toast.success(alreadyInProgress ? "AI interview resumed" : "AI interview started");
    } catch (err) {
      logAIInterviewClient("interview.start.error", {
        applicationId,
        status: err?.response?.status,
        message: err?.response?.data?.message || err.message
      });
      toast.error(err.response?.data?.message || "Failed to start AI interview");
    } finally {
      setStartingInterview(false);
    }
  };

  const submitAnswerAndContinue = async (options = {}) => {
    const transcript = String((options.transcriptOverride ?? answerDraftRef.current ?? answerDraft) || "").trim();
    const source = String(options.sourceOverride || answerSource || "TEXT").trim().toUpperCase() === "VOICE"
      ? "VOICE"
      : "TEXT";
    if (!transcript) {
      toast.error("Record or type an answer before continuing.");
      return;
    }

    try {
      clearPendingVoiceStopSubmit();
      setSubmittingAnswer(true);
      logAIInterviewClient("answer.submit.requested", {
        applicationId,
        currentQuestionIndex,
        currentQuestionId: currentQuestion?.id,
        answerSource: source,
        answerLength: transcript.length,
        trigger: options.trigger || "manual"
      });
      answerDraftRef.current = transcript;
      if (!options.skipRecognitionStop) {
        stopRecognition({ suppressAutoSubmit: true });
      }
      cancelNarration();
      const answerRes = await API.post(`/application/${applicationId}/ai-interview/answer`, {
        transcript,
        source
      });

      setRoomState((prev) => ({
        ...prev,
        aiInterview: answerRes.data?.aiInterview || prev?.aiInterview || {}
      }));
      logAIInterviewClient("answer.submit.recorded", {
        applicationId,
        transcriptCount: answerRes.data?.aiInterview?.transcriptCount,
        currentQuestionIndex: answerRes.data?.aiInterview?.currentQuestionIndex
      });

      const nextRes = await API.post(`/application/${applicationId}/ai-interview/next`);
      logAIInterviewClient("question.next.response", {
        applicationId,
        completed: Boolean(nextRes.data?.completed),
        nextQuestionIndex: nextRes.data?.aiInterview?.currentQuestion?.index,
        nextQuestionId: nextRes.data?.aiInterview?.currentQuestion?.id,
        transcriptCount: nextRes.data?.aiInterview?.transcriptCount
      });
      if (nextRes.data?.completed) {
        await finalizeInterview("COMPLETED", "AI interview submitted successfully");
        return;
      }

      setRoomState((prev) => ({
        ...prev,
        aiInterview: nextRes.data?.aiInterview || prev?.aiInterview || {}
      }));
      answerDraftRef.current = nextRes.data?.aiInterview?.currentAnswer || "";
      setAnswerDraft(nextRes.data?.aiInterview?.currentAnswer || "");
      setAnswerSource("TEXT");
      setRecognitionError("");
      spokenQuestionKeyRef.current = "";
      speakQuestion(nextRes.data?.aiInterview?.currentQuestion, { force: true });
    } catch (err) {
      logAIInterviewClient("answer.submit.error", {
        applicationId,
        status: err?.response?.status,
        message: err?.response?.data?.message || err.message
      });
      toast.error(err.response?.data?.message || "Failed to submit your answer");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(initialStatus)) {
      setCompleted(true);
      setNarrationMessage("Interview submitted");
      return () => {};
    }

    runSystemCheck();
    if (initialStatus === "IN_PROGRESS") {
      setSessionStarted(true);
      setAnswerDraft(roomData?.aiInterview?.currentAnswer || "");
      setNarrationMessage("Ready when you are");
    }
    return () => {
      cleanupLocalMedia();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionStarted || completed || !currentQuestion) return;
    logAIInterviewClient("question.effect.triggered", {
      applicationId,
      questionIndex: currentQuestion.index,
      questionId: currentQuestion.id,
      transcriptCount: aiInterview?.transcriptCount,
      sessionStarted,
      completed
    });
    speakQuestion(currentQuestion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStarted, completed, currentQuestion?.id, currentQuestion?.index]);

  useEffect(() => {
    if (!sessionStarted) return;
    answerDraftRef.current = aiInterview?.currentAnswer || "";
    setAnswerDraft(aiInterview?.currentAnswer || "");
    setAnswerSource(currentSavedEntry?.source || "TEXT");
  }, [sessionStarted, aiInterview?.currentAnswer, currentSavedEntry?.source]);

  useEffect(() => {
    answerDraftRef.current = answerDraft;
  }, [answerDraft]);

  useEffect(() => {
    if (!sessionStarted || completed) return undefined;

    const onVisibility = () => {
      if (document.hidden) {
        setViolationCount((value) => value + 1);
        setViolation("Tab switch or minimize detected. Please return to the AI interview.");
      }
    };

    const onFullscreen = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setViolationCount((value) => value + 1);
        setViolation("Fullscreen exited. Please return to fullscreen mode.");
      }
    };

    const onUnload = (event) => {
      event.preventDefault();
      event.returnValue = "AI interview is in progress.";
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
  }, [sessionStarted, completed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (completed) {
    return (
      <div className="space-y-4">
        <InterviewHeaderBar
          eyebrow="AI Interview Panel"
          title={headerTitle}
          subtitle={`Candidate: ${participantName}`}
          chips={[
            { label: "Submitted", tone: "success" },
            { label: `${transcript.length} answers`, tone: "neutral" },
            { label: `${aiConfig.questionCount || 5} questions`, tone: "neutral" }
          ]}
        />

        <section className="rounded-[30px] border border-orange-200 bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f2_48%,#f7fbff_100%)] p-3 shadow-[0_30px_70px_rgba(148,163,184,0.18)] md:p-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.15fr_0.9fr]">
            <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,#f4f8ff_0%,#dce8f7_42%,#c4d9ef_100%)]">
                <div className="grid h-[360px] place-items-center px-6 lg:h-[420px]">
                  <div className="w-full max-w-[240px] rounded-[28px] bg-white/70 px-8 py-10 shadow-inner shadow-white/70">
                    <div className="mx-auto h-20 w-20 rounded-full bg-slate-200" />
                    <div className="mx-auto mt-6 h-24 w-36 rounded-t-[999px] rounded-b-[28px] bg-[linear-gradient(180deg,#bcd2ff_0%,#8da9ef_100%)]" />
                  </div>
                </div>
                <span className="absolute bottom-4 left-4 rounded-full bg-slate-700/85 px-4 py-1.5 text-sm font-semibold text-white">
                  You
                </span>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">AI Interview Completed</p>
                  <h2 className="mt-2 text-[1.7rem] font-black leading-tight text-slate-900">{title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                    Your interview has been submitted successfully. TalentX has saved your transcript and the recruiter can now review the AI-generated interview report.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                  {String(roomState?.aiInterview?.status || "COMPLETED").replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Submitted at" value={formatDateTime(roomState?.aiInterview?.endedAt)} />
                <MetricCard label="Transcript entries" value={transcript.length} />
              </div>

              {roomState?.aiInterview?.lastError ? (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <WarningAmberRoundedIcon sx={{ fontSize: 18, mt: "1px" }} />
                  <span>{roomState.aiInterview.lastError}</span>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setTranscriptOpen(true)}
                  className="rounded-[18px] bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <span className="inline-flex items-center gap-2">
                    <ArticleRoundedIcon sx={{ fontSize: 18 }} />
                    View Transcript
                  </span>
                </button>
                <button
                  onClick={() => navigate(backPath)}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Back to Interviews
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-full min-h-[360px] flex-col justify-between rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_48%,#fff8ee_100%)] p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">AI Interviewer</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <p className="text-lg font-bold text-slate-900">{aiPresenceLabel}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{narrationMessage}</p>
                </div>

                <div className="mx-auto mt-6 flex w-full max-w-[250px] flex-col items-center">
                  <div className="relative h-48 w-48">
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff5e8_0%,#ffe0bf_56%,#ffc68b_100%)] shadow-[0_25px_45px_rgba(251,146,60,0.18)]" />
                    <div className="absolute left-1/2 top-7 h-20 w-20 -translate-x-1/2 rounded-full bg-slate-200" />
                    <div className="absolute left-1/2 top-[88px] h-20 w-[120px] -translate-x-1/2 rounded-t-[999px] rounded-b-[28px] bg-[linear-gradient(180deg,#7a8faf_0%,#374863_100%)]" />
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-white/90 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Interview Summary</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <MetricChip label={`${aiConfig.difficulty || "MEDIUM"} difficulty`} />
                    <MetricChip label={`${transcript.length} saved answers`} />
                    <MetricChip label={`${aiConfig.questionCount || 5} questions`} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <SmartProctoringSection
          checks={[
            { label: "Internet", value: checks.internet },
            { label: "Camera", value: checks.camera },
            { label: "Microphone", value: checks.microphone },
            { label: "Speech", value: speechInputAvailable ? "pass" : "warn" },
            { label: "Fullscreen", value: "pending" },
            { label: "Focus", value: violationCount > 0 ? "warn" : "pending" }
          ]}
          violation={violation}
          violationCount={violationCount}
          sessionStarted={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InterviewHeaderBar
        eyebrow="AI Interview Panel"
        title={headerTitle}
        subtitle={`Candidate: ${participantName}`}
        chips={[
          { label: sessionStarted ? (currentQuestion ? `Question ${currentQuestion.index + 1}` : "In Progress") : "System Check", tone: "accent" },
          { label: headerTimeChip, tone: "neutral" },
          { label: aiPresenceLabel, tone: sessionStarted ? "success" : "neutral" }
        ]}
      />

      <section className="rounded-[30px] border border-orange-200 bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f2_48%,#f7fbff_100%)] p-3 shadow-[0_30px_70px_rgba(148,163,184,0.18)] md:p-4">
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.15fr_0.9fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,#f4f8ff_0%,#dce8f7_42%,#c4d9ef_100%)]">
              {localStreamRef.current ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-[360px] w-full object-cover lg:h-[420px]"
                />
              ) : (
                <div className="grid h-[360px] place-items-center px-6 lg:h-[420px]">
                  <div className="w-full max-w-[240px] rounded-[28px] bg-white/70 px-8 py-10 shadow-inner shadow-white/70">
                    <div className="mx-auto h-20 w-20 rounded-full bg-slate-200" />
                    <div className="mx-auto mt-6 h-24 w-36 rounded-t-[999px] rounded-b-[28px] bg-[linear-gradient(180deg,#bcd2ff_0%,#8da9ef_100%)]" />
                  </div>
                </div>
              )}
              <span className="absolute bottom-4 left-4 rounded-full bg-slate-700/85 px-4 py-1.5 text-sm font-semibold text-white">
                You
              </span>
            </div>
          </section>

          {!sessionStarted ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {progressLabel}
                    </p>
                    <span className="rounded-full border border-orange-300 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
                      {initialStatus === "IN_PROGRESS" ? "Resume when ready" : "Ready when you are"}
                    </span>
                  </div>
                  <h2 className="mt-4 text-[1.7rem] font-black leading-tight text-slate-900">
                    Complete the quick checks, then launch your full-screen AI interview.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    This room is now opened as a dedicated interview page. Browser fullscreen will start when you click the main button below.
                  </p>
                </div>
                <div className="rounded-[22px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                  {initialStatus === "IN_PROGRESS" ? "Resume in-progress interview" : "Pre-check required"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                {Object.entries(checks).map(([key, value]) => (
                  <div key={key} className={`rounded-2xl border px-3 py-3 ${getStatusBoxClasses(value)}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide">{key}</p>
                    <p className="mt-1 text-sm font-semibold">{String(value).toUpperCase()}</p>
                  </div>
                ))}
              </div>

              {checkError ? (
                <InfoBanner tone="warn">{checkError}</InfoBanner>
              ) : null}
              {recognitionError ? (
                <InfoBanner tone="info">{recognitionError}</InfoBanner>
              ) : null}
              {roomState?.aiInterview?.lastError ? (
                <InfoBanner tone="fail">{roomState.aiInterview.lastError}</InfoBanner>
              ) : null}

              <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Interview Settings</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <MetricCard label="Questions" value={aiConfig.questionCount || 5} />
                  <MetricCard label="Duration" value={`${aiConfig.durationMinutes || 20} min`} />
                  <MetricCard label="Difficulty" value={aiConfig.difficulty || "MEDIUM"} />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={runSystemCheck}
                  disabled={checkRunning}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {checkRunning ? "Running checks..." : "Retry Checks"}
                </button>
                <button
                  type="button"
                  onClick={startInterview}
                  disabled={startingInterview || !allRequiredChecksPassed}
                  className="rounded-full border-2 border-orange-400 bg-white px-8 py-3 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                >
                  {startingInterview ? "Opening AI panel..." : initialStatus === "IN_PROGRESS" ? "Resume Interview Fullscreen" : "Start Interview Fullscreen"}
                </button>
                <button
                  type="button"
                  onClick={() => setTranscriptOpen(true)}
                  className="rounded-[18px] bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <span className="inline-flex items-center gap-2">
                    <ArticleRoundedIcon sx={{ fontSize: 18 }} />
                    View Transcript
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(backPath)}
                  className="rounded-full bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  Back
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{progressLabel}</p>
                    <span className="rounded-full border border-orange-300 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
                      {questionChipLabel}
                    </span>
                  </div>
                  <h2 className="mt-4 text-[1.55rem] font-black leading-tight text-slate-900">{title}</h2>
                  <p className="mt-5 max-w-2xl text-[1.35rem] font-bold leading-tight text-slate-900 lg:text-[1.55rem]">
                    {currentQuestion?.prompt || "Preparing the next question..."}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Transcript entries</p>
                  <p className="mt-1">{transcript.length}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <ControlChip
                    icon={<ReplayRoundedIcon sx={{ fontSize: 18 }} />}
                    label="Repeat Question"
                    onClick={repeatQuestion}
                    disabled={!speechOutputAvailable}
                  />
                  <ControlChip
                    icon={<PauseCircleRoundedIcon sx={{ fontSize: 18 }} />}
                    label={narrationState === "paused" ? "Resume" : "Pause"}
                    onClick={togglePauseNarration}
                    disabled={!speechOutputAvailable}
                  />
                  <ControlChip
                    icon={<SlowMotionVideoRoundedIcon sx={{ fontSize: 18 }} />}
                    label={slowMode ? "Normal Speed" : "Slow Down"}
                    onClick={toggleSlowMode}
                    disabled={!speechOutputAvailable}
                    active={slowMode}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={listening ? stopListeningAndSubmit : startListening}
                  disabled={!speechInputAvailable}
                  className={`rounded-[999px] border-2 px-8 py-4 text-base font-bold transition ${
                    listening
                      ? "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-orange-400 bg-white text-orange-600 hover:bg-orange-50"
                  } disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400`}
                >
                  <span className="inline-flex items-center gap-3">
                    <MicRoundedIcon sx={{ fontSize: 22 }} />
                    {listening ? "Stop & Submit" : "Start Answering"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTranscriptOpen(true)}
                  className="rounded-[18px] bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <span className="inline-flex items-center gap-2">
                    <ArticleRoundedIcon sx={{ fontSize: 18 }} />
                    View Transcript
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSupportOpen(true)}
                  className="rounded-[18px] bg-white px-5 py-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <SupportRoundedIcon sx={{ fontSize: 18 }} />
                    Need Help?
                  </span>
                </button>
              </div>

              {recognitionError ? (
                <InfoBanner tone="info">{recognitionError}</InfoBanner>
              ) : null}

              <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                <label className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Answer Transcript
                </label>
                <textarea
                  value={answerDraft}
                  onChange={(event) => {
                    setAnswerDraft(event.target.value);
                    setAnswerSource("TEXT");
                  }}
                  rows={6}
                  className="mt-3 w-full rounded-[22px] border border-slate-300 bg-white px-4 py-4 text-sm text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                  placeholder="Use voice capture or type your answer here..."
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {speechInputAvailable ? "Voice capture is available for this browser." : "Voice capture is unavailable. Type your answer manually."}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => finalizeInterview("CANDIDATE_ENDED", "AI interview ended")}
                      disabled={endingInterview}
                      className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {endingInterview ? "Ending..." : "End Interview"}
                    </button>

                    <button
                      type="button"
                      onClick={submitAnswerAndContinue}
                      disabled={submittingAnswer || endingInterview}
                      className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingAnswer ? "Submitting..." : "Submit Answer & Continue"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-full min-h-[360px] flex-col justify-between rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_48%,#fff8ee_100%)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">AI Interviewer</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${
                    listening || narrationState === "speaking"
                      ? "bg-emerald-500"
                      : narrationState === "paused"
                        ? "bg-amber-500"
                        : "bg-slate-300"
                  }`} />
                  <p className="text-lg font-bold text-slate-900">{aiPresenceLabel}</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{narrationMessage}</p>
              </div>

              <div className="mx-auto mt-6 flex w-full max-w-[250px] flex-col items-center">
                <div className="relative h-52 w-48">
                  <div className="absolute inset-x-3 bottom-0 top-4 rounded-[34px] bg-[radial-gradient(circle_at_35%_24%,#fff6eb_0%,#ffe8cf_42%,#ffd5aa_100%)] shadow-[0_25px_45px_rgba(251,146,60,0.18)]" />
                  <div className="absolute left-1/2 top-5 h-24 w-24 -translate-x-1/2 rounded-full bg-[#313b5a]" />
                  <div className="absolute left-1/2 top-10 h-20 w-20 -translate-x-1/2 rounded-full bg-[#ffd8ba]" />
                  <div className="absolute left-[calc(50%-26px)] top-[62px] h-2 w-2 rounded-full bg-slate-700" />
                  <div className="absolute left-[calc(50%+18px)] top-[62px] h-2 w-2 rounded-full bg-slate-700" />
                  <div className="absolute left-1/2 top-[78px] h-2 w-7 -translate-x-1/2 rounded-full bg-rose-300" />
                  <div className="absolute left-1/2 top-[96px] h-24 w-[118px] -translate-x-1/2 rounded-t-[999px] rounded-b-[28px] bg-[linear-gradient(180deg,#f8fafc_0%,#dbeafe_48%,#7a8faf_100%)]" />
                  <div className="absolute left-1/2 top-[110px] h-16 w-[84px] -translate-x-1/2 rounded-t-[999px] bg-[#1e3a5f]" />
                  <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-end gap-1">
                    {[18, 30, 22, 34, 24].map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className={`w-2 rounded-full bg-orange-400 ${narrationState === "speaking" ? "animate-pulse" : ""}`}
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white/90 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Current Prompt</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                  {currentQuestion?.prompt || "The AI interviewer will ask the first question after the session starts."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <MetricChip label={`${aiConfig.difficulty || "MEDIUM"} difficulty`} />
                  <MetricChip label={`${transcript.length} saved answers`} />
                  {currentQuestion?.focusArea ? <MetricChip label={currentQuestion.focusArea} /> : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <SmartProctoringSection
        checks={[
          { label: "Internet", value: checks.internet },
          { label: "Camera", value: checks.camera },
          { label: "Microphone", value: checks.microphone },
          { label: "Speech", value: speechInputAvailable ? "pass" : "warn" },
          {
            label: "Fullscreen",
            value: !sessionStarted || completed
              ? "pending"
              : (document.fullscreenElement || document.webkitFullscreenElement ? "pass" : "warn")
          },
          {
            label: "Focus",
            value: !sessionStarted || completed ? "pending" : (violationCount > 0 ? "warn" : "pass")
          }
        ]}
        violation={violation}
        violationCount={violationCount}
        sessionStarted={sessionStarted}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Interview Details</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Scheduled: {formatDateTime(roomState?.interview?.date)} to {formatDateTime(roomState?.interview?.endDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <MetricChip label={`${aiConfig.questionCount} questions`} />
            <MetricChip label={`${aiConfig.durationMinutes} min`} />
            <MetricChip label={String(aiConfig.difficulty || "MEDIUM")} />
          </div>
        </div>
        {Array.isArray(aiConfig.focusAreas) && aiConfig.focusAreas.length ? (
          <p className="mt-4 text-sm text-slate-600">
            Focus areas: <span className="font-semibold text-slate-800">{aiConfig.focusAreas.join(", ")}</span>
          </p>
        ) : null}
      </section>

      <Dialog open={transcriptOpen} onClose={() => setTranscriptOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Interview Transcript</DialogTitle>
        <DialogContent>
          {transcript.length === 0 && !hasUnsavedDraft ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No submitted answers yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transcript.map((entry) => (
                <div key={`${entry.questionId || entry.questionIndex}-${entry.answeredAt || entry.questionIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Question {Number(entry.questionIndex || 0) + 1}
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">{entry.question || "Question"}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{entry.answer || "No answer captured."}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Source: {entry.source || "TEXT"} {entry.answeredAt ? `- ${formatDateTime(entry.answeredAt)}` : ""}
                  </p>
                </div>
              ))}

              {hasUnsavedDraft ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="text-xs font-semibold uppercase tracking-wide">Current draft not submitted</p>
                  <p className="mt-2 font-semibold">{currentQuestion?.prompt || "Current question"}</p>
                  <p className="mt-2 leading-relaxed">{unsavedDraft}</p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTranscriptOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={supportOpen} onClose={() => setSupportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Interview Support</DialogTitle>
        <DialogContent>
          <div className="space-y-3 text-sm text-slate-700">
            <p>If something goes wrong during the AI interview, use one of these support paths:</p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Contact Support</p>
              <p className="mt-2">Email: support@talentx.local</p>
              <p className="mt-1">Include the job title, interview time, and the exact error message you see.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Fast Recovery</p>
              <p className="mt-2">If speech capture fails, type the answer manually and continue.</p>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSupportOpen(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function InterviewHeaderBar({ eyebrow, title, subtitle, chips = [] }) {
  const toneClass = {
    accent: "border-orange-200 bg-orange-50 text-orange-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700"
  };

  return (
    <section className="rounded-[28px] border border-orange-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">{eyebrow}</p>
          <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={`${chip.label}-${chip.tone || "neutral"}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass[chip.tone] || toneClass.neutral}`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ControlChip({ icon, label, onClick, disabled = false, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-orange-300 bg-orange-50 text-orange-700"
          : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
      } disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400`}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MetricChip({ label }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
      {label}
    </span>
  );
}

function InfoBanner({ tone, children }) {
  const toneClass = {
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    fail: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-sky-200 bg-sky-50 text-sky-900"
  };

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClass[tone] || toneClass.info}`}>
      {children}
    </div>
  );
}

function SmartProctoringSection({ checks, violation, violationCount, sessionStarted }) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-slate-900">Smart Proctoring enabled</p>
          <p className="mt-2 text-sm text-slate-600">
            Your camera, mic, browser focus, and session behavior are monitored to help preserve interview integrity.
          </p>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Violations</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{violationCount}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {checks.map((item) => (
          <div key={item.label} className={`rounded-full border px-4 py-2 text-sm font-semibold ${getStatusBoxClasses(item.value)}`}>
            {item.label}: {String(item.value).toUpperCase()}
          </div>
        ))}
      </div>

      {sessionStarted ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Protected mode remains active until the interview ends.
        </p>
      ) : null}

      {violation ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <WarningAmberRoundedIcon sx={{ fontSize: 18, mt: "1px" }} />
          <span>{violation}</span>
        </div>
      ) : null}
    </section>
  );
}
