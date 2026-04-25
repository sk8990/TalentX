import { useEffect, useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import { clearStoredOnboardingInstanceId } from "../onboarding/session";

const statusColors = {
  APPLIED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  SHORTLISTED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  ASSESSMENT_SENT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  ASSESSMENT_PASSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  ASSESSMENT_FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  INTERVIEW_SCHEDULED: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  SELECTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingOnboarding, setLaunchingOnboarding] = useState(false);
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-600 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
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
    { label: "Applied", value: stats.totalApplied, icon: WorkIcon, tone: "bg-blue-50 text-blue-700" },
    { label: "Shortlisted", value: stats.shortlisted, icon: AssignmentIcon, tone: "bg-indigo-50 text-indigo-700" },
    { label: "Interviews", value: stats.interviewScheduled, icon: EventIcon, tone: "bg-sky-50 text-sky-700" },
    { label: "Selected", value: stats.selected, icon: CheckCircleIcon, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Rejected", value: stats.rejected, icon: CancelIcon, tone: "bg-rose-50 text-rose-700" },
    { label: "Assessments", value: stats.assessmentPending, icon: TrendingUpIcon, tone: "bg-amber-50 text-amber-700" },
  ];

  const launchOnboarding = async () => {
    setLaunchingOnboarding(true);
    try {
      clearStoredOnboardingInstanceId();
      const response = await API.post("/onboarding/init");
      navigate(response.data?.redirectUrl || "/onboarding");
    } catch (err) {
      console.error("Onboarding init error:", err);
      toast.error(err.response?.data?.message || "Unable to launch onboarding right now");
    } finally {
      setLaunchingOnboarding(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section className="tx-page-header px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b95]">
            <DashboardIcon sx={{ fontSize: 24 }} className="sm:!text-[28px]" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Welcome back, {data.student?.userId?.name || "Student"}! Here&apos;s your placement overview.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="tx-card p-3.5 transition hover:-translate-y-0.5 hover:shadow-[var(--tx-shadow-card)] sm:p-4"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
              <card.icon sx={{ fontSize: 18 }} className="sm:!text-[20px]" />
            </span>
            <p className="mt-3 text-xl font-bold text-slate-950 sm:text-2xl">{card.value}</p>
            <p className="text-[0.65rem] font-medium text-slate-500 sm:text-xs">{card.label}</p>
          </div>
        ))}
      </section>

      {data.offers?.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                <BadgeOutlinedIcon sx={{ fontSize: 22 }} className="text-indigo-600" />
                Onboarding Ready
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Launch the onboarding portal for your active offers. If you have multiple offers, TalentX will let you choose the company first.
              </p>
            </div>

            <button
              type="button"
              onClick={launchOnboarding}
              disabled={launchingOnboarding}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LaunchRoundedIcon sx={{ fontSize: 18 }} />
              {launchingOnboarding ? "Launching..." : "Open Onboarding Portal"}
            </button>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {data.offers.map((offerItem) => (
              <div key={offerItem._id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  {offerItem.jobId?.companyLogo && (
                    <img
                      src={offerItem.jobId.companyLogo}
                      alt={offerItem.jobId?.companyName}
                      className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{offerItem.jobId?.title || "Offer"}</p>
                    <p className="truncate text-sm text-slate-500">{offerItem.jobId?.companyName || "Company"}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>Salary: {offerItem.offer?.salary || "Not available"}</p>
                  <p>Location: {offerItem.offer?.location || "Not available"}</p>
                  <p>Joining Date: {offerItem.offer?.joiningDate ? new Date(offerItem.offer.joiningDate).toLocaleDateString() : "Not available"}</p>
                </div>

                <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  offerItem.offer?.status === "ACCEPTED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  Offer {offerItem.offer?.status || "PENDING"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        {/* Upcoming Interviews */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:mb-4 sm:text-lg">
            <EventIcon sx={{ fontSize: 20 }} className="text-[#243b95]" />
            Upcoming Interviews
          </h2>
          {upcomingInterviews.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming interviews.</p>
          ) : (
            <div className="space-y-3">
              {upcomingInterviews.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50 sm:p-4"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.jobId?.title || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.jobId?.companyName} • {item.interview?.mode}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[#243b95]">
                    {new Date(item.interview?.date).toLocaleString()}
                  </p>
                  {item.interview?.link && (
                    <a
                      href={item.interview.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-indigo-600 hover:underline dark:text-indigo-400"
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
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:mb-4 sm:text-lg">
            <TrendingUpIcon sx={{ fontSize: 20 }} className="text-blue-600" />
            Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.jobTitle}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.companyName}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold sm:px-3 sm:text-xs ${statusColors[item.status] || "bg-slate-100 text-slate-700"}`}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Job Recommendations */}
      {recommendations.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100 sm:mb-4 sm:text-lg">
            <RecommendIcon sx={{ fontSize: 20 }} className="text-emerald-600" />
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {visibleRecommendations.map((job) => (
              <div
                key={job._id}
                onClick={() => navigate("/student/jobs")}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-700/50 dark:hover:border-indigo-500"
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{job.title}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{job.companyName}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {job.ctc} LPA
                  </span>
                  {typeof job.match?.score === "number" && (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      Match {job.match.score}%
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Deadline: {new Date(job.deadline).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
          {recommendations.length > RECOMMENDATION_PAGE_SIZE && (
            <PaginationControls
              page={normalizedRecommendationPage}
              totalPages={recommendationTotalPages}
              onPrev={() => setRecommendationPage((prev) => Math.max(prev - 1, 1))}
              onNext={() => setRecommendationPage((prev) => Math.min(prev + 1, recommendationTotalPages))}
            />
          )}
        </section>
      )}

      {/* Application Timeline */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-6">
        <h2 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-100 sm:mb-4 sm:text-lg">Application Timeline</h2>
        {applicationTimeline.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No applications yet. Start applying!</p>
        ) : (
          <>
            <div className="relative space-y-0">
            {visibleTimeline.map((app, idx) => (
              <div key={app._id} className="relative flex gap-3 pb-5 sm:gap-4 sm:pb-6">
                {/* Timeline line */}
                {idx < visibleTimeline.length - 1 && (
                  <div className="absolute left-3.5 top-8 h-full w-0.5 bg-slate-200 dark:bg-slate-600 sm:left-4" />
                )}
                {/* Dot */}
                <div className={`relative z-10 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8 ${
                  app.status === "SELECTED" ? "bg-emerald-500" :
                  app.status === "REJECTED" ? "bg-rose-500" :
                  "bg-indigo-500"
                }`}>
                  <div className="h-2.5 w-2.5 rounded-full bg-white sm:h-3 sm:w-3" />
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{app.jobTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{app.companyName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold sm:px-3 sm:text-xs ${statusColors[app.status] || "bg-slate-100 text-slate-700"}`}>
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] text-slate-500 dark:text-slate-400 sm:gap-3 sm:text-xs">
                    <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(app.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {app.interview?.date && (
                    <p className="mt-1 text-xs text-[#243b95]">
                      Interview: {new Date(app.interview.date).toLocaleString()} ({app.interview.mode})
                    </p>
                  )}
                  {app.offer && (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                      Offer: ₹{app.offer.salary} LPA • {app.offer.location} • Status: {app.offer.status}
                    </p>
                  )}
                </div>
              </div>
            ))}
            </div>
            {applicationTimeline.length > TIMELINE_PAGE_SIZE && (
              <PaginationControls
                page={normalizedTimelinePage}
                totalPages={timelineTotalPages}
                onPrev={() => setTimelinePage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setTimelinePage((prev) => Math.min(prev + 1, timelineTotalPages))}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PaginationControls({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          <span className="inline-flex items-center gap-1">
            <NavigateBeforeIcon sx={{ fontSize: 14 }} />
            Prev
          </span>
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          <span className="inline-flex items-center gap-1">
            Next
            <NavigateNextIcon sx={{ fontSize: 14 }} />
          </span>
        </button>
      </div>
    </div>
  );
}
