import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import { useConfirmDialog } from "../../components/useConfirmDialog";
import {
  getPendingStudents,
  getApprovedStudents,
  getRejectedStudents,
  approveStudent,
  rejectStudent,
  disableStudent,
  enableStudent
} from "../../api/collegeAdminApi";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" }
];

export default function StudentVerificationPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState("pending");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const fetchers = { pending: getPendingStudents, approved: getApprovedStudents, rejected: getRejectedStudents };
      const res = await fetchers[tab]();
      setStudents(res.data?.students || []);
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (id) => {
    const shouldApprove = await confirm({
      title: "Approve Student",
      message: "Approve this student? They will get full access.",
      confirmText: "Approve",
      cancelText: "Cancel",
      tone: "primary"
    });
    if (!shouldApprove) return;
    try {
      await approveStudent(id);
      toast.success("Student approved successfully.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve student.");
    }
  };

  const handleReject = async (id) => {
    const shouldReject = await confirm({
      title: "Reject Student",
      message: "Reject this student? They will have limited access.",
      confirmText: "Reject",
      cancelText: "Cancel",
      tone: "danger"
    });
    if (!shouldReject) return;
    try {
      await rejectStudent(id);
      toast.success("Student rejected successfully.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject student.");
    }
  };

  const handleDisable = async (id) => {
    const shouldDisable = await confirm({
      title: "Disable Student Account",
      message: "Disable this student's account? They will not be able to access the platform.",
      confirmText: "Disable",
      cancelText: "Cancel",
      tone: "danger"
    });
    if (!shouldDisable) return;
    try {
      await disableStudent(id);
      toast.success("Student account disabled successfully.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to disable student.");
    }
  };

  const handleEnable = async (id) => {
    const shouldEnable = await confirm({
      title: "Enable Student Account",
      message: "Enable this student's account? They will regain full access.",
      confirmText: "Enable",
      cancelText: "Cancel",
      tone: "primary"
    });
    if (!shouldEnable) return;
    try {
      await enableStudent(id);
      toast.success("Student account enabled successfully.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to enable student.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b95]">
            <HowToRegRoundedIcon sx={{ fontSize: 24 }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Student Verification</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Review and manage college student registrations.
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-[#243b95] text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[#243b95]" />
          </div>
        ) : students.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">
            No {tab} students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Status</th>
                  {tab !== "pending" && <th className="px-5 py-3">Access Level</th>}
                  {tab === "approved" && <th className="px-5 py-3">Account Status</th>}
                  <th className="px-5 py-3">Signup Date</th>
                  {(tab === "pending" || tab === "rejected" || tab === "approved") && (
                    <th className="px-5 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {s.userId?.name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {s.userId?.email || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.collegeVerificationStatus} />
                    </td>
                    {tab !== "pending" && (
                      <td className="px-5 py-3.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.accessLevel === "full"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {s.accessLevel}
                        </span>
                      </td>
                    )}
                    {tab === "approved" && (
                      <td className="px-5 py-3.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.isDisabled
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {s.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-slate-500">
                      {s.userId?.createdAt ? new Date(s.userId.createdAt).toLocaleDateString() : "—"}
                    </td>
                    {(tab === "pending" || tab === "rejected" || tab === "approved") && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          {tab === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(s._id)}
                                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(s._id)}
                                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {tab === "rejected" && (
                            <button
                              onClick={() => handleApprove(s._id)}
                              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          )}
                          {tab === "approved" && (
                            <button
                              onClick={() => s.isDisabled ? handleEnable(s._id) : handleDisable(s._id)}
                              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition ${
                                s.isDisabled
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-rose-600 hover:bg-rose-700"
                              }`}
                            >
                              {s.isDisabled ? "Enable" : "Disable"}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {confirmDialog}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700"
  };

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
