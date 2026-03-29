import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@mui/material";
import toast from "react-hot-toast";
import API from "../../api/axios";

function formatDateTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "N/A" : parsed.toLocaleString();
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

function statusBadge(status) {
  if (status === "pass") return "text-emerald-700";
  if (status === "warn") return "text-amber-700";
  if (status === "fail") return "text-rose-700";
  return "text-slate-600";
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

export default function AIInterviewRoom({ roomData }) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const spokenQuestionKeyRef = useRef("");
  const speechFailureCountRef = useRef(0);

  const [roomState, setRoomState] = useState(roomData);
  const [checks, setChecks] = useState(getDefaultChecks());
  const [checkRunning, setCheckRunning] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [violation, setViolation] = useState("");
  const [violationCount, setViolationCount] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [startingInterview, setStartingInterview] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerSource, setAnswerSource] = useState("TEXT");
  const [supportOpen, setSupportOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  const backPath = "/student/interviews";
  const aiInterview = roomState?.aiInterview || {};
  const currentQuestion = aiInterview?.currentQuestion || null;
  const title = useMemo(() => {
    const job = roomState?.job?.title || "AI Interview";
    const company = roomState?.job?.companyName || "";
    return company ? `${job} - ${company}` : job;
  }, [roomState]);

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

  const stopRecognition = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // Ignore stop errors.
    }
    recognitionRef.current = null;
    setListening(false);
  };

  const cleanupLocalMedia = async () => {
    stopRecognition();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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

      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const camera = probe.getVideoTracks().length ? "pass" : "fail";
      const microphone = probe.getAudioTracks().length ? "pass" : "fail";
      probe.getTracks().forEach((track) => track.stop());
      setChecks({ ...base, camera, microphone });

      if (base.speechInput === "warn") {
        setRecognitionError("Browser speech recognition is unavailable here. Manual typing will remain available.");
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
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const speakQuestion = (question) => {
    if (!question?.prompt || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const key = `${question.id}:${question.index}`;
    if (spokenQuestionKeyRef.current === key) {
      return;
    }

    spokenQuestionKeyRef.current = key;
    window.speechSynthesis.cancel();
    const prefix = question.index === 0
      ? "Welcome to your AI interview. Please answer clearly and naturally. First question. "
      : `Question ${question.index + 1}. `;
    const utterance = new SpeechSynthesisUtterance(`${prefix}${question.prompt}`);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const finalizeInterview = async (reason, successMessage = "") => {
    try {
      setEndingInterview(true);
      stopRecognition();
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

    stopRecognition();
    setRecognitionError("");

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
        setAnswerDraft(transcript);
      }
    };

    recognition.onerror = (event) => {
      const errorCode = String(event?.error || "unknown");
      speechFailureCountRef.current += 1;
      setRecognitionError(`Speech recognition failed: ${errorCode}. You can retry or type the answer manually.`);

      if (speechFailureCountRef.current >= 3) {
        toast.error("Repeated speech recognition failures detected. Ending the AI interview for safety.");
        finalizeInterview("FAILED");
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
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
      const full = await requestFullscreenSafe();
      if (!full) {
        setViolation("Fullscreen permission was denied. Protected mode works best in fullscreen.");
      }

      await ensureLocalPreview();
      const res = await API.post(`/application/${applicationId}/ai-interview/start`);
      setRoomState((prev) => ({
        ...prev,
        aiInterview: res.data?.aiInterview || prev?.aiInterview || {}
      }));
      setSessionStarted(true);
      setCompleted(false);
      setAnswerDraft("");
      setAnswerSource("TEXT");
      speechFailureCountRef.current = 0;
      toast.success("AI interview started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start AI interview");
    } finally {
      setStartingInterview(false);
    }
  };

  const submitAnswerAndContinue = async () => {
    const transcript = String(answerDraft || "").trim();
    if (!transcript) {
      toast.error("Record or type an answer before continuing.");
      return;
    }

    try {
      setSubmittingAnswer(true);
      await API.post(`/application/${applicationId}/ai-interview/answer`, {
        transcript,
        source: answerSource
      });

      const nextRes = await API.post(`/application/${applicationId}/ai-interview/next`);
      if (nextRes.data?.completed) {
        await finalizeInterview("COMPLETED", "AI interview submitted successfully");
        return;
      }

      setRoomState((prev) => ({
        ...prev,
        aiInterview: nextRes.data?.aiInterview || prev?.aiInterview || {}
      }));
      setAnswerDraft("");
      setAnswerSource("TEXT");
      setRecognitionError("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit your answer");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  useEffect(() => {
    runSystemCheck();
    return () => {
      cleanupLocalMedia();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionStarted || completed || !currentQuestion) return;
    speakQuestion(currentQuestion);
  }, [sessionStarted, completed, currentQuestion]);

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

  if (completed) {
    return (
      <div className="space-y-4">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">AI Interview Completed</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-300">
            Your interview has been submitted. The recruiter can now review the AI interview report.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {String(roomState?.aiInterview?.status || "COMPLETED").replaceAll("_", " ")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted At</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatDateTime(roomState?.aiInterview?.endedAt)}
              </p>
            </div>
          </div>

          {roomState?.aiInterview?.lastError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {roomState.aiInterview.lastError}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigate(backPath)}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
            >
              Back to Interviews
            </button>
            <button
              onClick={() => runSystemCheck()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Re-run System Check
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">AI Interview Panel</p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Scheduled: {formatDateTime(roomState?.interview?.date)} to {formatDateTime(roomState?.interview?.endDate)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <p>Difficulty: {aiConfig.difficulty}</p>
            <p>Questions: {aiConfig.questionCount}</p>
            <p>Duration: {aiConfig.durationMinutes} minutes</p>
          </div>
        </div>
      </section>

      {!sessionStarted ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">System Check Before Start</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {Object.entries(checks).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-slate-500">{key}</p>
                <p className={`mt-1 text-sm font-semibold ${statusBadge(value)}`}>{String(value).toUpperCase()}</p>
              </div>
            ))}
          </div>

          {checkError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {checkError}
            </div>
          ) : null}

          {recognitionError ? (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {recognitionError}
            </div>
          ) : null}

          {roomState?.aiInterview?.lastError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {roomState.aiInterview.lastError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="outlined"
              onClick={runSystemCheck}
              disabled={checkRunning}
              sx={{ textTransform: "none", borderRadius: 3 }}
            >
              {checkRunning ? "Retrying..." : "Retry Checks"}
            </Button>
            <Button
              variant="contained"
              onClick={startInterview}
              disabled={startingInterview || !allRequiredChecksPassed}
              sx={{ textTransform: "none", borderRadius: 3, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
            >
              {startingInterview ? "Starting..." : "Start AI Interview"}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => navigate(backPath)}
              sx={{ textTransform: "none", borderRadius: 3 }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <div className="flex h-full min-h-[380px] flex-col justify-between rounded-[22px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">AI Interviewer</p>
                  <h2 className="mt-3 text-3xl font-semibold">TalentX AI Panel</h2>
                  <p className="mt-3 max-w-lg text-sm text-slate-300">
                    The AI interviewer asks questions, listens to your responses, and prepares a recruiter-only evaluation report.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-2xl font-bold shadow-lg shadow-indigo-900/50">
                    AI
                  </div>
                  <div className="flex items-end gap-1">
                    {[12, 24, 16, 30, 20].map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="w-2 animate-pulse rounded-full bg-cyan-300"
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Current Question</p>
                  <p className="mt-2 text-base font-medium text-white">
                    {currentQuestion?.prompt || "Preparing the next AI prompt..."}
                  </p>
                  {currentQuestion?.focusArea ? (
                    <p className="mt-2 text-xs text-cyan-200">Focus area: {currentQuestion.focusArea}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="relative overflow-hidden rounded-[22px] bg-slate-950">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-[380px] w-full object-cover"
                />
                <span className="absolute bottom-4 left-4 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold text-white">
                  You (candidate)
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question Progress</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  Question {(currentQuestion?.index ?? aiInterview.currentQuestionIndex ?? 0) + 1} of {aiInterview.totalQuestions || aiConfig.questionCount}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSupportOpen(true)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Need Help?
                </button>
                <button
                  onClick={() => finalizeInterview("CANDIDATE_ENDED", "AI interview ended")}
                  disabled={endingInterview}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {endingInterview ? "Ending..." : "End Interview"}
                </button>
              </div>
            </div>

            {violation ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                {violation} Violations: {violationCount}
              </div>
            ) : null}

            {recognitionError ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                {recognitionError}
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Answer Transcript
                <textarea
                  value={answerDraft}
                  onChange={(event) => {
                    setAnswerDraft(event.target.value);
                    setAnswerSource("TEXT");
                  }}
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                  placeholder="Use voice capture or type your answer here..."
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={listening ? stopRecognition : startListening}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                    listening ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {listening ? "Stop Listening" : "Record Voice Answer"}
                </button>
                <button
                  onClick={submitAnswerAndContinue}
                  disabled={submittingAnswer || endingInterview}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingAnswer ? "Submitting..." : "Submit Answer & Continue"}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>Source: {answerSource}</span>
                <span>Transcript entries saved: {aiInterview.transcriptCount || 0}</span>
                {Array.isArray(aiConfig.focusAreas) && aiConfig.focusAreas.length ? (
                  <span>Focus: {aiConfig.focusAreas.join(", ")}</span>
                ) : null}
              </div>
            </div>
          </section>
        </>
      )}

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
