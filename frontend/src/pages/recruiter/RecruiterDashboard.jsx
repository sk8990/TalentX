import { useEffect, useState } from "react";
import API from "../../api/axios";
import { Link } from "react-router-dom";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedIcon from "@mui/icons-material/Verified";
import toast from "react-hot-toast";

function toSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeRecruiterStats(payload) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload || {};

  return {
    jobs: toSafeNumber(source.jobs ?? source.totalJobs ?? source.jobCount ?? source.total_jobs, 0),
    applications: toSafeNumber(
      source.applications ?? source.totalApplications ?? source.applicationCount ?? source.total_applications,
      0
    ),
    selected: toSafeNumber(source.selected ?? source.selectedCandidates ?? source.selectedCount, 0),
  };
}

export default function RecruiterDashboard() {
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
    selected: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const companyStatsRes = await API.get("/company/recruiter/stats");
      const normalizedCompanyStats = normalizeRecruiterStats(companyStatsRes.data);

      // Fallback for environments where /company/recruiter/stats still returns only totalJobs.
      if (normalizedCompanyStats.applications === 0 && normalizedCompanyStats.selected === 0) {
        try {
          const recruiterStatsRes = await API.get("/recruiter/stats");
          const normalizedRecruiterStats = normalizeRecruiterStats(recruiterStatsRes.data);
          setStats({
            jobs: normalizedCompanyStats.jobs || normalizedRecruiterStats.jobs,
            applications: normalizedRecruiterStats.applications,
            selected: normalizedRecruiterStats.selected,
          });
          return;
        } catch (fallbackErr) {
          console.error("Fallback recruiter stats failed", fallbackErr);
        }
      }

      setStats(normalizedCompanyStats);
    } catch (err) {
      console.error("Failed to load recruiter stats", err);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl">
        <p className="animate-pulse text-sm font-medium text-slate-500 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Recruiter Dashboard</h1>
        <p className="mt-1 max-w-xl text-xs text-indigo-100 sm:mt-2 sm:text-sm">
          Track jobs, monitor candidate flow, and review AI-led interview outcomes in one workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Jobs Posted" value={stats.jobs} tone="indigo" icon={WorkIcon} />
        <StatCard label="Total Applications" value={stats.applications} tone="sky" icon={DescriptionIcon} />
        <StatCard label="Selected Candidates" value={stats.selected} tone="emerald" icon={VerifiedIcon} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">Quick Actions</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Jump into job posting, candidate review, and AI interview management.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/recruiter/jobs"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Manage Jobs
          </Link>

          <Link
            to="/recruiter/applications"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Review AI Interviews
          </Link>

          <Link
            to="/recruiter/support"
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon }) {
  const toneMap = {
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700 dark:from-indigo-900/30 dark:to-indigo-800/30 dark:text-indigo-300",
    sky: "from-sky-50 to-sky-100 text-sky-700 dark:from-sky-900/30 dark:to-sky-800/30 dark:text-sky-300",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:text-emerald-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
      <div className={`mt-3 rounded-xl bg-gradient-to-br px-3 py-4 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-5 ${toneMap[tone] || toneMap.indigo}`}>
        <p className="inline-flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          {Icon ? <Icon sx={{ fontSize: 24 }} /> : null}
          {toSafeNumber(value, 0)}
        </p>
      </div>
    </div>
  );
}
