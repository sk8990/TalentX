import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../../components/useConfirmDialog";
import {
  disableRecruiter,
  enableRecruiter,
  getRecruiters
} from "../../api/superAdminApi";
import { Pagination, formatPlanLabel, statusToneClass } from "./superAdminUtils";

const initialFilters = {
  search: "",
  status: "",
  limit: 20
};

export default function RecruitersPage() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchRows = async (page = 1, activeFilters = filters) => {
    try {
      setLoading(true);
      const response = await getRecruiters({
        ...activeFilters,
        page,
        limit: activeFilters.limit || 20
      });

      const items = response?.items || response?.recruiters || [];
      setRows(Array.isArray(items) ? items : []);
      setMeta({
        page: Number(response?.page || page),
        limit: Number(response?.limit || activeFilters.limit || 20),
        total: Number(response?.total || 0),
        totalPages: Number(response?.totalPages || 1)
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load recruiters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, filters);
  }, []);

  const applyFilters = async (event) => {
    event.preventDefault();
    await fetchRows(1, filters);
  };

  const handleToggle = async (account) => {
    if (account.isActive) {
      const shouldDisable = await confirm({
        title: "Disable Recruiter",
        message: "This recruiter will lose login access immediately.",
        confirmText: "Disable",
        cancelText: "Cancel",
        tone: "danger"
      });

      if (!shouldDisable) {
        return;
      }

      const reason = window.prompt("Disable reason (optional):", "Policy review");
      try {
        await disableRecruiter(account._id, reason || "Disabled by Super Admin");
        toast.success("Recruiter disabled");
        await fetchRows(meta.page, filters);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to disable recruiter");
      }

      return;
    }

    const shouldEnable = await confirm({
      title: "Enable Recruiter",
      message: "This recruiter will regain platform access.",
      confirmText: "Enable",
      cancelText: "Cancel",
      tone: "primary"
    });

    if (!shouldEnable) {
      return;
    }

    try {
      await enableRecruiter(account._id);
      toast.success("Recruiter enabled");
      await fetchRows(meta.page, filters);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to enable recruiter");
    }
  };

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <header className="tx-page-header p-5 sm:p-6 md:p-8">
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Recruiter Accounts</h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor recruiter plans, activity status, job counts, and payment health.
          </p>
        </header>

        <section className="tx-card p-4 sm:p-5">
          <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-slate-600">
              Search
              <input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Recruiter name or email"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-600">
              Status
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>

            <label className="text-sm text-slate-600">
              Per Page
              <select
                value={filters.limit}
                onChange={(event) => setFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {[10, 20, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <button type="submit" className="tx-button-primary px-4 py-2 text-sm">
                Apply
              </button>
              <button
                type="button"
                onClick={async () => {
                  setFilters(initialFilters);
                  await fetchRows(1, initialFilters);
                }}
                className="tx-button-secondary px-4 py-2 text-sm"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        <section className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Recruiters</h2>
            <p className="text-xs text-slate-500">Total records: {meta.total.toLocaleString("en-IN")}</p>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-slate-500">Loading recruiters...</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No recruiters found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Recruiter</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Jobs Count</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((account) => (
                    <tr key={account._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{account.name || "-"}</p>
                        <p className="text-xs text-slate-500">{account.email || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatPlanLabel(account.plan)}</td>
                      <td className="px-4 py-3">
                        <span className={statusToneClass(account.isActive ? "active" : "disabled")}>
                          {account.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{Number(account.jobsCount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <span className={statusToneClass(account.paymentStatus || "none")}>{account.paymentStatus || "none"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggle(account)}
                          className={`px-3 py-2 text-xs font-semibold ${
                            account.isActive
                              ? "rounded-xl border border-rose-200 bg-rose-50 text-rose-700"
                              : "rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {account.isActive ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 pb-3 sm:px-5">
            <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={(nextPage) => fetchRows(nextPage, filters)} />
          </div>
        </section>
      </div>

      {confirmDialog}
    </>
  );
}
