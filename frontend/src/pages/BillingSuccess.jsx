import { useEffect } from "react";
import { Link } from "react-router-dom";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import TalentXBrand from "../components/TalentXBrand";
import { useSubscription } from "../context/SubscriptionContext";

export default function BillingSuccess() {
  const { refreshSubscription } = useSubscription();

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f6fb] px-4 py-10 sm:px-6">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:rounded-[2rem] sm:p-10">
        <div className="mx-auto inline-flex rounded-2xl bg-[#eef3ff] px-4 py-3 text-[#243b95]">
          <TalentXBrand theme="light" size="sm" />
        </div>

        <span className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircleRoundedIcon sx={{ fontSize: 36 }} />
        </span>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">
          Payment successful
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Your TalentX recruiter plan is now active.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base sm:leading-8">
          You can continue to your recruiter workspace and manage jobs, applicants, interviews,
          offers, and onboarding from one place.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/recruiter/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#243b95] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#1d2f80] hover:shadow-lg hover:shadow-[#243b95]/20"
          >
            <DashboardRoundedIcon sx={{ fontSize: 18 }} />
            Go to Recruiter Dashboard
          </Link>
          <Link
            to="/#pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 18 }} />
            Back to Pricing
          </Link>
        </div>
      </section>
    </main>
  );
}
