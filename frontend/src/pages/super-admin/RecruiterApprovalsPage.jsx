import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../../components/useConfirmDialog";
import {
  getRecruitersByStatus,
  approveRecruiter,
  rejectRecruiter,
  suspendRecruiter
} from "../../api/superAdminApi";
import { Pagination, statusToneClass, formatDateTime } from "./superAdminUtils";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" }
];

export default function RecruiterApprovalsPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchRows = async (page = 1, tab = activeTab) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const response = await getRecruitersByStatus(tab, params);
      const items = response?.items || [];
      setRows(Array.isArray(items) ? items : []);
      setMeta({
        page: Number(response?.page || page),
        limit: Number(response?.limit || 20),
        total: Number(response?.total || 0),
        totalPages: Number(response?.totalPages || 1)
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load recruiters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRows(1, activeTab); }, [activeTab]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearch("");
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await fetchRows(1, activeTab);
  };

  const handleApprove = async (recruiter) => {
    const shouldApprove = await confirm({
      title: "Approve Recruiter",
      message: `Approve "${recruiter.name || recruiter.email}"? They will gain access to recruiter features.`,
      confirmText: "Approve",
      cancelText: "Cancel",
      tone: "primary"
    });
    if (!shouldApprove) return;
    try {
      const result = await approveRecruiter(recruiter._id);
      if (result?.emailSent === false) {
        toast.success("Recruiter approved, but email could not be sent.");
      } else {
        toast.success("Recruiter approved and email sent");
      }
      await fetchRows(meta.page, activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve recruiter");
    }
  };

  const handleReject = async (recruiter) => {
    const shouldReject = await confirm({
      title: "Reject Recruiter",
      message: `Reject "${recruiter.name || recruiter.email}"? They will not be able to access recruiter features.`,
      confirmText: "Reject",
      cancelText: "Cancel",
      tone: "danger"
    });
    if (!shouldReject) return;
    try {
      await rejectRecruiter(recruiter._id);
      toast.success("Recruiter rejected");
      await fetchRows(meta.page, activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject recruiter");
    }
  };

  const handleSuspend = async (recruiter) => {
    const shouldSuspend = await confirm({
      title: "Suspend Recruiter",
      message: `Suspend "${recruiter.name || recruiter.email}"? Their access will be revoked.`,
      confirmText: "Suspend",
      cancelText: "Cancel",
      tone: "danger"
    });
    if (!shouldSuspend) return;
    try {
      await suspendRecruiter(recruiter._id);
      toast.success("Recruiter suspended");
      await fetchRows(meta.page, activeTab);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to suspend recruiter");
    }
  };

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <header className="tx-page-header p-5 sm:p-6 md:p-8">
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Recruiter Approvals</h1>
          <p className="mt-2 text-sm text-slate-500">Approve, reject, or suspend recruiter accounts.</p>
        </header>

        <div className="flex flex-wrap gap-2 px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[#243b95] text-white shadow-lg shadow-[#243b95]/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 capitalize">{activeTab} Recruiters</h2>
                <p className="text-xs text-slate-500">Total: {meta.total.toLocaleString("en-IN")}</p>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm" />
                <button type="submit" className="tx-button-primary px-3 py-1.5 text-xs">Search</button>
              </form>
            </div>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-slate-500">Loading recruiters...</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No {activeTab} recruiters found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Recruiter</th>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Company Email</th>
                    <th className="px-4 py-3">Company Website</th>
                    <th className="px-4 py-3">Signup Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{r.name || "-"}</p>
                        <p className="text-xs text-slate-500">{r.email || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.companyName || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.companyEmail || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.companyWebsite || "-"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={statusToneClass(r.recruiterApprovalStatus || "pending")}>
                          {r.recruiterApprovalStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {activeTab !== "approved" && (
                            <button type="button" onClick={() => handleApprove(r)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              Approve
                            </button>
                          )}
                          {activeTab !== "rejected" && (
                            <button type="button" onClick={() => handleReject(r)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                              Reject
                            </button>
                          )}
                          {activeTab !== "suspended" && (
                            <button type="button" onClick={() => handleSuspend(r)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-3 sm:px-5">
            <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(p) => fetchRows(p, activeTab)} />
          </div>
        </section>
      </div>
      {confirmDialog}
    </>
  );
}
