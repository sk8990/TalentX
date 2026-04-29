import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getPayments } from "../../api/superAdminApi";
import {
  Pagination,
  formatCurrencyInrPaisa,
  formatDateTime,
  formatPlanLabel,
  statusToneClass
} from "./superAdminUtils";

const initialFilters = {
  status: "",
  planKey: "",
  role: "",
  fromDate: "",
  toDate: "",
  search: "",
  limit: 20
};

export default function PaymentsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchPayments = async (targetPage = page, activeFilters = filters) => {
    try {
      setLoading(true);
      const response = await getPayments({
        ...activeFilters,
        page: targetPage,
        limit: activeFilters.limit || 20
      });

      setRows(Array.isArray(response?.payments) ? response.payments : []);
      setMeta({
        page: Number(response?.page || targetPage),
        limit: Number(response?.limit || activeFilters.limit || 20),
        total: Number(response?.total || 0),
        totalPages: Number(response?.totalPages || 1)
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1, filters);
  }, []);

  const applyFilters = async (event) => {
    event.preventDefault();
    setPage(1);
    await fetchPayments(1, filters);
  };

  const handlePageChange = async (nextPage) => {
    setPage(nextPage);
    await fetchPayments(nextPage, filters);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Payment Transactions</h1>
        <p className="mt-2 text-sm text-slate-500">
          Browse Razorpay transactions across recruiters and university accounts.
        </p>
      </header>

      <section className="tx-card p-4 sm:p-5">
        <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-slate-600">
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="created">Created</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
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
            Role
            <select
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="recruiter">Recruiter</option>
              <option value="university_admin">University Admin</option>
              <option value="student">Student</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Search
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Order ID, Payment ID, user"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-600">
            From Date
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-600">
            To Date
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
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
                setPage(1);
                await fetchPayments(1, initialFilters);
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
          <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
          <p className="text-xs text-slate-500">Total records: {meta.total.toLocaleString("en-IN")}</p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">Loading payments...</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">No payment records found for selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((payment) => (
                  <tr key={payment._id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{payment.razorpayOrderId || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{payment.razorpayPaymentId || "-"}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{payment.user?.name || "-"}</p>
                      <p className="text-xs text-slate-500">{payment.user?.email || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{payment.userRole || payment.role || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{formatPlanLabel(payment.planKey || payment.plan)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrencyInrPaisa(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={statusToneClass(payment.status)}>{payment.status || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(payment.paidAt || payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 pb-3 sm:px-5">
          <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={handlePageChange} />
        </div>
      </section>
    </div>
  );
}
