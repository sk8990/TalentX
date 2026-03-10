import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";
import toast from "react-hot-toast";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContentText,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";

const API_BASE_URL = API.defaults.baseURL || "";
const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const getResumeUrl = (resumeUrl) => {
  if (!resumeUrl || typeof resumeUrl !== "string") return "";

  const trimmed = resumeUrl.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalized = trimmed.replace(/\\/g, "/");
  const uploadsIndex = normalized.toLowerCase().indexOf("uploads/");

  if (uploadsIndex >= 0) {
    return `${SERVER_ORIGIN}/${normalized.slice(uploadsIndex)}`;
  }

  return `${SERVER_ORIGIN}/${normalized.replace(/^\/+/, "")}`;
};

const getOfferUrl = (offerPath) => {
  if (!offerPath || typeof offerPath !== "string") return "";

  const trimmed = offerPath.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `${SERVER_ORIGIN}/${trimmed.replace(/^\/+/, "")}`;
};

export default function RecruiterApplications() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();
  const [inputDialog, setInputDialog] = useState({
    open: false,
    key: "",
    title: "",
    description: "",
    confirmText: "Submit",
    fields: [],
  });
  const [inputValues, setInputValues] = useState({});
  const inputResolverRef = useRef(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const jobId = searchParams.get("jobId") || "";
    if (!jobId || jobId === selectedJobId) return;
    setSelectedJobId(jobId);
    fetchApplications(jobId);
  }, [searchParams, selectedJobId]);

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

  const openInputDialog = ({ key = "", title, description = "", confirmText = "Submit", fields = [] }) =>
    new Promise((resolve) => {
      inputResolverRef.current = resolve;
      setInputValues(
        fields.reduce((acc, field) => {
          acc[field.name] = field.defaultValue || "";
          return acc;
        }, {})
      );
      setInputDialog({
        open: true,
        key,
        title,
        description,
        confirmText,
        fields,
      });
    });

  const closeInputDialog = (result) => {
    setInputDialog((prev) => ({ ...prev, open: false }));
    if (inputResolverRef.current) {
      inputResolverRef.current(result);
      inputResolverRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (inputResolverRef.current) {
        inputResolverRef.current(null);
        inputResolverRef.current = null;
      }
    };
  }, []);

  const sendAssessment = async (id) => {
    const values = await openInputDialog({
      title: "Send Assessment",
      confirmText: "Send",
      fields: [{ name: "link", label: "Assessment Link", placeholder: "https://example.com/assessment", required: true }],
    });
    if (!values?.link?.trim()) return;

    runAction(() => API.put(`/application/${id}/assessment`, { link: values.link.trim() }), "Assessment sent");
  };

  const markAssessmentResult = async (id, passed) => {
    const values = await openInputDialog({
      title: "Enter Assessment Score",
      confirmText: "Update",
      fields: [{ name: "score", label: "Score", placeholder: "e.g. 85", required: true }],
    });
    if (!values?.score?.trim()) return;

    runAction(
      () =>
        API.put(`/application/${id}/assessment/result`, {
          result: passed ? "PASS" : "FAIL",
          score: values.score.trim(),
        }),
      "Assessment updated"
    );
  };

  const scheduleInterview = async (id) => {
    const values = await openInputDialog({
      key: "scheduleInterview",
      title: "Schedule Interview",
      description: "Set interview slot and mode. For online interviews, add a meeting link.",
      confirmText: "Schedule",
      fields: [
        { name: "date", label: "Interview Date & Time", type: "datetime-local", required: true },
        {
          name: "mode",
          label: "Interview Mode",
          type: "select",
          options: ["Online", "Offline"],
          required: true,
          defaultValue: "Online",
        },
        {
          name: "link",
          label: "Meeting Link",
          placeholder: "https://meet.google.com/...",
          required: false,
        },
      ],
    });

    const dateValue = values?.date?.trim();
    const modeValue = values?.mode?.trim();
    const linkValue = values?.link?.trim() || "";
    const isOnline = modeValue?.toLowerCase() === "online";
    if (!dateValue || !modeValue) return;
    if (isOnline && !linkValue) {
      toast.error("Meeting link is required for online interviews");
      return;
    }

    runAction(
      () =>
        API.put(`/application/${id}/interview`, {
          date: dateValue.replace("T", " "),
          mode: modeValue,
          link: isOnline ? linkValue : "",
        }),
      "Interview scheduled"
    );
  };

  const selectCandidate = (id) => runAction(() => API.put(`/application/${id}/select`), "Candidate selected");

  const generateOffer = async (id) => {
    const values = await openInputDialog({
      title: "Generate Offer",
      confirmText: "Generate",
      fields: [
        { name: "salary", label: "Salary", placeholder: "e.g. 6 LPA", required: true },
        { name: "joiningDate", label: "Joining Date", placeholder: "YYYY-MM-DD", required: true },
        { name: "location", label: "Location", placeholder: "City / Office", required: true },
      ],
    });

    if (!values?.salary?.trim() || !values?.joiningDate?.trim() || !values?.location?.trim()) {
      toast.error("All fields required");
      return;
    }

    runAction(
      () =>
        API.put(`/application/${id}/offer`, {
          salary: values.salary.trim(),
          joiningDate: values.joiningDate.trim(),
          location: values.location.trim(),
        }),
      "Offer generated"
    );
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
  const isScheduleInterviewDialog = inputDialog.key === "scheduleInterview";
  const scheduleMode = (inputValues.mode || "").toLowerCase();
  const scheduleLinkRequired = isScheduleInterviewDialog && scheduleMode === "online";
  const scheduleSubmitDisabled =
    isScheduleInterviewDialog &&
    (!inputValues.date?.trim() || !inputValues.mode?.trim() || (scheduleLinkRequired && !inputValues.link?.trim()));

  return (
    <>
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
          {applications.map((app) => {
            const resumeLink = getResumeUrl(app.resumeUrl);
            const offerLetterLink = getOfferUrl(app.offer?.pdfPath);
            return (
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
                {resumeLink ? (
                  <a
                    href={resumeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
                  >
                    <span className="inline-flex items-center gap-1">
                      <DescriptionIcon sx={{ fontSize: 14 }} />
                      View Resume
                    </span>
                  </a>
                ) : (
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                    Resume unavailable
                  </span>
                )}

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

                {app.status === "SELECTED" && offerLetterLink && (
                  <a
                    href={offerLetterLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                  >
                    <span className="inline-flex items-center gap-1">
                      <DescriptionIcon sx={{ fontSize: 14 }} />
                      View Offer Letter
                    </span>
                  </a>
                )}

                {app.offer && <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">Offer: {app.offer.status}</span>}
              </div>
            </article>
          )})}
        </div>
      )}
      </div>

      <Dialog
        open={inputDialog.open}
        onClose={() => closeInputDialog(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            boxShadow: "0 24px 45px rgba(15, 23, 42, 0.25)",
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 38%)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a", pb: 0.5 }}>{inputDialog.title}</DialogTitle>
        {inputDialog.description ? (
          <DialogContentText sx={{ px: 3, color: "#475569", fontSize: "0.86rem" }}>
            {inputDialog.description}
          </DialogContentText>
        ) : null}
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          {inputDialog.fields.map((field) => {
            if (isScheduleInterviewDialog && field.name === "link" && scheduleMode === "offline") {
              return null;
            }

            return (
              <TextField
                key={field.name}
                select={field.type === "select"}
                type={field.type === "datetime-local" ? "datetime-local" : "text"}
                label={field.label}
                value={inputValues[field.name] || ""}
                onChange={(e) =>
                  setInputValues((prev) => ({
                    ...prev,
                    [field.name]: e.target.value,
                  }))
                }
                placeholder={field.placeholder || ""}
                size="small"
                fullWidth
                required={Boolean(field.required) || (field.name === "link" && scheduleLinkRequired)}
                InputLabelProps={field.type === "datetime-local" ? { shrink: true } : undefined}
                helperText={
                  isScheduleInterviewDialog && field.name === "link" && scheduleLinkRequired
                    ? "Required for online interviews"
                    : " "
                }
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#ffffff",
                  },
                }}
              >
                {field.type === "select"
                  ? field.options?.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))
                  : null}
              </TextField>
            );
          })}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => closeInputDialog(null)}
            variant="outlined"
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => closeInputDialog(inputValues)}
            variant="contained"
            disabled={scheduleSubmitDisabled}
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
          >
            {inputDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
