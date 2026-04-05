import { useEffect, useState } from "react";
import API, { getServerOrigin } from "../api/axios";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import toast from "react-hot-toast";

const statusStyle = {
  APPLIED: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  SHORTLISTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ASSESSMENT_SENT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  ASSESSMENT_PASSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  ASSESSMENT_FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  SELECTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const stepLabels = ["APPLIED", "SHORTLISTED", "ASSESSMENT_SENT", "ASSESSMENT_PASSED", "INTERVIEW_SCHEDULED", "SELECTED"];
const stepLabelsShort = ["Applied", "Shortlisted", "Assessment", "Passed", "Interview", "Selected"];

function Timeline({ currentStatus }) {
  const currentIndex = stepLabels.indexOf(currentStatus);

  return (
    <>
      {/* Desktop horizontal timeline */}
      <div className="mt-4 hidden sm:block">
        <div className="flex items-center justify-between gap-1">
          {stepLabels.map((step, index) => {
            const isCurrent = currentIndex === index;
            const isDone = currentIndex > index;

            return (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex w-full flex-col items-center">
                  <div
                    className={`h-4 w-4 rounded-full ${
                      isCurrent ? "bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-900/50" :
                      isDone ? "bg-emerald-500" :
                      "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <span className="mt-2 text-center text-[9px] font-medium text-slate-500 dark:text-slate-400 lg:text-[10px]">
                    {step.replaceAll("_", " ")}
                  </span>
                </div>
                {index !== stepLabels.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isDone ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical progress */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:hidden">
        {stepLabelsShort.map((label, index) => {
          const isCurrent = currentIndex === index;
          const isDone = currentIndex > index;

          return (
            <span
              key={label}
              className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold ${
                isCurrent
                  ? "bg-indigo-600 text-white"
                  : isDone
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>
    </>
  );
}

export default function MyApplications() {
  const serverOrigin = getServerOrigin();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      const res = await API.get("/application/my");
      setApps(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const respondToOffer = async (id, decision) => {
    try {
      await API.put(`/application/${id}/offer/respond`, { decision });
      fetchApps();
    } catch {
      toast.error("Failed to respond to offer");
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:rounded-3xl">Loading applications...</div>;
  }

  if (apps.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:rounded-3xl">No applications yet.</div>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">My Applications</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">Track status changes and respond to offers from recruiters.</p>
      </section>

      {apps.map((app) => (
        <article key={app._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{app.jobId?.title || "Job"}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Application ID {app._id.slice(-6)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold sm:px-3 sm:text-xs ${statusStyle[app.status] || "bg-slate-100 text-slate-700"}`}>
              {app.status.replaceAll("_", " ")}
            </span>
          </div>

          <Timeline currentStatus={app.status} />

          {app.status === "INTERVIEW_SCHEDULED" && (
            <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 sm:mt-4 sm:px-4 sm:text-sm">
              Interview scheduled. Check the Interviews section.
            </div>
          )}

          {app.status === "SELECTED" && app.offer && (
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20 sm:mt-5 sm:rounded-2xl sm:p-5">
              <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 sm:text-base">Offer Details</h3>
              <div className="mt-2 grid gap-3 text-sm sm:mt-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Salary</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{app.offer.salary}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Joining Date</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{new Date(app.offer.joiningDate).toDateString()}</p>
                </div>
              </div>

              {app.offer.pdfPath && (
                <a
                  href={`${serverOrigin}${app.offer.pdfPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 sm:mt-4 sm:text-sm"
                >
                  <span className="inline-flex items-center gap-1">
                    <DownloadIcon sx={{ fontSize: 16 }} />
                    Download Offer Letter
                  </span>
                </a>
              )}

              {app.offer.status === "PENDING" && (
                <div className="mt-3 flex gap-2 sm:mt-4 sm:gap-3">
                  <button
                    onClick={() => respondToOffer(app._id, "ACCEPTED")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                      Accept
                    </span>
                  </button>
                  <button
                    onClick={() => respondToOffer(app._id, "DECLINED")}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CancelIcon sx={{ fontSize: 16 }} />
                      Decline
                    </span>
                  </button>
                </div>
              )}

              {app.offer.status === "ACCEPTED" && (
                <div className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 sm:mt-4 sm:px-4 sm:text-sm">Offer accepted. Congratulations.</div>
              )}

              {app.offer.status === "DECLINED" && (
                <div className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 sm:mt-4 sm:px-4 sm:text-sm">Offer declined.</div>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
