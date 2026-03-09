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
      <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <p className="animate-pulse text-sm font-medium text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-indigo-100">
          Track jobs, monitor candidate flow, and move your hiring pipeline faster.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Jobs Posted" value={stats.jobs} tone="indigo" icon={WorkIcon} />
        <StatCard label="Total Applications" value={stats.applications} tone="sky" icon={DescriptionIcon} />
        <StatCard label="Selected Candidates" value={stats.selected} tone="emerald" icon={VerifiedIcon} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-slate-500">Go directly to core recruiter workflows.</p>
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
            Manage Applications
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
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700",
    sky: "from-sky-50 to-sky-100 text-sky-700",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={`mt-4 rounded-2xl bg-gradient-to-br px-4 py-5 ${toneMap[tone] || toneMap.indigo}`}>
        <p className="inline-flex items-center gap-2 text-3xl font-bold">
          {Icon ? <Icon sx={{ fontSize: 24 }} /> : null}
          {toSafeNumber(value, 0)}
        </p>
      </div>
    </div>
  );
}
