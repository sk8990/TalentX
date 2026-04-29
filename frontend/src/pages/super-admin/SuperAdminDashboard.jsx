import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ScreenLoader from "../../components/ScreenLoader";
import { getSuperAdminDashboard } from "../../api/superAdminApi";
import {
  formatCurrencyInrPaisa,
  formatDateTime,
  formatPlanLabel,
  statusToneClass
} from "./superAdminUtils";

function StatCard({ label, value, tone = "slate" }) {
  const toneClass =
    tone === "indigo"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-white text-slate-800";

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-xl font-black sm:text-2xl">{value}</p>
    </article>
  );
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await getSuperAdminDashboard();
        if (mounted) {
          setData(response || {});
          setError("");
        }
      } catch (err) {
        if (mounted) {
          const message = err.response?.data?.message || "Failed to load dashboard";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        label: "Total Revenue",
        value: formatCurrencyInrPaisa(data.totalRevenue),
        tone: "indigo"
      },
      {
        label: "Monthly Revenue",
        value: formatCurrencyInrPaisa(data.monthlyRevenue),
        tone: "indigo"
      },
      {
        label: "Active Subscriptions",
        value: Number(data.activeSubscriptions || 0).toLocaleString("en-IN"),
        tone: "emerald"
      },
      {
        label: "Total Recruiters",
        value: Number(data.totalRecruiters || 0).toLocaleString("en-IN"),
        tone: "slate"
      },
      {
        label: "Total Universities",
        value: Number(data.totalUniversities || 0).toLocaleString("en-IN"),
        tone: "slate"
      },
      {
        label: "Successful Payments",
        value: Number(data.successfulPayments || 0).toLocaleString("en-IN"),
        tone: "emerald"
      },
      {
        label: "Failed Payments",
        value: Number(data.failedPayments || 0).toLocaleString("en-IN"),
        tone: "rose"
      },
      {
        label: "Disabled Accounts",
        value: Number(data.disabledAccounts || 0).toLocaleString("en-IN"),
        tone: "rose"
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <ScreenLoader
        message="Loading Super Admin dashboard..."
        subtext="Collecting revenue, payments, and subscription metrics."
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Super Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">
          Monitor platform revenue, package usage, and account health from a single control center.
        </p>
      </header>

      {error ? (
        <section className="tx-card p-5 text-sm text-rose-600">{error}</section>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="tx-card overflow-hidden xl:col-span-2">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
          </div>

          {Array.isArray(data?.recentPayments) && data.recentPayments.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid At</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((payment) => (
                    <tr key={payment._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{payment.razorpayOrderId || "-"}</td>
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
          ) : (
            <div className="p-5 text-sm text-slate-500">No transactions found.</div>
          )}
        </article>

        <article className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Recent Subscriptions</h2>
          </div>

          {Array.isArray(data?.recentSubscriptions) && data.recentSubscriptions.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recentSubscriptions.map((subscription) => (
                <li key={subscription._id} className="px-4 py-3 sm:px-5">
                  <p className="font-semibold text-slate-800">{subscription.owner?.name || "-"}</p>
                  <p className="text-xs text-slate-500">{subscription.owner?.email || "-"}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {formatPlanLabel(subscription.planKey || subscription.plan)}
                    </span>
                    <span className={statusToneClass(subscription.status)}>{subscription.status || "-"}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5 text-sm text-slate-500">No subscriptions found.</div>
          )}
        </article>
      </section>

      <section className="tx-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Revenue Chart</h2>
        <p className="mt-1 text-sm text-slate-500">Chart placeholder for monthly revenue trend.</p>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Revenue visualization widget can be connected here.
        </div>
      </section>
    </div>
  );
}
