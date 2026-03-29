import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../../api/axios";
import toast from "react-hot-toast";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EventIcon from "@mui/icons-material/Event";
import DescriptionIcon from "@mui/icons-material/Description";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
  Autocomplete,
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
const COLUMN_PAGE_SIZE = 4;
const STAGE_PAGE_SIZE = 3;
const MAX_SLOT_ROWS = 8;
const STATUS_COLUMNS = [
  "APPLIED",
  "SHORTLISTED",
  "ASSESSMENT_SENT",
  "ASSESSMENT_PASSED",
  "ASSESSMENT_FAILED",
  "INTERVIEW_SCHEDULED",
  "SELECTED",
  "REJECTED",
];
const formatStageLabel = (status) => status.replaceAll("_", " ");
const getStagePageByStatus = (status) => {
  const index = STATUS_COLUMNS.indexOf(status);
  if (index < 0) return 1;
  return Math.floor(index / STAGE_PAGE_SIZE) + 1;
};

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

const createEmptySlot = () => ({
  start: "",
  end: "",
  mode: "Online",
  link: "",
});

const createDefaultAIConfig = () => ({
  questionCount: "5",
  durationMinutes: "20",
  difficulty: "MEDIUM",
  focusAreas: ""
});

export default function RecruiterApplications() {
  const [jobs, setJobs] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [assessmentSendingMap, setAssessmentSendingMap] = useState({});
  const [assessmentSentMap, setAssessmentSentMap] = useState({});
  const [columnPageMap, setColumnPageMap] = useState({});
  const [stagePage, setStagePage] = useState(1);
  const [selectedStage, setSelectedStage] = useState(STATUS_COLUMNS[0]);
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
  const [slotDialog, setSlotDialog] = useState({
    open: false,
    applicationId: "",
    panelType: "HUMAN",
    aiConfig: createDefaultAIConfig(),
    slots: [createEmptySlot()],
  });

  useEffect(() => {
    fetchJobs();
    fetchInterviewers();
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
  const selectedJobOption = selectedJob || null;
  const stageOptions = useMemo(
    () =>
      STATUS_COLUMNS.map((status) => ({
        value: status,
        label: formatStageLabel(status),
      })),
    []
  );
  const selectedStageOption =
    stageOptions.find((option) => option.value === selectedStage) || null;

  const groupedApplications = useMemo(() => {
    const groups = STATUS_COLUMNS.reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {});

    applications.forEach((app) => {
      if (!groups[app.status]) {
        groups[app.status] = [];
      }
      groups[app.status].push(app);
    });

    return groups;
  }, [applications]);

  useEffect(() => {
    setColumnPageMap({});
    setStagePage(1);
    setSelectedStage(STATUS_COLUMNS[0]);
  }, [selectedJobId]);

  const fetchJobs = async () => {
    try {
      const res = await API.get("/company/recruiter/jobs");
      setJobs(res.data || []);
    } catch {
      toast.error("Failed to load jobs");
    }
  };

  const fetchInterviewers = async () => {
    try {
      const res = await API.get("/recruiter/interviewers");
      setInterviewers((res.data || []).filter((item) => item.isActive));
    } catch {
      toast.error("Failed to load interviewers");
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
      const nextApplications = res.data || [];
      setApplications(nextApplications);
      setAssessmentSentMap(
        nextApplications.reduce((acc, app) => {
          acc[app._id] = ["ASSESSMENT_SENT", "ASSESSMENT_PASSED", "ASSESSMENT_FAILED", "INTERVIEW_SCHEDULED", "SELECTED"].includes(app.status);
          return acc;
        }, {})
      );
      setAssignmentDrafts(
        nextApplications.reduce((acc, app) => {
          const assignedId = app?.interviewerAssignment?.interviewerUserId?._id || "";
          acc[app._id] = assignedId;
          return acc;
        }, {})
      );
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
      await fetchApplications(selectedJobId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
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
    if (assessmentSendingMap[id] || assessmentSentMap[id]) {
      return;
    }

    const values = await openInputDialog({
      title: "Send Assessment",
      confirmText: "Send",
      fields: [
        { name: "link", label: "Assessment Link", placeholder: "https://example.com/assessment", required: true },
        { name: "scheduledAt", type: "datetime-local", label: "Assessment Date & Time", required: true }
      ],
    });
    if (!values?.link?.trim() || !values?.scheduledAt?.trim()) return;

    try {
      setAssessmentSendingMap((prev) => ({ ...prev, [id]: true }));
      await API.put(`/application/${id}/assessment`, {
        link: values.link.trim(),
        scheduledAt: values.scheduledAt.trim()
      });
      setAssessmentSentMap((prev) => ({ ...prev, [id]: true }));
      toast.success("Assessment sent");
      await fetchApplications(selectedJobId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setAssessmentSendingMap((prev) => ({ ...prev, [id]: false }));
    }
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

  const openSlotDialog = (id) => {
    setSlotDialog({
      open: true,
      applicationId: id,
      panelType: "HUMAN",
      aiConfig: createDefaultAIConfig(),
      slots: [createEmptySlot()],
    });
  };

  const closeSlotDialog = () => {
    setSlotDialog({
      open: false,
      applicationId: "",
      panelType: "HUMAN",
      aiConfig: createDefaultAIConfig(),
      slots: [createEmptySlot()],
    });
  };

  const updateSlotField = (index, field, value) => {
    setSlotDialog((prev) => ({
      ...prev,
      slots: prev.slots.map((slot, idx) =>
        idx === index ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const updateSlotDialogField = (field, value) => {
    setSlotDialog((prev) => ({ ...prev, [field]: value }));
  };

  const updateAIConfigField = (field, value) => {
    setSlotDialog((prev) => ({
      ...prev,
      aiConfig: {
        ...prev.aiConfig,
        [field]: value
      }
    }));
  };

  const addSlotRow = () => {
    setSlotDialog((prev) => {
      if (prev.slots.length >= MAX_SLOT_ROWS) return prev;
      return { ...prev, slots: [...prev.slots, createEmptySlot()] };
    });
  };

  const removeSlotRow = (index) => {
    setSlotDialog((prev) => {
      if (prev.slots.length <= 1) return prev;
      return { ...prev, slots: prev.slots.filter((_, idx) => idx !== index) };
    });
  };

  const submitSlotDialog = async () => {
    for (let i = 0; i < slotDialog.slots.length; i += 1) {
      const slot = slotDialog.slots[i];
      const start = new Date(slot.start);
      const end = new Date(slot.end);

      if (!slot.start || !slot.end || !slot.mode) {
        toast.error(`Slot ${i + 1}: start, end, and mode are required`);
        return;
      }

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        toast.error(`Slot ${i + 1}: invalid start/end time`);
        return;
      }

      if (slotDialog.panelType === "AI" && slot.mode !== "Online") {
        toast.error(`Slot ${i + 1}: AI interviews must use Online mode`);
        return;
      }

    }

    const payload = {
      panelType: slotDialog.panelType,
      aiConfig: {
        ...slotDialog.aiConfig,
        focusAreas: slotDialog.aiConfig.focusAreas,
      },
      slots: slotDialog.slots.map((slot) => ({
        start: slot.start,
        end: slot.end,
        mode: slot.mode,
        link: slot.link.trim(),
      })),
    };

    await runAction(
      () => API.put(`/application/${slotDialog.applicationId}/interview/slots`, payload),
      "Interview slots published"
    );
    closeSlotDialog();
  };

  const selectCandidate = (id) => runAction(() => API.put(`/application/${id}/select`), "Candidate selected");

  const assignInterviewer = async (applicationId) => {
    const interviewerUserId = assignmentDrafts[applicationId] || "";
    if (!interviewerUserId) {
      toast.error("Select an interviewer first");
      return;
    }

    await runAction(
      () =>
        API.put(`/application/${applicationId}/interviewer/assign`, {
          interviewerUserId,
        }),
      "Interviewer assigned"
    );
  };

  const unassignInterviewer = async (applicationId) => {
    await runAction(
      () => API.put(`/application/${applicationId}/interviewer/unassign`),
      "Interviewer unassigned"
    );
  };

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

  const stageTotalPages = Math.max(1, Math.ceil(STATUS_COLUMNS.length / STAGE_PAGE_SIZE));
  const normalizedStagePage = Math.min(stagePage, stageTotalPages);
  const stageStart = (normalizedStagePage - 1) * STAGE_PAGE_SIZE;
  const visibleStages = STATUS_COLUMNS.slice(stageStart, stageStart + STAGE_PAGE_SIZE);
  const handleStagePageChange = (nextPage) => {
    const clampedPage = Math.max(1, Math.min(nextPage, stageTotalPages));
    setStagePage(clampedPage);
    setSelectedStage(STATUS_COLUMNS[(clampedPage - 1) * STAGE_PAGE_SIZE] || STATUS_COLUMNS[0]);
  };

  return (
    <>
      <div className="space-y-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Application Pipeline</h2>
        <p className="mt-1 text-sm text-slate-500">Filter candidates by job and progress them through each hiring stage.</p>

        <div className="mt-5 grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search + Select Job</label>
            <Autocomplete
              options={jobs}
              value={selectedJobOption}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              getOptionLabel={(option) => option?.title || ""}
              noOptionsText="No matching jobs"
              onChange={(_, value) => {
                const jobId = value?._id || "";
                setSelectedJobId(jobId);
                fetchApplications(jobId);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type job title to search"
                  size="small"
                  sx={{
                    mt: 1,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      backgroundColor: "#ffffff",
                    },
                  }}
                />
              )}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search + Select Stage</label>
            <Autocomplete
              options={stageOptions}
              value={selectedStageOption}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              getOptionLabel={(option) => option?.label || ""}
              noOptionsText="No matching stages"
              onChange={(_, value) => {
                const nextStage = value?.value || STATUS_COLUMNS[0];
                setSelectedStage(nextStage);
                setStagePage(getStagePageByStatus(nextStage));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type stage name to search"
                  size="small"
                  sx={{
                    mt: 1,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      backgroundColor: "#ffffff",
                    },
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Jobs: {jobs.length}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Selected: {selectedJob?.title || "None"}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Applications: {applications.length}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Active Interviewers: {interviewers.length}</span>
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
        <div className="space-y-4">
          {STATUS_COLUMNS.length > STAGE_PAGE_SIZE ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
              <span>
                Showing stages {stageStart + 1}-{Math.min(stageStart + STAGE_PAGE_SIZE, STATUS_COLUMNS.length)} of{" "}
                {STATUS_COLUMNS.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStagePageChange(normalizedStagePage - 1)}
                  disabled={normalizedStagePage <= 1}
                  className="rounded-md border border-slate-300 px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1">
                    <NavigateBeforeIcon sx={{ fontSize: 14 }} />
                    Prev Stages
                  </span>
                </button>
                <span className="font-semibold">
                  Page {normalizedStagePage} / {stageTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handleStagePageChange(normalizedStagePage + 1)}
                  disabled={normalizedStagePage >= stageTotalPages}
                  className="rounded-md border border-slate-300 px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1">
                    Next Stages
                    <NavigateNextIcon sx={{ fontSize: 14 }} />
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {visibleStages.map((status) => {
              const items = groupedApplications[status] || [];
              const totalPages = Math.max(1, Math.ceil(items.length / COLUMN_PAGE_SIZE));
              const currentPage = Math.min(columnPageMap[status] || 1, totalPages);
              const pageStart = (currentPage - 1) * COLUMN_PAGE_SIZE;
              const visibleItems = items.slice(pageStart, pageStart + COLUMN_PAGE_SIZE);

              return (
                <section key={status} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{status.replaceAll("_", " ")}</h3>
                    <StatusBadge status={status} count={items.length} />
                  </div>

                  <div className="space-y-3">
                    {visibleItems.map((app) => {
                      const resumeLink = getResumeUrl(app.resumeUrl);
                      const offerLetterLink = getOfferUrl(app.offer?.pdfPath);
                      const openSlots = (app.interviewSlots || []).filter((slot) => !slot.bookedByStudent).length;

                      return (
                        <article key={app._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">{app.studentId?.userId?.name || "Unknown Candidate"}</h4>
                              <p className="text-xs text-slate-500">{app.studentId?.userId?.email || "No email"}</p>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <InfoTile label="Branch" value={app.studentId?.branch || "N/A"} />
                            <InfoTile label="CGPA" value={app.studentId?.cgpa || "N/A"} />
                          </div>

                          {app.interview?.date ? (
                            <p className="mt-2 text-xs text-slate-600">
                              Interview: {new Date(app.interview.date).toLocaleString()} ({formatPanelType(app.interview?.panelType)})
                            </p>
                          ) : null}
                          {String(app?.interview?.panelType || "HUMAN").trim().toUpperCase() !== "AI" && app?.interviewerAssignment?.interviewerUserId ? (
                            <p className="mt-1 text-xs text-indigo-700">
                              Assigned Interviewer: {app.interviewerAssignment.interviewerUserId.name || "N/A"}
                            </p>
                          ) : null}
                          {status === "ASSESSMENT_PASSED" && openSlots > 0 ? (
                            <p className="mt-1 text-xs text-emerald-700">Open slots: {openSlots}</p>
                          ) : null}

                          {app?.interviewerFeedback?.submittedAt ? (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                              <p className="font-semibold">
                                Evaluation: {String(app.interviewerFeedback.recommendation || "").replaceAll("_", " ")}
                              </p>
                              <p className="mt-1">
                                Ratings - Comm: {app.interviewerFeedback?.ratings?.communication ?? "-"}, Tech: {app.interviewerFeedback?.ratings?.technical ?? "-"}, PS: {app.interviewerFeedback?.ratings?.problemSolving ?? "-"}, Fit: {app.interviewerFeedback?.ratings?.cultureFit ?? "-"}
                              </p>
                              {app.interviewerFeedback.notes ? (
                                <p className="mt-1">{app.interviewerFeedback.notes}</p>
                              ) : null}
                              <p className="mt-1 text-[11px]">
                                Submitted by {app.interviewerFeedback?.submittedBy?.name || "Interviewer"} on{" "}
                                {new Date(app.interviewerFeedback.submittedAt).toLocaleString()}
                              </p>
                            </div>
                          ) : null}

                          {app?.aiInterview?.endedAt ? (
                            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-3 text-xs text-cyan-900">
                              <p className="font-semibold">AI Interview Report</p>
                              <p className="mt-1">
                                Status: {String(app.aiInterview.status || "COMPLETED").replaceAll("_", " ")}
                              </p>
                              <p className="mt-1">
                                Recommendation: {formatRecommendation(app.aiInterview.recommendation)}
                              </p>
                              <p className="mt-1">
                                Scores - Comm: {app.aiInterview?.scores?.communication ?? "-"}, Tech: {app.aiInterview?.scores?.technicalKnowledge ?? "-"}, PS: {app.aiInterview?.scores?.problemSolving ?? "-"}, Fit: {app.aiInterview?.scores?.roleFit ?? "-"}
                              </p>
                              {app.aiInterview.summary ? <p className="mt-1">{app.aiInterview.summary}</p> : null}
                              {app.aiInterview.finalReport ? <p className="mt-1">{app.aiInterview.finalReport}</p> : null}
                              {Array.isArray(app.aiInterview?.transcript) && app.aiInterview.transcript.length ? (
                                <div className="mt-2 rounded-lg border border-cyan-100 bg-white/80 p-2">
                                  <p className="font-semibold text-cyan-900">Transcript Preview</p>
                                  {app.aiInterview.transcript.slice(0, 2).map((entry) => (
                                    <div key={`${app._id}-${entry.questionIndex}`} className="mt-1">
                                      <p className="font-medium">Q: {entry.question || "Question"}</p>
                                      <p className="text-cyan-800">A: {entry.answer || "No answer captured"}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {status === "INTERVIEW_SCHEDULED" ? (
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                              {String(app?.interview?.panelType || "HUMAN").trim().toUpperCase() === "AI" ? (
                                <>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    AI Interview Configuration
                                  </label>
                                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                                    <InfoTile label="Questions" value={app?.interview?.aiConfig?.questionCount || "5"} />
                                    <InfoTile label="Duration" value={`${app?.interview?.aiConfig?.durationMinutes || 20} min`} />
                                  </div>
                                  <p className="mt-2 text-xs text-indigo-700">
                                    Difficulty: {app?.interview?.aiConfig?.difficulty || "MEDIUM"}
                                  </p>
                                  {Array.isArray(app?.interview?.aiConfig?.focusAreas) && app.interview.aiConfig.focusAreas.length ? (
                                    <p className="mt-1 text-xs text-slate-600">
                                      Focus Areas: {app.interview.aiConfig.focusAreas.join(", ")}
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-xs text-slate-600">
                                      AI interview configured. No human interviewer assignment is required.
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Interviewer Assignment
                                  </label>
                                  <select
                                    value={assignmentDrafts[app._id] || ""}
                                    onChange={(event) =>
                                      setAssignmentDrafts((prev) => ({
                                        ...prev,
                                        [app._id]: event.target.value,
                                      }))
                                    }
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700"
                                  >
                                    <option value="">Select interviewer</option>
                                    {interviewers.map((interviewer) => (
                                      <option key={interviewer.user?._id || interviewer._id} value={interviewer.user?._id || ""}>
                                        {interviewer.user?.name || "Interviewer"} ({interviewer.interviewerCode})
                                      </option>
                                    ))}
                                  </select>
                                  {!app?.interviewerFeedback?.submittedAt ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => assignInterviewer(app._id)}
                                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                                      >
                                        Assign / Reassign
                                      </button>
                                      {app?.interviewerAssignment?.interviewerUserId ? (
                                        <button
                                          type="button"
                                          onClick={() => unassignInterviewer(app._id)}
                                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                                        >
                                          Unassign
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </>
                              )}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {resumeLink ? (
                              <a
                                href={resumeLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <DescriptionIcon sx={{ fontSize: 14 }} />
                                  Resume
                                </span>
                              </a>
                            ) : null}

                            {status === "APPLIED" ? (
                              <>
                                <ActionButton label="Shortlist" tone="blue" onClick={() => shortlist(app._id)} />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "SHORTLISTED" ? (
                              <>
                                <ActionButton
                                  label={assessmentSentMap[app._id] ? "Assessment Sent" : "Send Assessment"}
                                  tone="indigo"
                                  onClick={() => sendAssessment(app._id)}
                                  disabled={Boolean(assessmentSentMap[app._id] || assessmentSendingMap[app._id])}
                                />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "ASSESSMENT_SENT" ? (
                              <>
                                <ActionButton label="Mark Passed" tone="green" onClick={() => markAssessmentResult(app._id, true)} />
                                <ActionButton label="Mark Failed" tone="red" onClick={() => markAssessmentResult(app._id, false)} />
                              </>
                            ) : null}

                            {status === "ASSESSMENT_PASSED" ? (
                              <>
                                <ActionButton label="Publish Slots" tone="amber" onClick={() => openSlotDialog(app._id)} />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "INTERVIEW_SCHEDULED" ? (
                              <>
                                <ActionButton label="Select" tone="green" onClick={() => selectCandidate(app._id)} />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "SELECTED" && !app.offer?.pdfPath ? (
                              <ActionButton label="Generate Offer" tone="indigo" onClick={() => generateOffer(app._id)} />
                            ) : null}

                            {status === "SELECTED" && offerLetterLink ? (
                              <a
                                href={offerLetterLink}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <DescriptionIcon sx={{ fontSize: 14 }} />
                                  Offer
                                </span>
                              </a>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}

                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
                        No candidates
                      </div>
                    ) : null}

                    {items.length > COLUMN_PAGE_SIZE ? (
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        <button
                          type="button"
                          onClick={() => setColumnPageMap((prev) => ({ ...prev, [status]: Math.max(currentPage - 1, 1) }))}
                          disabled={currentPage <= 1}
                          className="rounded-md border border-slate-300 px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="inline-flex items-center gap-1">
                            <NavigateBeforeIcon sx={{ fontSize: 14 }} />
                            Prev
                          </span>
                        </button>
                        <span>Page {currentPage} / {totalPages}</span>
                        <button
                          type="button"
                          onClick={() => setColumnPageMap((prev) => ({ ...prev, [status]: Math.min(currentPage + 1, totalPages) }))}
                          disabled={currentPage >= totalPages}
                          className="rounded-md border border-slate-300 px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span className="inline-flex items-center gap-1">
                            Next
                            <NavigateNextIcon sx={{ fontSize: 14 }} />
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
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
          {inputDialog.fields.map((field) => (
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
              required={Boolean(field.required)}
              InputLabelProps={field.type === "datetime-local" ? { shrink: true } : undefined}
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
          ))}
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
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
          >
            {inputDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={slotDialog.open}
        onClose={closeSlotDialog}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            boxShadow: "0 24px 45px rgba(15, 23, 42, 0.25)",
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 42%)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a", pb: 0.5 }}>Publish Interview Slots</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <DialogContentText sx={{ color: "#475569", fontSize: "0.86rem" }}>
            Share multiple time options. Students will pick one available slot.
          </DialogContentText>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              select
              label="Interview Panel"
              value={slotDialog.panelType}
              onChange={(event) => updateSlotDialogField("panelType", event.target.value)}
              size="small"
              fullWidth
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
            >
              <MenuItem value="HUMAN">Human Interview</MenuItem>
              <MenuItem value="AI">AI Interview</MenuItem>
            </TextField>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              {slotDialog.panelType === "AI"
                ? "AI interviews use the in-app AI panel, so students do not need a human interviewer assignment."
                : "Human interviews keep the current interviewer assignment workflow after the slot is booked."}
            </div>
          </div>

          {slotDialog.panelType === "AI" ? (
            <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:grid-cols-2">
              <TextField
                label="Question Count"
                value={slotDialog.aiConfig.questionCount}
                onChange={(event) => updateAIConfigField("questionCount", event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                size="small"
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
              />
              <TextField
                label="Duration (minutes)"
                value={slotDialog.aiConfig.durationMinutes}
                onChange={(event) => updateAIConfigField("durationMinutes", event.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                size="small"
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
              />
              <TextField
                select
                label="Difficulty"
                value={slotDialog.aiConfig.difficulty}
                onChange={(event) => updateAIConfigField("difficulty", event.target.value)}
                size="small"
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
              >
                <MenuItem value="EASY">Easy</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HARD">Hard</MenuItem>
              </TextField>
              <TextField
                label="Focus Areas"
                value={slotDialog.aiConfig.focusAreas}
                onChange={(event) => updateAIConfigField("focusAreas", event.target.value)}
                placeholder="React, Node.js, Communication"
                size="small"
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
              />
            </div>
          ) : null}

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {slotDialog.slots.map((slot, index) => (
              <div key={`slot-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slot {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeSlotRow(index)}
                    disabled={slotDialog.slots.length <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    type="datetime-local"
                    label="Start"
                    value={slot.start}
                    onChange={(e) => updateSlotField(index, "start", e.target.value)}
                    size="small"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
                  />
                  <TextField
                    type="datetime-local"
                    label="End"
                    value={slot.end}
                    onChange={(e) => updateSlotField(index, "end", e.target.value)}
                    size="small"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
                  />
                  <TextField
                    select
                    label="Mode"
                    value={slot.mode}
                    onChange={(e) => updateSlotField(index, "mode", e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
                  >
                    <MenuItem value="Online">Online</MenuItem>
                    <MenuItem value="Offline">Offline</MenuItem>
                  </TextField>
                  <TextField
                    label={slot.mode === "Online" ? "Optional Backup Link" : "Venue / Address"}
                    value={slot.link}
                    onChange={(e) => updateSlotField(index, "link", e.target.value)}
                    placeholder={slot.mode === "Online" ? "Optional external link (fallback only)" : "Office / Campus location"}
                    size="small"
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {slotDialog.slots.length} / {MAX_SLOT_ROWS} slots added
            </p>
            <button
              type="button"
              onClick={addSlotRow}
              disabled={slotDialog.slots.length >= MAX_SLOT_ROWS}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AddIcon sx={{ fontSize: 14 }} />
              Add Slot
            </button>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeSlotDialog} variant="outlined" sx={{ textTransform: "none", borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={submitSlotDialog}
            variant="contained"
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}
          >
            Publish Slots
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

function ActionButton({ label, tone, onClick, disabled = false }) {
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
    "Assessment Sent": AssignmentIcon,
    "Mark Passed": CheckIcon,
    "Mark Failed": CloseIcon,
    "Publish Slots": EventIcon,
    "Select": CheckIcon,
    "Generate Offer": DescriptionIcon,
  };
  const Icon = iconMap[label];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
        disabled ? "cursor-not-allowed bg-slate-300 text-slate-600" : (style[tone] || style.indigo)
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {Icon ? <Icon sx={{ fontSize: 14 }} /> : null}
        {label}
      </span>
    </button>
  );
}

function formatPanelType(value) {
  return String(value || "HUMAN").trim().toUpperCase() === "AI" ? "AI Interview" : "Human Interview";
}

function formatRecommendation(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.replaceAll("_", " ") : "Pending";
}
