import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getSubscriptions } from "../../api/superAdminApi";
import {
  Pagination,
  formatDateTime,
  formatPlanLabel,
  statusToneClass
} from "./superAdminUtils";

const initialFilters = {
  status: "",
  role: "",
  planKey: "",
  search: "",
  limit: 20
};

export default function SubscriptionsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchRows = async (page = 1, activeFilters = filters) => {
    try {
      setLoading(true);
      const response = await getSubscriptions({
        ...activeFilters,
        page,
        limit: activeFilters.limit || 20
      });

      setRows(Array.isArray(response?.subscriptions) ? response.subscriptions : []);
      setMeta({
        page: Number(response?.page || page),
        limit: Number(response?.limit || activeFilters.limit || 20),
        total: Number(response?.total || 0),
        totalPages: Number(response?.totalPages || 1)
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1, filters);
  }, []);

  const handleApply = async (event) => {
    event.preventDefault();
    await fetchRows(1, filters);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Subscriptions</h1>
        <p className="mt-2 text-sm text-slate-500">
          Track active, expired, cancelled, and disabled subscriptions across platform accounts.
        </p>
      </header>

      <section className="tx-card p-4 sm:p-5">
        <form onSubmit={handleApply} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-600">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="free">Free</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Role
            <select
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="recruiter">Recruiter</option>
              <option value="college_admin">College Admin</option>
              <option value="student">Student</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Plan
            <select
              value={filters.planKey}
              onChange={(event) => setFilters((prev) => ({ ...prev, planKey: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="student_free">Student Free</option>
              <option value="recruiter_starter">Recruiter Starter</option>
              <option value="recruiter_pro">Recruiter Pro</option>
              <option value="university_enterprise">University Enterprise</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Search
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Owner name or email"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
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
              Apply Filters
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
          <h2 className="text-lg font-bold text-slate-900">Subscription List</h2>
          <p className="text-xs text-slate-500">Total records: {meta.total.toLocaleString("en-IN")}</p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">Loading subscriptions...</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No subscriptions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Starts At</th>
                  <th className="px-4 py-3">Expires At</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((subscription) => (
                  <tr key={subscription._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{subscription.owner?.name || "-"}</p>
                      <p className="text-xs text-slate-500">{subscription.owner?.email || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{subscription.ownerRole || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatPlanLabel(subscription.planKey || subscription.plan)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(subscription.startsAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(subscription.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span className={statusToneClass(subscription.status)}>{subscription.status || "-"}</span>
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
  );
}
