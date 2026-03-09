import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await API.get("/application/my/interviews");

      const validInterviews = (res.data || []).filter(
        (app) => app.status === "INTERVIEW_SCHEDULED" && app.interview && app.interview.date
      );

      setInterviews(validInterviews);
    } catch (err) {
      console.error("Failed to fetch interviews", err);
      alert("Failed to load interviews");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  const joinInterview = (link) => {
    if (!link) {
      alert("Interview link not available");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const sortedInterviews = useMemo(
    () => [...interviews].sort((a, b) => new Date(a.interview?.date).getTime() - new Date(b.interview?.date).getTime()),
    [interviews]
  );

  const now = new Date();
  const upcomingInterviews = sortedInterviews.filter((app) => new Date(app.interview?.date).getTime() >= now.getTime());
  const pastInterviews = sortedInterviews.filter((app) => new Date(app.interview?.date).getTime() < now.getTime());

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading interviews...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Interviews</h1>
            <p className="mt-2 text-sm text-indigo-100">Prepare and join your scheduled interview rounds.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchInterviews(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon sx={{ fontSize: 16 }} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {sortedInterviews.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No interviews scheduled.
        </div>
      ) : (
        <>
          <InterviewSection
            title={`Upcoming Interviews (${upcomingInterviews.length})`}
            emptyText="No upcoming interviews."
            items={upcomingInterviews}
            onJoin={joinInterview}
            past={false}
          />

          <InterviewSection
            title={`Past Interviews (${pastInterviews.length})`}
            emptyText="No past interviews."
            items={pastInterviews}
            onJoin={joinInterview}
            past
          />
        </>
      )}
    </div>
  );
}

function InterviewSection({ title, emptyText, items, onJoin, past }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {items.map((app) => (
            <InterviewCard key={app._id} app={app} onJoin={onJoin} past={past} />
          ))}
        </div>
      )}
    </section>
  );
}

function InterviewCard({ app, onJoin, past }) {
  const interview = app.interview;
  const scheduleMeta = getScheduleMeta(interview?.date);
  const canJoin = Boolean(interview?.link) && !past;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-900">{app.jobId?.title || "Job Title"}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scheduleMeta.badgeClass}`}>{scheduleMeta.label}</span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <InfoCard label="Date & Time" value={formatDateTime(interview?.date)} />
        <InfoCard label="Mode" value={interview?.mode || "N/A"} />
        <InfoCard
          label={interview?.mode === "Online" ? "Meeting Link" : "Venue"}
          value={interview?.link || "Not provided"}
          isLink={Boolean(interview?.link)}
        />
      </div>

      <div className="mt-6">
        <button
          onClick={() => onJoin(interview?.link)}
          disabled={!canJoin}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
        >
          <span className="inline-flex items-center gap-1">
            <VideoCallIcon sx={{ fontSize: 16 }} />
            {past ? "Interview Completed" : canJoin ? "Join Interview" : "Link Not Available"}
          </span>
        </button>
      </div>
    </article>
  );
}

function InfoCard({ label, value, isLink = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all font-semibold text-indigo-600 hover:text-indigo-700">
          {value}
        </a>
      ) : (
        <p className="mt-2 font-semibold text-slate-800">{value}</p>
      )}
    </div>
  );
}

function formatDateTime(date) {
  if (!date) return "Not scheduled";
  return new Date(date).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScheduleMeta(date) {
  const interviewDate = date ? new Date(date) : null;
  if (!interviewDate || Number.isNaN(interviewDate.getTime())) {
    return { label: "Unknown", badgeClass: "bg-slate-100 text-slate-700" };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfInterviewDay = new Date(interviewDate.getFullYear(), interviewDate.getMonth(), interviewDate.getDate());
  const diffDays = Math.floor((startOfInterviewDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Completed", badgeClass: "bg-slate-100 text-slate-700" };
  if (diffDays === 0) return { label: "Today", badgeClass: "bg-emerald-100 text-emerald-700" };
  if (diffDays === 1) return { label: "Tomorrow", badgeClass: "bg-amber-100 text-amber-700" };
  return { label: `In ${diffDays} days`, badgeClass: "bg-indigo-100 text-indigo-700" };
}
