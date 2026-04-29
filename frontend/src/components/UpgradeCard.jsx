import { Link } from "react-router-dom";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import { useSubscription } from "../context/SubscriptionContext";

const FEATURE_LABELS = {
  jobPosting: "Job posting",
  basicApplicantTracking: "Applicant tracking",
  aiJdGeneration: "AI JD generation",
  aiCandidateMatching: "AI candidate matching",
  assessmentPanel: "Assessment panel",
  interviewScheduling: "Interview scheduling",
  humanInterviewPanel: "Human interview panel",
  offerGeneration: "Offer generation",
  onboardingManagement: "Onboarding management",
  adminDashboard: "Admin dashboard",
  bulkStudentManagement: "Bulk student management",
  reportsAnalytics: "Reports and analytics",
  customOnboardingWorkflows: "Custom onboarding workflows"
};

const REQUIRED_PLAN_LABELS = {
  jobPosting: "Recruiter Starter",
  basicApplicantTracking: "Recruiter Starter",
  aiJdGeneration: "Recruiter Pro",
  aiCandidateMatching: "Recruiter Pro",
  assessmentPanel: "Recruiter Pro",
  interviewScheduling: "Recruiter Starter",
  humanInterviewPanel: "Recruiter Pro",
  offerGeneration: "Recruiter Starter",
  onboardingManagement: "Recruiter Pro",
  adminDashboard: "University / Enterprise",
  bulkStudentManagement: "University / Enterprise",
  reportsAnalytics: "University / Enterprise",
  customOnboardingWorkflows: "University / Enterprise"
};

function formatPlan(plan) {
  if (!plan) return "No active plan";
  return String(plan)
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function UpgradeCard({
  feature,
  featureName,
  requiredPlan,
  currentPlan,
  compact = false,
  className = ""
}) {
  const { subscription } = useSubscription();
  const label = featureName || FEATURE_LABELS[feature] || "This feature";
  const planLabel = requiredPlan || REQUIRED_PLAN_LABELS[feature] || "a higher plan";
  const current = currentPlan || subscription?.plan || null;

  return (
    <div
      className={`rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm ring-1 ring-indigo-50 ${
        compact ? "max-w-xl" : "sm:p-6"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#243b95]">
          <LockRoundedIcon sx={{ fontSize: 20 }} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">{label} is locked</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Current plan: <span className="font-semibold text-slate-700">{formatPlan(current)}</span>. Required:{" "}
            <span className="font-semibold text-[#243b95]">{planLabel}</span>.
          </p>
        </div>
      </div>

      <div className={`mt-4 flex flex-wrap gap-2 ${compact ? "" : "sm:mt-5"}`}>
        <Link
          to="/#pricing"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#243b95] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1d2f80]"
        >
          Upgrade Plan
          <ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} />
        </Link>
      </div>
    </div>
  );
}
