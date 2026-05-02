import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { getCollegeProfile } from "../../api/collegeAdminApi";

export default function CollegeAdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCollegeProfile()
      .then((res) => setProfile(res.data))
      .catch(() => toast.error("Failed to load college profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#243b95]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        College Admin is not linked to any college.
      </div>
    );
  }

  const { college, counts } = profile;
  const planActive = college.enterprisePlanActive && college.status === "active";

  const statCards = [
    { label: "Total Students", value: counts.totalStudents, icon: SchoolRoundedIcon, tone: "bg-blue-50 text-blue-700" },
    { label: "Pending", value: counts.pendingStudents, icon: PendingActionsRoundedIcon, tone: "bg-amber-50 text-amber-700" },
    { label: "Approved", value: counts.approvedStudents, icon: CheckCircleRoundedIcon, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Rejected", value: counts.rejectedStudents, icon: CancelRoundedIcon, tone: "bg-rose-50 text-rose-700" }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b95]">
            <DashboardRoundedIcon sx={{ fontSize: 24 }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">College Dashboard</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Manage students, view jobs, and track placements for your college.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Plan Warning */}
      {!planActive && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <WarningAmberRoundedIcon className="mt-0.5 text-amber-600" sx={{ fontSize: 20 }} />
          <p className="text-sm text-amber-800">
            Your college Enterprise plan is not active. Student full access may be limited.
          </p>
        </section>
      )}

      {/* College Profile Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">College Profile</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="College Name" value={college.name} />
          <InfoItem label="Domain" value={college.domain} />
          <InfoItem label="Status" value={college.status} badge />
          <InfoItem
            label="Enterprise Plan"
            value={college.enterprisePlanActive ? "Active" : "Inactive"}
            badge
            badgeColor={college.enterprisePlanActive ? "emerald" : "slate"}
          />
          {college.enterprisePlanStartDate && (
            <InfoItem label="Plan Start" value={new Date(college.enterprisePlanStartDate).toLocaleDateString()} />
          )}
          {college.enterprisePlanEndDate && (
            <InfoItem label="Plan End" value={new Date(college.enterprisePlanEndDate).toLocaleDateString()} />
          )}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
              <card.icon sx={{ fontSize: 18 }} />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-950">{card.value}</p>
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function InfoItem({ label, value, badge, badgeColor = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-600"
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {badge ? (
        <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colors[badgeColor] || colors.blue}`}>
          {value}
        </span>
      ) : (
        <p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p>
      )}
    </div>
  );
}
