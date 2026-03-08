import { useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";

export default function RecruiterApplications() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId),
    [jobs, selectedJobId]
  );

  const fetchJobs = async () => {
    try {
      const res = await API.get("/company/recruiter/jobs");
      setJobs(res.data || []);
    } catch {
      toast.error("Failed to load jobs");
    }
  };

  const fetchApplications = async (jobId) => {
    if (!jobId) {
      setApplications([]);
      return;
    }

    try {
      setBusy(true);
      const res = await API.get(`/application/job/${jobId}`);
      setApplications(res.data || []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action, successMessage) => {
    try {
      setBusy(true);
      await action();
      toast.success(successMessage);
      fetchApplications(selectedJobId);
    } catch {
      toast.error("Action failed");
      setBusy(false);
    }
  };

  const shortlist = (id) => runAction(() => API.put(`/application/${id}/shortlist`), "Shortlisted");

  const reject = (id) => runAction(() => API.put(`/application/${id}/reject`), "Rejected");

  const sendAssessment = (id) => {
    const link = prompt("Enter assessment link:");
    if (!link) return;
    runAction(() => API.put(`/application/${id}/assessment`, { link }), "Assessment sent");
  };

  const markAssessmentResult = (id, passed) => {
    const score = prompt("Enter score:");
    if (!score) return;

    runAction(
      () =>
        API.put(`/application/${id}/assessment/result`, {
          result: passed ? "PASS" : "FAIL",
          score,
        }),
      "Assessment updated"
    );
  };

  const scheduleInterview = (id) => {
    const date = prompt("Enter interview date (YYYY-MM-DD HH:MM)");
    const mode = prompt("Mode (Online/Offline)");
    const link = prompt("Meeting link (if online)");

    if (!date || !mode) return;

    runAction(
      () =>
        API.put(`/application/${id}/interview`, {
          date,
          mode,
          link,
        }),
      "Interview scheduled"
    );
  };

  const selectCandidate = (id) => runAction(() => API.put(`/application/${id}/select`), "Candidate selected");

  const generateOffer = (id) => {
    const salary = prompt("Enter salary (e.g. 6 LPA):");
    const joiningDate = prompt("Enter joining date (YYYY-MM-DD):");
    const location = prompt("Enter location:");

    if (!salary || !joiningDate || !location) {
      toast.error("All fields required");
      return;
    }

    runAction(
      () =>
        API.put(`/application/${id}/offer`, {
          salary,
          joiningDate,
          location,
        }),
      "Offer generated"
    );
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Application Pipeline</h2>
        <p className="mt-1 text-sm text-slate-500">Filter candidates by job and progress them through each hiring stage.</p>

        <div className="mt-5 max-w-lg">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select Job</label>
          <select
            className={`${inputClass} mt-1`}
            value={selectedJobId}
            onChange={(e) => {
              setSelectedJobId(e.target.value);
              fetchApplications(e.target.value);
            }}
          >
            <option value="">Choose a posted job</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Jobs: {jobs.length}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Selected: {selectedJob?.title || "None"}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Applications: {applications.length}</span>
        </div>
      </div>

      {!selectedJobId && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Select a job to view candidate applications.
        </div>
      )}

      {selectedJobId && busy && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500">
          Loading applications...
        </div>
      )}

      {selectedJobId && !busy && applications.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No applications found for this job.
        </div>
      )}

      {applications.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {applications.map((app) => (
            <article key={app._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{app.studentId?.userId?.name || "Unknown Candidate"}</h4>
                  <p className="text-sm text-slate-500">{app.studentId?.userId?.email || "No email"}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoTile label="Branch" value={app.studentId?.branch || "N/A"} />
                <InfoTile label="CGPA" value={app.studentId?.cgpa || "N/A"} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {app.status === "APPLIED" && (
                  <>
                    <ActionButton label="Shortlist" tone="blue" onClick={() => shortlist(app._id)} />
                    <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                  </>
                )}

                {app.status === "SHORTLISTED" && (
                  <ActionButton label="Send Assessment" tone="indigo" onClick={() => sendAssessment(app._id)} />
                )}

                {app.status === "ASSESSMENT_SENT" && (
                  <>
                    <ActionButton label="Mark Passed" tone="green" onClick={() => markAssessmentResult(app._id, true)} />
                    <ActionButton label="Mark Failed" tone="red" onClick={() => markAssessmentResult(app._id, false)} />
                  </>
                )}

                {app.status === "ASSESSMENT_PASSED" && (
                  <ActionButton label="Schedule Interview" tone="amber" onClick={() => scheduleInterview(app._id)} />
                )}

                {app.status === "INTERVIEW_SCHEDULED" && (
                  <>
                    <ActionButton label="Select" tone="green" onClick={() => selectCandidate(app._id)} />
                    <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                  </>
                )}

                {app.status === "SELECTED" && !app.offer?.pdfPath && (
                  <ActionButton label="Generate Offer" tone="indigo" onClick={() => generateOffer(app._id)} />
                )}

                {app.offer && <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">Offer: {app.offer.status}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = {
    APPLIED: "bg-slate-100 text-slate-700",
    SHORTLISTED: "bg-blue-100 text-blue-700",
    ASSESSMENT_SENT: "bg-indigo-100 text-indigo-700",
    ASSESSMENT_PASSED: "bg-emerald-100 text-emerald-700",
    INTERVIEW_SCHEDULED: "bg-amber-100 text-amber-700",
    SELECTED: "bg-green-100 text-green-700",
    REJECTED: "bg-rose-100 text-rose-700",
  };

  return (
    <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tone[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function ActionButton({ label, tone, onClick }) {
  const style = {
    blue: "bg-blue-600 hover:bg-blue-700",
    red: "bg-rose-600 hover:bg-rose-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    green: "bg-emerald-600 hover:bg-emerald-700",
    amber: "bg-amber-500 hover:bg-amber-600",
  };

  const iconMap = {
    "Shortlist": CheckIcon,
    "Reject": CloseIcon,
    "Send Assessment": AssignmentIcon,
    "Mark Passed": CheckIcon,
    "Mark Failed": CloseIcon,
    "Schedule Interview": EventIcon,
    "Select": CheckIcon,
    "Generate Offer": DescriptionIcon,
  };
  const Icon = iconMap[label];

  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${style[tone] || style.indigo}`}
    >
      <span className="inline-flex items-center gap-1">
        {Icon ? <Icon sx={{ fontSize: 14 }} /> : null}
        {label}
      </span>
    </button>
  );
}
