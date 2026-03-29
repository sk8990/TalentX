import { useEffect, useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkIcon from "@mui/icons-material/Work";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import RecommendIcon from "@mui/icons-material/Recommend";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

const statusColors = {
  APPLIED: "bg-blue-100 text-blue-700",
  SHORTLISTED: "bg-indigo-100 text-indigo-700",
  ASSESSMENT_SENT: "bg-yellow-100 text-yellow-700",
  ASSESSMENT_PASSED: "bg-emerald-100 text-emerald-700",
  ASSESSMENT_FAILED: "bg-red-100 text-red-700",
  INTERVIEW_SCHEDULED: "bg-purple-100 text-purple-700",
  SELECTED: "bg-green-100 text-green-800",
  REJECTED: "bg-rose-100 text-rose-700",
};

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelinePage, setTimelinePage] = useState(1);
  const [recommendationPage, setRecommendationPage] = useState(1);
  const navigate = useNavigate();

  const TIMELINE_PAGE_SIZE = 5;
  const RECOMMENDATION_PAGE_SIZE = 6;

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, recRes] = await Promise.all([
          API.get("/student/dashboard"),
          API.get("/student/recommendations").catch(() => ({ data: { recommendations: [] } })),
        ]);
        setData(dashRes.data);
        setRecommendations(recRes.data?.recommendations || []);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-600">
        Failed to load dashboard. Please try again.
      </div>
    );
  }

  const { stats, upcomingInterviews, recentActivity, applicationTimeline } = data;
  const timelineTotalPages = Math.max(1, Math.ceil(applicationTimeline.length / TIMELINE_PAGE_SIZE));
  const recommendationTotalPages = Math.max(1, Math.ceil(recommendations.length / RECOMMENDATION_PAGE_SIZE));

  const normalizedTimelinePage = Math.min(timelinePage, timelineTotalPages);
  const normalizedRecommendationPage = Math.min(recommendationPage, recommendationTotalPages);

  const timelineStart = (normalizedTimelinePage - 1) * TIMELINE_PAGE_SIZE;
  const visibleTimeline = applicationTimeline.slice(timelineStart, timelineStart + TIMELINE_PAGE_SIZE);

  const recommendationStart = (normalizedRecommendationPage - 1) * RECOMMENDATION_PAGE_SIZE;
  const visibleRecommendations = recommendations.slice(recommendationStart, recommendationStart + RECOMMENDATION_PAGE_SIZE);

  const statCards = [
    { label: "Applied", value: stats.totalApplied, icon: WorkIcon, color: "from-blue-500 to-blue-600" },
    { label: "Shortlisted", value: stats.shortlisted, icon: AssignmentIcon, color: "from-indigo-500 to-indigo-600" },
    { label: "Interviews", value: stats.interviewScheduled, icon: EventIcon, color: "from-purple-500 to-purple-600" },
    { label: "Selected", value: stats.selected, icon: CheckCircleIcon, color: "from-emerald-500 to-emerald-600" },
    { label: "Rejected", value: stats.rejected, icon: CancelIcon, color: "from-rose-500 to-rose-600" },
    { label: "Assessments", value: stats.assessmentPending, icon: TrendingUpIcon, color: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <div className="flex items-center gap-3">
          <DashboardIcon sx={{ fontSize: 28 }} />
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-indigo-100">
              Welcome back, {data.student?.userId?.name || "Student"}! Here&apos;s your placement overview.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl bg-gradient-to-br ${card.color} p-4 text-white shadow-lg transition hover:scale-105`}
          >
            <card.icon sx={{ fontSize: 20 }} />
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className="text-xs font-medium opacity-90">{card.label}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Interviews */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <EventIcon sx={{ fontSize: 20 }} className="text-purple-600" />
            Upcoming Interviews
          </h2>
          {upcomingInterviews.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming interviews.</p>
          ) : (
            <div className="space-y-3">
              {upcomingInterviews.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {item.jobId?.title || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.jobId?.companyName} • {item.interview?.mode}
                  </p>
                  <p className="mt-1 text-sm font-medium text-purple-700">
                    {new Date(item.interview?.date).toLocaleString()}
                  </p>
                  {item.interview?.link && (
                    <a
                      href={item.interview.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-indigo-600 hover:underline"
                    >
                      Join Meeting →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <TrendingUpIcon sx={{ fontSize: 20 }} className="text-blue-600" />
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.jobTitle}</p>
                    <p className="text-xs text-slate-500">{item.companyName}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[item.status] || "bg-slate-100 text-slate-700"}`}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Job Recommendations (F5) */}
      {recommendations.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <RecommendIcon sx={{ fontSize: 20 }} className="text-emerald-600" />
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleRecommendations.map((job) => (
              <div
                key={job._id}
                onClick={() => navigate("/student/jobs")}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {job.companyLogo && (
                    <img
                      src={job.companyLogo}
                      alt={job.companyName}
                      className="h-8 w-8 rounded object-contain"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.companyName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                    {job.ctc} LPA
                  </span>
                  {typeof job.match?.score === "number" && (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
                      Match {job.match.score}%
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Deadline: {new Date(job.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {recommendations.length > RECOMMENDATION_PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {normalizedRecommendationPage} of {recommendationTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setRecommendationPage((prev) => Math.max(prev - 1, 1))}
                  disabled={normalizedRecommendationPage <= 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1">
                    <NavigateBeforeIcon sx={{ fontSize: 14 }} />
                    Prev
                  </span>
                </button>
                <button
                  onClick={() => setRecommendationPage((prev) => Math.min(prev + 1, recommendationTotalPages))}
                  disabled={normalizedRecommendationPage >= recommendationTotalPages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1">
                    Next
                    <NavigateNextIcon sx={{ fontSize: 14 }} />
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Application Timeline (F8) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Application Timeline</h2>
        {applicationTimeline.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet. Start applying!</p>
        ) : (
          <>
            <div className="relative space-y-0">
            {visibleTimeline.map((app, idx) => (
              <div key={app._id} className="relative flex gap-4 pb-6">
                {/* Timeline line */}
                {idx < visibleTimeline.length - 1 && (
                  <div className="absolute left-4 top-8 h-full w-0.5 bg-slate-200" />
                )}
                {/* Dot */}
                <div className={`relative z-10 mt-1 h-8 w-8 flex-shrink-0 rounded-full ${
                  app.status === "SELECTED" ? "bg-emerald-500" :
                  app.status === "REJECTED" ? "bg-rose-500" :
                  "bg-indigo-500"
                } flex items-center justify-center`}>
                  <div className="h-3 w-3 rounded-full bg-white" />
                </div>
                {/* Content */}
                <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{app.jobTitle}</p>
                      <p className="text-xs text-slate-500">{app.companyName}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[app.status] || "bg-slate-100 text-slate-700"}`}>
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(app.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {app.interview?.date && (
                    <p className="mt-1 text-xs text-purple-600">
                      Interview: {new Date(app.interview.date).toLocaleString()} ({app.interview.mode})
                    </p>
                  )}
                  {app.offer && (
                    <p className="mt-1 text-xs text-emerald-600">
                      Offer: ₹{app.offer.salary} LPA • {app.offer.location} • Status: {app.offer.status}
                    </p>
                  )}
                </div>
              </div>
            ))}
            </div>
            {applicationTimeline.length > TIMELINE_PAGE_SIZE && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Page {normalizedTimelinePage} of {timelineTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimelinePage((prev) => Math.max(prev - 1, 1))}
                    disabled={normalizedTimelinePage <= 1}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1">
                      <NavigateBeforeIcon sx={{ fontSize: 14 }} />
                      Prev
                    </span>
                  </button>
                  <button
                    onClick={() => setTimelinePage((prev) => Math.min(prev + 1, timelineTotalPages))}
                    disabled={normalizedTimelinePage >= timelineTotalPages}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1">
                      Next
                      <NavigateNextIcon sx={{ fontSize: 14 }} />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
