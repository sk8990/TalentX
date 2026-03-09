import { useEffect, useState } from "react";
import API from "../api/axios";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const normalizeAssessmentLink = (link) => {
  if (!link || typeof link !== "string") return "";
  const trimmed = link.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export default function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const res = await API.get("/application/my/assessments");
        setAssessments(res.data || []);
      } catch {
        alert("Failed to load assessments");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading assessments...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">Assessments</h1>
        <p className="mt-2 text-sm text-indigo-100">Open tests shared by recruiters and submit them on time.</p>
      </section>

      {assessments.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No assessments assigned yet.</div>
      ) : (
        <div className="space-y-4">
          {assessments.map((app) => {
            const assessmentLink = normalizeAssessmentLink(app.assessment?.link);
            return (
              <article key={app._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">{app.jobId?.title || "Job Assessment"}</h2>
                <p className="mt-1 text-sm text-slate-500">Assessment link provided by recruiter.</p>
                <div className="mt-5">
                  {assessmentLink ? (
                    <a
                      href={assessmentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      <span className="inline-flex items-center gap-1">
                        Open Assessment
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </span>
                    </a>
                  ) : (
                    <span className="inline-flex cursor-not-allowed items-center rounded-xl bg-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600">
                      Assessment link unavailable
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
