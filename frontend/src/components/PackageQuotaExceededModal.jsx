import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readStoredSession } from "../utils/authRouting";

export default function PackageQuotaExceededModal() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      setPayload(event.detail || {});
    };

    window.addEventListener("talentx-quota-exhausted", handler);
    return () => window.removeEventListener("talentx-quota-exhausted", handler);
  }, []);

  if (!payload) return null;

  const { user } = readStoredSession();
  const supportPath = user?.role === "recruiter" ? "/recruiter/support" : "/#contact";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <h2 className="text-xl font-black text-slate-950">Your package quota has been exhausted.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You have reached the limit included in your current package. Please upgrade your plan or contact support.
        </p>
        {payload.limit !== undefined && payload.usedCount !== undefined ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            Usage: {payload.usedCount} / {payload.limit === -1 ? "Unlimited" : payload.limit}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setPayload(null);
              navigate("/#pricing");
            }}
            className="rounded-xl bg-[#243b95] px-4 py-2 text-sm font-bold text-white"
          >
            View Plans
          </button>
          <button
            type="button"
            onClick={() => {
              setPayload(null);
              navigate(supportPath);
            }}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-[#243b95]"
          >
            Contact Support
          </button>
          <button
            type="button"
            onClick={() => setPayload(null)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
