import { useEffect, useState } from "react";
import API, { getServerOrigin } from "../api/axios";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import toast from "react-hot-toast";

const statusStyle = {
  APPLIED: "bg-slate-100 text-slate-700",
  SHORTLISTED: "bg-blue-100 text-blue-700",
  ASSESSMENT_SENT: "bg-indigo-100 text-indigo-700",
  ASSESSMENT_PASSED: "bg-emerald-100 text-emerald-700",
  ASSESSMENT_FAILED: "bg-rose-100 text-rose-700",
  INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-700",
  SELECTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function Timeline({ currentStatus }) {
  const steps = ["APPLIED", "SHORTLISTED", "ASSESSMENT_SENT", "ASSESSMENT_PASSED", "INTERVIEW_SCHEDULED", "SELECTED"];
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex min-w-[700px] items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCurrent = currentIndex === index;
          const isDone = currentIndex > index;

          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center w-full">
                <div
                  className={`h-4 w-4 rounded-full ${
                    isCurrent ? "bg-indigo-600" : isDone ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="mt-2 text-[10px] font-medium text-slate-500">{step.replaceAll("_", " ")}</span>
              </div>
              {index !== steps.length - 1 && (
                <div className={`h-0.5 flex-1 ${isDone ? "bg-emerald-500" : "bg-slate-300"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
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
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading applications...</div>;
  }

  if (apps.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No applications yet.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="mt-2 text-sm text-indigo-100">Track status changes and respond to offers from recruiters.</p>
      </section>

      {apps.map((app) => (
        <article key={app._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900">{app.jobId?.title || "Job"}</h2>
              <p className="mt-1 text-xs text-slate-500">Application ID {app._id.slice(-6)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[app.status] || "bg-slate-100 text-slate-700"}`}>
              {app.status.replaceAll("_", " ")}
            </span>
          </div>

          <Timeline currentStatus={app.status} />

          {app.status === "INTERVIEW_SCHEDULED" && (
            <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
              Interview scheduled. Check the Interviews section.
            </div>
          )}

          {app.status === "SELECTED" && app.offer && (
            <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <h3 className="text-base font-semibold text-indigo-800">Offer Details</h3>
              <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-slate-500">Salary</p>
                  <p className="font-semibold text-slate-900">{app.offer.salary}</p>
                </div>
                <div>
                  <p className="text-slate-500">Joining Date</p>
                  <p className="font-semibold text-slate-900">{new Date(app.offer.joiningDate).toDateString()}</p>
                </div>
              </div>

              {app.offer.pdfPath && (
                <a
                  href={`${serverOrigin}${app.offer.pdfPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <span className="inline-flex items-center gap-1">
                    <DownloadIcon sx={{ fontSize: 16 }} />
                    Download Offer Letter
                  </span>
                </a>
              )}

              {app.offer.status === "PENDING" && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => respondToOffer(app._id, "ACCEPTED")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CheckCircleIcon sx={{ fontSize: 16 }} />
                      Accept
                    </span>
                  </button>
                  <button
                    onClick={() => respondToOffer(app._id, "DECLINED")}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      <CancelIcon sx={{ fontSize: 16 }} />
                      Decline
                    </span>
                  </button>
                </div>
              )}

              {app.offer.status === "ACCEPTED" && (
                <div className="mt-4 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Offer accepted. Congratulations.</div>
              )}

              {app.offer.status === "DECLINED" && (
                <div className="mt-4 rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">Offer declined.</div>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
