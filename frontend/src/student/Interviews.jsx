import { useEffect, useState } from "react";
import API from "../api/axios";
import VideoCallIcon from "@mui/icons-material/VideoCall";

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
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
      setLoading(false);
    }
  };

  const joinInterview = (link) => {
    if (!link) {
      alert("Interview link not available");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading interviews...</div>;
  }

  if (interviews.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No interviews scheduled.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">Interviews</h1>
        <p className="mt-2 text-sm text-indigo-100">Prepare and join your scheduled interview rounds.</p>
      </section>

      {interviews.map((app) => {
        const interview = app.interview;

        return (
          <article key={app._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{app.jobId?.title || "Job Title"}</h2>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <InfoCard label="Date & Time" value={interview?.date ? new Date(interview.date).toLocaleString() : "Not scheduled"} />
              <InfoCard label="Mode" value={interview?.mode || "N/A"} />
              <InfoCard label={interview?.mode === "Online" ? "Meeting Link" : "Venue"} value={interview?.link || "Not provided"} isLink={Boolean(interview?.link)} />
            </div>

            <div className="mt-6">
              <button
                onClick={() => joinInterview(interview?.link)}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <span className="inline-flex items-center gap-1">
                  <VideoCallIcon sx={{ fontSize: 16 }} />
                  Join Interview
                </span>
              </button>
            </div>
          </article>
        );
      })}
    </div>
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
