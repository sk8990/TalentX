import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ScreenLoader from "../../components/ScreenLoader";
import { getRevenue } from "../../api/superAdminApi";
import { formatCurrencyInrPaisa, formatPlanLabel } from "./superAdminUtils";

function MetricCard({ label, value }) {
  return (
    <article className="tx-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </article>
  );
}

export default function RevenuePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchRevenue = async () => {
      try {
        setLoading(true);
        const response = await getRevenue();
        if (mounted) {
          setData(response || {});
        }
      } catch (err) {
        if (mounted) {
          toast.error(err.response?.data?.message || "Failed to load revenue");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRevenue();

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
        label: "Total Payment Received",
        value: formatCurrencyInrPaisa(data.totalRevenue)
      },
      {
        label: "Revenue This Month",
        value: formatCurrencyInrPaisa(data.revenueThisMonth)
      },
      {
        label: "Paid Transactions",
        value: Number(data.paidCount || 0).toLocaleString("en-IN")
      },
      {
        label: "Failed Transactions",
        value: Number(data.failedCount || 0).toLocaleString("en-IN")
      }
    ];
  }, [data]);

  if (loading) {
    return (
      <ScreenLoader
        message="Loading revenue insights..."
        subtext="Analyzing plan-wise and monthly payment trends."
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Revenue Analytics</h1>
        <p className="mt-2 text-sm text-slate-500">
          Track total collections, monthly trends, and plan-wise performance.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Revenue by Plan</h2>
          </div>
          {Array.isArray(data?.revenueByPlan) && data.revenueByPlan.length ? (
            <ul className="divide-y divide-slate-100">
              {data.revenueByPlan.map((entry) => (
                <li key={entry._id || "unknown-plan"} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div>
                    <p className="font-semibold text-slate-800">{formatPlanLabel(entry._id)}</p>
                    <p className="text-xs text-slate-500">{entry.count || 0} payments</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatCurrencyInrPaisa(entry.amount)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5 text-sm text-slate-500">No paid transactions yet.</div>
          )}
        </article>

        <article className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Revenue by Role</h2>
          </div>
          {Array.isArray(data?.revenueByRole) && data.revenueByRole.length ? (
            <ul className="divide-y divide-slate-100">
              {data.revenueByRole.map((entry) => (
                <li key={entry._id || "unknown-role"} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div>
                    <p className="font-semibold text-slate-800">{entry._id || "Unknown"}</p>
                    <p className="text-xs text-slate-500">{entry.count || 0} payments</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatCurrencyInrPaisa(entry.amount)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5 text-sm text-slate-500">No role-wise revenue data yet.</div>
          )}
        </article>

        <article className="tx-card overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-lg font-bold text-slate-900">Revenue by Month</h2>
          </div>
          {Array.isArray(data?.revenueByMonth) && data.revenueByMonth.length ? (
            <ul className="divide-y divide-slate-100">
              {data.revenueByMonth.map((entry) => (
                <li key={entry._id || "unknown-month"} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div>
                    <p className="font-semibold text-slate-800">{entry._id || "N/A"}</p>
                    <p className="text-xs text-slate-500">{entry.count || 0} payments</p>
                  </div>
                  <p className="font-bold text-slate-900">{formatCurrencyInrPaisa(entry.amount)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5 text-sm text-slate-500">No monthly revenue data yet.</div>
          )}
        </article>
      </section>

      <section className="tx-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Chart Placeholder</h2>
        <p className="mt-1 text-sm text-slate-500">
          Connect this section to a charting library for trend visualization.
        </p>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Revenue chart area
        </div>
      </section>
    </div>
  );
}
