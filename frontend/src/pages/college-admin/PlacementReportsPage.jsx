import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ThumbDownRoundedIcon from "@mui/icons-material/ThumbDownRounded";
import { getPlacementReports } from "../../api/collegeAdminApi";

export default function PlacementReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlacementReports()
      .then((res) => setData(res.data))
      .catch(() => toast.error("Failed to load placement reports."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#243b95]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
        Unable to load placement reports.
      </div>
    );
  }

  const cards = [
    { label: "Total Students", value: data.totalStudents, icon: SchoolRoundedIcon, tone: "bg-blue-50 text-blue-700" },
    { label: "Pending Verifications", value: data.pendingStudents, icon: PendingActionsRoundedIcon, tone: "bg-amber-50 text-amber-700" },
    { label: "Approved Students", value: data.approvedStudents, icon: CheckCircleRoundedIcon, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Rejected Students", value: data.rejectedStudents, icon: CancelRoundedIcon, tone: "bg-rose-50 text-rose-700" },
    { label: "Total Applications", value: data.totalApplications, icon: DescriptionRoundedIcon, tone: "bg-indigo-50 text-indigo-700" },
    { label: "Interviews Scheduled", value: data.interviewScheduled, icon: EventRoundedIcon, tone: "bg-sky-50 text-sky-700" },
    { label: "Selected / Offered", value: data.selectedStudents, icon: EmojiEventsRoundedIcon, tone: "bg-teal-50 text-teal-700" },
    { label: "Rejected Applications", value: data.rejectedApplications, icon: ThumbDownRoundedIcon, tone: "bg-orange-50 text-orange-700" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b95]">
            <BarChartRoundedIcon sx={{ fontSize: 24 }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Placement Reports</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Overview of student placements and application statistics for your college.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
              <card.icon sx={{ fontSize: 20 }} />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">{card.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{card.label}</p>
          </div>
        ))}
      </section>

      {/* Info note */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
        <p>
          Application stats (Total Applications, Interviews, Selected, Rejected) are counted only for
          <strong className="text-slate-700"> approved college students</strong>. Open students and pending
          students are excluded from these counts.
        </p>
      </section>
    </div>
  );
}
