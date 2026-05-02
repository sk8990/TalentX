import { useEffect, useState } from "react";
import API from "../../api/axios";
import { getMySubscription } from "../../api/subscriptionApi";
import { Link } from "react-router-dom";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedIcon from "@mui/icons-material/Verified";
import toast from "react-hot-toast";
import ScreenLoader from "../../components/ScreenLoader";

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

// Read the stored approval status as a safe starting point only.
// IMPORTANT: missing or empty status must default to "pending", never "approved".
// This value is only used as the initial state while the backend fetch is in
// flight — it is always overwritten by the live API response.
function getStoredApprovalStatus() {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const status = String(user?.recruiterApprovalStatus || "").trim();
    // Only trust an explicit "approved" value from storage.
    // Any missing, empty, or unrecognised value is treated as "pending".
    return status === "approved" ? "approved" : "pending";
  } catch {
    return "pending";
  }
}

const approvalMessages = {
  pending: {
    title: "Account Pending Approval",
    message: "Your recruiter account is pending approval from TalentX Super Admin. You will be able to access the full dashboard once approved.",
    tone: "amber",
  },
  rejected: {
    title: "Account Rejected",
    message: "Your recruiter account has been rejected. Please contact TalentX support for more details.",
    tone: "rose",
  },
  suspended: {
    title: "Account Suspended",
    message: "Your recruiter account has been suspended. Please contact TalentX support to resolve this.",
    tone: "rose",
  },
};

export default function RecruiterDashboard() {
  // Start with the stored value as a hint, but always verify with the backend.
  // Default is "pending" — not "approved" — so stale or missing localStorage
  // cannot unlock the dashboard UI.
  const [approvalStatus, setApprovalStatus] = useState(getStoredApprovalStatus);
  // approvalChecked tracks whether the backend has responded.
  // Until it has, we show a loader regardless of the stored value.
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [stats, setStats] = useState({ jobs: 0, applications: 0, selected: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [hasPackage, setHasPackage] = useState(false);
  const [packageChecked, setPackageChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Always fetch the live approval status from the backend on mount.
    // This corrects any stale localStorage value before showing any UI.
    API.get("/recruiter/approval-status")
      .then((res) => {
        if (!mounted) return;
        // Backend returns recruiterApprovalStatus; fall back to "pending" if
        // the field is absent — never fall back to "approved".
        const liveStatus = String(res.data?.recruiterApprovalStatus || "").trim() || "pending";
        setApprovalStatus(liveStatus);

        if (liveStatus === "approved") {
          // Check if recruiter has an active package
          getMySubscription()
            .then((subscription) => {
              if (!mounted) return;
              const hasActivePackage = subscription && ["active", "manual_assigned", "free"].includes(subscription.status);
              setHasPackage(hasActivePackage);
              setPackageChecked(true);

              if (hasActivePackage) {
                // Only fetch stats if recruiter has active package
                setStatsLoading(true);
                API.get("/company/recruiter/stats")
                  .then((statsRes) => {
                    if (!mounted) return;
                    setStats(normalizeRecruiterStats(statsRes.data));
                  })
                  .catch((err) => {
                    console.error("Failed to load recruiter stats", err);
                    if (mounted) toast.error("Failed to load dashboard stats");
                  })
                  .finally(() => {
                    if (mounted) setStatsLoading(false);
                  });
              }
            })
            .catch(() => {
              if (mounted) {
                setHasPackage(false);
                setPackageChecked(true);
              }
            });
        }
      })
      .catch(() => {
        if (!mounted) return;
        // Backend unreachable — keep the stored value but do NOT promote it
        // to "approved" if it was already "pending".
        // The stored value from getStoredApprovalStatus() is already safe.
      })
      .finally(() => {
        if (mounted) setApprovalChecked(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isApproved = approvalStatus === "approved";

  // Show a loader until the backend has confirmed the approval status.
  // This prevents stale localStorage from briefly flashing the full dashboard.
  if (!approvalChecked) {
    return (
      <ScreenLoader
        message="Loading recruiter dashboard..."
        subtext="Verifying your recruiter access."
      />
    );
  }

  // Show a loader while package check is in progress
  if (isApproved && !packageChecked) {
    return (
      <ScreenLoader
        message="Loading recruiter dashboard..."
        subtext="Checking your package status."
      />
    );
  }

  // Show a loader while stats are being fetched after approval is confirmed.
  if (isApproved && hasPackage && statsLoading) {
    return (
      <ScreenLoader
        message="Loading recruiter dashboard..."
        subtext="Fetching your jobs, applications, and candidate progress."
      />
    );
  }

  if (!isApproved) {
    const info = approvalMessages[approvalStatus] || approvalMessages.pending;
    const borderColor = info.tone === "rose" ? "border-rose-200" : "border-amber-200";
    const bgColor = info.tone === "rose" ? "bg-rose-50" : "bg-amber-50";
    const textColor = info.tone === "rose" ? "text-rose-800" : "text-amber-800";
    const subtextColor = info.tone === "rose" ? "text-rose-600" : "text-amber-600";

    return (
      <div className="space-y-5 sm:space-y-8">
        <div className="tx-page-header px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Recruiter Dashboard</h1>
        </div>
        <div className={`rounded-2xl border ${borderColor} ${bgColor} p-6 sm:rounded-3xl sm:p-8`}>
          <h2 className={`text-xl font-bold ${textColor} sm:text-2xl`}>{info.title}</h2>
          <p className={`mt-3 max-w-xl text-sm ${subtextColor}`}>{info.message}</p>
          <div className="mt-6">
            <Link
              to="/recruiter/support"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show package requirement alert if approved but no package
  if (isApproved && !hasPackage) {
    return (
      <div className="space-y-5 sm:space-y-8">
        <div className="tx-page-header px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Recruiter Dashboard</h1>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:rounded-3xl sm:p-8">
          <h2 className="text-xl font-bold text-blue-800 sm:text-2xl">Package Required</h2>
          <p className="mt-3 max-w-xl text-sm text-blue-600">
            You should purchase or activate a package to start hiring. Your account is approved, but you need an active package to post jobs, schedule interviews, and manage candidates.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/recruiter/subscription"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              View Packages
            </Link>
            <Link
              to="/recruiter/support"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="tx-page-header px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Recruiter Dashboard</h1>
        <p className="mt-1 max-w-xl text-xs text-slate-500 sm:mt-2 sm:text-sm">
          Track jobs, monitor candidate flow, and review interview outcomes in one workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Jobs Posted" value={stats.jobs} tone="indigo" icon={WorkIcon} />
        <StatCard label="Total Applications" value={stats.applications} tone="sky" icon={DescriptionIcon} />
        <StatCard label="Selected Candidates" value={stats.selected} tone="emerald" icon={VerifiedIcon} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">Quick Actions</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Jump into job posting, candidate review, and interview management.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/recruiter/jobs"
            className="tx-button-primary px-5 py-2.5 text-sm"
          >
            Manage Jobs
          </Link>

          <Link
            to="/recruiter/applications"
            className="tx-button-secondary px-5 py-2.5 text-sm"
          >
            Review Interviews
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
    indigo: "bg-indigo-50 text-indigo-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="tx-card p-4 sm:p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
      <div className={`mt-3 rounded-xl px-3 py-4 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-5 ${toneMap[tone] || toneMap.indigo}`}>
        <p className="inline-flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          {Icon ? <Icon sx={{ fontSize: 24 }} /> : null}
          {toSafeNumber(value, 0)}
        </p>
      </div>
    </div>
  );
}
