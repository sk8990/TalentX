import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../../api/axios";
import TalentXBrand from "../../components/TalentXBrand";
import InterviewerFeedbackForm, {
  FeedbackPreview,
  getDefaultInterviewerFeedbackForm
} from "../../components/interviewer/InterviewerFeedbackForm";

const BUCKETS = ["upcoming", "pending", "completed"];

export default function InterviewerPanel() {
  const navigate = useNavigate();
  const [activeBucket, setActiveBucket] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [forms, setForms] = useState({});

  const fetchItems = async (bucket = activeBucket) => {
    try {
      setLoading(true);
      const res = await API.get(`/interviewer/interviews?bucket=${bucket}`);
      setItems(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(activeBucket);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBucket]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const updateForm = (applicationId, update) => {
    setForms((prev) => {
      const existing = prev[applicationId] || getDefaultInterviewerFeedbackForm();
      const nextValue = typeof update === "function" ? update(existing) : { ...existing, ...update };
      return { ...prev, [applicationId]: nextValue };
    });
  };

  const handleFeedbackSubmit = async (applicationId) => {
    const payload = forms[applicationId] || getDefaultInterviewerFeedbackForm();

    try {
      setSubmittingId(applicationId);
      await API.post(`/interviewer/interviews/${applicationId}/feedback`, payload);
      toast.success("Feedback submitted");
      fetchItems(activeBucket);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingId("");
    }
  };

  const title = useMemo(() => {
    if (activeBucket === "upcoming") return "Upcoming Interviews";
    if (activeBucket === "pending") return "Pending Feedback";
    return "Completed Interviews";
  }, [activeBucket]);

  const joinRoom = (applicationId) => {
    if (!applicationId) {
      toast.error("Interview room is unavailable");
      return;
    }
    navigate(`/interviewer/interviews/${applicationId}/room`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <TalentXBrand theme="dark" size="sm" className="max-w-[340px]" />
        <h1 className="text-3xl font-bold">Interviewer Panel</h1>
        <p className="mt-2 text-sm text-indigo-100">Review your assigned interviews and submit candidate evaluation.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((bucket) => (
            <button
              key={bucket}
              onClick={() => setActiveBucket(bucket)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeBucket === bucket
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {bucket[0].toUpperCase() + bucket.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading interviews...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No interviews found in this section.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const form = forms[item._id] || getDefaultInterviewerFeedbackForm();
              const feedbackSubmitted = Boolean(item?.interviewerFeedback?.submittedAt);
              const canSubmit = activeBucket === "pending" && !feedbackSubmitted;
              const mode = String(item?.interview?.mode || "").trim().toLowerCase();
              const isOnline = mode === "online";
              const windowStartTs = item?.accessWindowStart
                ? new Date(item.accessWindowStart).getTime()
                : new Date(item?.interview?.date || 0).getTime() - (15 * 60 * 1000);
              const windowEndTs = item?.accessWindowEnd
                ? new Date(item.accessWindowEnd).getTime()
                : new Date(item?.interview?.endDate || item?.interview?.date || 0).getTime();
              const canJoinRoom = isOnline && Number.isFinite(windowStartTs) && Number.isFinite(windowEndTs)
                ? nowMs >= windowStartTs && nowMs <= windowEndTs
                : false;
              const countdown = Math.max(
                0,
                Math.floor((new Date(item?.interview?.date || Date.now()).getTime() - nowMs) / 1000)
              );

              return (
                <article key={item._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.jobId?.companyName || "Company"}
                      </p>
                      <h3 className="text-xl font-semibold text-slate-900">{item.jobId?.title || "Job Title"}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Candidate: {item.studentId?.userId?.name || "Unknown"} ({item.studentId?.userId?.email || "No email"})
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {new Date(item.interview?.date).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InfoItem label="Mode" value={item.interview?.mode || "N/A"} />
                    <InfoItem label="Starts" value={formatDateTime(item.interview?.date)} />
                    <InfoItem label="Ends" value={formatDateTime(item.interview?.endDate)} />
                  </div>

                  {item.interview?.link ? (
                    <a
                      href={item.interview.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block break-all text-sm font-semibold text-indigo-600"
                    >
                      Backup Link: {item.interview.link}
                    </a>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => joinRoom(item._id)}
                      disabled={!canJoinRoom}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                    >
                      {canJoinRoom ? "Join Virtual Panel" : "Join Locked"}
                    </button>
                    {!canJoinRoom && activeBucket === "upcoming" ? (
                      <span className="text-xs font-semibold text-amber-700">
                        Room opens in {formatCountdown(countdown)}
                      </span>
                    ) : null}
                  </div>

                  {feedbackSubmitted ? (
                    <FeedbackPreview feedback={item.interviewerFeedback} />
                  ) : null}

                  {canSubmit ? (
                    <InterviewerFeedbackForm
                      className="mt-5"
                      value={form}
                      onChange={(nextValue) => updateForm(item._id, nextValue)}
                      onSubmit={() => handleFeedbackSubmit(item._id)}
                      submitting={submittingId === item._id}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value || "N/A"}</p>
    </div>
  );
}

function formatDateTime(date) {
  if (!date) return "N/A";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString();
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
