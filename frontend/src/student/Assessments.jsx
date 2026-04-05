import { useEffect, useMemo, useState } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from "@mui/material";
import toast from "react-hot-toast";
import API from "../api/axios";

const TABS = ["upcoming", "past"];

const normalizeAssessmentLink = (link) => {
  if (!link || typeof link !== "string") return "";
  const trimmed = link.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

function getAssessmentDateValue(app) {
  return app?.assessmentDateTime || app?.assessment?.scheduledAt || app?.createdAt || null;
}

function getAssessmentUiStatus(app, nowMs) {
  if (String(app?.uiStatus || "").trim()) {
    return String(app.uiStatus).trim().toUpperCase();
  }

  const status = String(app?.status || "").trim().toUpperCase();
  if (status === "ASSESSMENT_PASSED" || status === "ASSESSMENT_FAILED") {
    return "COMPLETED";
  }

  const assessmentDate = getAssessmentDateValue(app);
  const ts = assessmentDate ? new Date(assessmentDate).getTime() : NaN;
  if (Number.isFinite(ts) && ts < nowMs) return "MISSED";
  return "UPCOMING";
}

function formatDateTime(date) {
  if (!date) return "Not scheduled";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not scheduled";
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [resultDialog, setResultDialog] = useState(null);

  const fetchAssessments = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await API.get("/application/my/assessments");
      setAssessments(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load assessments");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const upcomingAssessments = useMemo(
    () => (assessments || []).filter((app) => getAssessmentUiStatus(app, nowMs) === "UPCOMING"),
    [assessments, nowMs]
  );

  const pastAssessments = useMemo(
    () => (assessments || []).filter((app) => getAssessmentUiStatus(app, nowMs) !== "UPCOMING"),
    [assessments, nowMs]
  );

  const visibleItems = activeTab === "upcoming" ? upcomingAssessments : pastAssessments;

  const openAssessment = (assessmentLink) => {
    if (!assessmentLink) {
      toast.error("Assessment link unavailable");
      return;
    }
    window.open(assessmentLink, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:rounded-3xl">
        Loading assessments...
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Assessments</h1>
            <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">Track upcoming tests and review completed outcomes.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchAssessments(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon sx={{ fontSize: 16 }} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const count = tab === "upcoming" ? upcomingAssessments.length : pastAssessments.length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab === "upcoming" ? "Upcoming Assessments" : "Past Assessments"} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {activeTab === "upcoming" ? "No upcoming assessments." : "No past assessments."}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((app) => {
            const status = getAssessmentUiStatus(app, nowMs);
            const assessmentDate = getAssessmentDateValue(app);
            const assessmentLink = normalizeAssessmentLink(app?.assessment?.link);
            const jobTitle = app?.jobId?.title || "Assessment";
            const companyName = app?.jobId?.companyName?.trim() || "";
            const canStart = status === "UPCOMING" && Boolean(assessmentLink);
            const canViewResult = status === "COMPLETED";
            const passed = Boolean(app?.assessment?.passed);

            return (
              <article key={app._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {companyName ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{companyName}</p>
                    ) : null}
                    <h3 className="text-xl font-semibold text-slate-900">{jobTitle}</h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      status === "UPCOMING"
                        ? "bg-indigo-100 text-indigo-700"
                        : status === "MISSED"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {status === "UPCOMING" ? "Upcoming" : status === "MISSED" ? "Missed" : "Completed"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <InfoCard label="Title" value={jobTitle} />
                  <InfoCard label="Company Name" value={companyName || "N/A"} />
                  <InfoCard label="Date & Time" value={formatDateTime(assessmentDate)} />
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {canStart ? (
                    <button
                      type="button"
                      onClick={() => openAssessment(assessmentLink)}
                      className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      <span className="inline-flex items-center gap-1">
                        Start Assessment
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </span>
                    </button>
                  ) : null}

                  {canViewResult ? (
                    <button
                      type="button"
                      onClick={() => setResultDialog(app)}
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <span className="inline-flex items-center gap-1">
                        View Result
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                      </span>
                    </button>
                  ) : null}

                  {status === "MISSED" ? (
                    <span className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">
                      Assessment window passed
                    </span>
                  ) : null}

                  {status === "COMPLETED" ? (
                    <span
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                        passed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {passed ? "Result: Passed" : "Result: Completed"}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(resultDialog)}
        onClose={() => setResultDialog(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, border: "1px solid #e2e8f0" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a" }}>Assessment Result</DialogTitle>
        <DialogContent>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {resultDialog?.jobId?.title || "Assessment"} {resultDialog?.jobId?.companyName ? `- ${resultDialog.jobId.companyName}` : ""}
            </p>
            <p>Status: {resultDialog?.assessment?.passed ? "Passed" : "Completed"}</p>
            <p>Score: {resultDialog?.assessment?.score || "N/A"}</p>
            <p>Date: {formatDateTime(getAssessmentDateValue(resultDialog))}</p>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setResultDialog(null)} variant="contained" sx={{ textTransform: "none", borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
