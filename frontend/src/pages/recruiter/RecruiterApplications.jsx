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
import ScreenLoader from "../../components/ScreenLoader";
import FeatureGate from "../../components/FeatureGate";
import ProtectedUploadLink from "../../components/ProtectedUploadLink";
import { useSubscription } from "../../context/SubscriptionContext";

const COLUMN_PAGE_SIZE = 4;
const STAGE_PAGE_SIZE = 3;
const MAX_SLOT_ROWS = 8;
const RESCHEDULE_REASON_OPTIONS = ["STUDENT_NO_SHOW", "INTERVIEWER_UNAVAILABLE", "OTHER"];
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

function toUtcIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function RecruiterApplications() {
  const [jobs, setJobs] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [assessmentSendingMap, setAssessmentSendingMap] = useState({});
  const [assessmentSentMap, setAssessmentSentMap] = useState({});
  const [columnPageMap, setColumnPageMap] = useState({});
  const [stagePage, setStagePage] = useState(1);
  const [selectedStage, setSelectedStage] = useState(STATUS_COLUMNS[0]);
  const [busy, setBusy] = useState(false);
  const [downloadingOfferId, setDownloadingOfferId] = useState("");
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
  const [reportDialog, setReportDialog] = useState({
    open: false,
    app: null,
  });
  const { hasFeature } = useSubscription();

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
      setInterviewers((res.data || []).filter((item) => item.isActive && item.user?._id));
    } catch {
      setInterviewers([]);
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
      const scheduledAt = toUtcIso(values.scheduledAt.trim());
      if (!scheduledAt) {
        toast.error("Assessment date/time is invalid");
        return;
      }
      await API.put(`/application/${id}/assessment`, {
        link: values.link.trim(),
        scheduledAt
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
    setSlotDialog((prev) => {
      const newSlots = prev.slots.map((slot, idx) => {
        if (idx !== index) return slot;

        const updatedSlot = { ...slot, [field]: value };

        if (field === "start" && value && prev.aiConfig?.durationMinutes) {
          const startDate = new Date(value);
          if (!Number.isNaN(startDate.getTime())) {
            const durationMs = parseInt(prev.aiConfig.durationMinutes, 10) * 60000;
            const endDate = new Date(startDate.getTime() + durationMs);

            const pad = (n) => n.toString().padStart(2, "0");
            updatedSlot.end = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
          }
        }

        return updatedSlot;
      });
      return { ...prev, slots: newSlots };
    });
  };

  const updateAIConfigField = (field, value) => {
    setSlotDialog((prev) => {
      const newAiConfig = { ...prev.aiConfig, [field]: value };
      
      let newSlots = prev.slots;
      if (field === "durationMinutes" && value) {
        newSlots = prev.slots.map((slot) => {
          if (!slot.start) return slot;
          const startDate = new Date(slot.start);
          if (!Number.isNaN(startDate.getTime())) {
            const durationMs = parseInt(value, 10) * 60000;
            const endDate = new Date(startDate.getTime() + durationMs);
            const pad = (n) => n.toString().padStart(2, "0");
            return {
              ...slot,
              end: `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
            };
          }
          return slot;
        });
      }

      return {
        ...prev,
        aiConfig: newAiConfig,
        slots: newSlots
      };
    });
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

  const handleDownloadPDF = (app) => {
    if (!app || !app.aiInterview) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>AI Interview Report - ${app.studentId?.userId?.name || "Candidate"}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
            .section { margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .section p { margin: 4px 0; }
            .score-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; }
            .score-item { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-weight: 500; }
            .score-value { color: #4f46e5; font-weight: 700; float: right; }
            .transcript-item { margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
            .q { font-weight: 600; color: #0f172a; margin-bottom: 8px; }
            .a { color: #475569; }
          </style>
        </head>
        <body>
          <h1>AI Interview Report</h1>
          <div class="section">
            <p><strong>Candidate:</strong> ${app.studentId?.userId?.name || "Unknown"}</p>
            <p><strong>Email:</strong> ${app.studentId?.userId?.email || "Unknown"}</p>
            <p><strong>Role:</strong> ${app.jobId?.title || "Unknown Role"}</p>
            <p><strong>Date:</strong> ${new Date(app.aiInterview.endedAt || Date.now()).toLocaleString()}</p>
            <p><strong>Overall Recommendation:</strong> <span style="color: #4f46e5; font-weight: 700;">${(app.aiInterview.recommendation || "N/A").replaceAll("_", " ")}</span></p>
          </div>
          
          <h2>Scores</h2>
          <div class="score-grid">
            <div class="score-item">Communication <span class="score-value">${app.aiInterview?.scores?.communication ?? "-"} / 5</span></div>
            <div class="score-item">Technical Knowledge <span class="score-value">${app.aiInterview?.scores?.technicalKnowledge ?? "-"} / 5</span></div>
            <div class="score-item">Problem Solving <span class="score-value">${app.aiInterview?.scores?.problemSolving ?? "-"} / 5</span></div>
            <div class="score-item">Role Fit <span class="score-value">${app.aiInterview?.scores?.roleFit ?? "-"} / 5</span></div>
          </div>

          ${app.aiInterview.summary ? `<h2>Summary</h2><div class="section">${app.aiInterview.summary}</div>` : ""}
          ${app.aiInterview.finalReport ? `<h2>Final Report</h2><div class="section">${app.aiInterview.finalReport}</div>` : ""}

          <h2>Transcript</h2>
          ${(app.aiInterview.transcript || []).map((t, i) => `
            <div class="transcript-item">
              <div class="q">Q${i + 1}: ${t.question}</div>
              <div class="a">A: ${t.answer || "(No answer provided)"}</div>
            </div>
          `).join("")}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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

      if (start.getTime() <= Date.now()) {
        toast.error(`Slot ${i + 1}: start time must be in the future`);
        return;
      }

      // AI slots must be online; HUMAN online slots require a meeting link.
      if (slotDialog.panelType === "AI" && slot.mode !== "Online") {
        toast.error(`Slot ${i + 1}: AI interviews must use Online mode`);
        return;
      }
      if (slotDialog.panelType === "HUMAN" && slot.mode === "Online" && !slot.link.trim()) {
        toast.error(`Slot ${i + 1}: a meeting link is required for Online interviews`);
        return;
      }
    }

    const payload = {
      panelType: slotDialog.panelType,
      slots: slotDialog.slots.map((slot) => ({
        start: toUtcIso(slot.start),
        end: toUtcIso(slot.end),
        mode: slot.mode,
        link: slot.link.trim(),
      })),
    };

    if (slotDialog.panelType === "AI" && hasFeature("assessmentPanel")) {
      payload.aiConfig = {
        ...slotDialog.aiConfig,
        focusAreas: slotDialog.aiConfig.focusAreas,
      };
    }

    await runAction(
      () => API.put(`/application/${slotDialog.applicationId}/interview/slots`, payload),
      "Interview slots published"
    );
    closeSlotDialog();
  };

  const rescheduleInterview = async (app) => {
    const endedAiRound = Boolean(app?.aiInterview?.endedAt || app?.interviewSession?.endedAt);
    const values = await openInputDialog({
      key: `reschedule-${app?._id || ""}`,
      title: "Reschedule Interview",
      description: endedAiRound
        ? "This will reset the current AI interview report/session and let the candidate take the interview again."
        : "Update the scheduled interview time for this candidate.",
      confirmText: "Reschedule",
      fields: [
        {
          name: "reason",
          type: "select",
          label: "Reason",
          required: true,
          defaultValue: "OTHER",
          options: RESCHEDULE_REASON_OPTIONS
        },
        {
          name: "newDate",
          type: "datetime-local",
          label: "New Start Time",
          required: true,
          defaultValue: toDateTimeLocalValue(app?.interview?.date)
        },
        {
          name: "newEndDate",
          type: "datetime-local",
          label: "New End Time",
          required: true,
          defaultValue: toDateTimeLocalValue(app?.interview?.endDate)
        },
        {
          name: "notes",
          label: "Notes",
          placeholder: "Optional reason or context",
          defaultValue: endedAiRound ? "Previous interview was ended by mistake." : ""
        }
      ],
    });

    if (!values) return;

    const newDate = toUtcIso(values.newDate);
    const newEndDate = toUtcIso(values.newEndDate);

    if (!values.reason?.trim() || !newDate || !newEndDate) {
      toast.error("Reason, new start time, and new end time are required");
      return;
    }

    if (new Date(newEndDate).getTime() <= new Date(newDate).getTime()) {
      toast.error("New end time must be after new start time");
      return;
    }

    await runAction(
      () =>
        API.put(`/application/${app._id}/interview/reschedule`, {
          reason: values.reason.trim(),
          notes: values.notes?.trim() || "",
          newDate,
          newEndDate
        }),
      endedAiRound ? "Interview reset and rescheduled" : "Interview rescheduled"
    );
  };

  const assignInterviewer = async (app) => {
    const availableInterviewers = interviewers.filter((item) => item.isActive && item.user?._id);
    if (availableInterviewers.length === 0) {
      toast.error("Create an active interviewer before assigning this round");
      return;
    }

    const currentInterviewerId = String(app?.interviewerAssignment?.interviewerUserId?._id || "");
    const values = await openInputDialog({
      title: currentInterviewerId ? "Change Interviewer" : "Assign Interviewer",
      description: "Select the human interviewer who will run this scheduled round.",
      confirmText: "Assign",
      fields: [
        {
          name: "interviewerUserId",
          type: "select",
          label: "Interviewer",
          required: true,
          defaultValue: currentInterviewerId || availableInterviewers[0]?.user?._id || "",
          options: availableInterviewers.map((item) => ({
            value: item.user._id,
            label: `${item.user.name || "Interviewer"} (${item.user.email || item.interviewerCode})`
          }))
        }
      ]
    });

    if (!values?.interviewerUserId) return;

    await runAction(
      () =>
        API.put(`/application/${app._id}/interviewer/assign`, {
          interviewerUserId: values.interviewerUserId
        }),
      "Interviewer assigned"
    );
  };

  const unassignInterviewer = async (app) => {
    await runAction(
      () => API.put(`/application/${app._id}/interviewer/unassign`),
      "Interviewer unassigned"
    );
  };

  const selectCandidate = (id) => runAction(() => API.put(`/application/${id}/select`), "Candidate selected");

  const generateOffer = async (id) => {
    const values = await openInputDialog({
      title: "Generate Offer",
      confirmText: "Generate",
      fields: [
        { name: "salary", label: "Salary", placeholder: "e.g. 6 LPA", required: true },
        { name: "joiningDate", type: "date", label: "Joining Date", required: true },
        { name: "location", type: "location", label: "Location", placeholder: "City / Office", required: true },
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

  const downloadOfferLetter = async (id) => {
    if (downloadingOfferId) return;

    try {
      setDownloadingOfferId(id);
      const response = await API.get(`/application/${id}/offer/download`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `offer-${id.slice(-6)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to download offer letter");
    } finally {
      setDownloadingOfferId("");
    }
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
      <div className="space-y-5 sm:space-y-8">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 sm:rounded-3xl sm:p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Application Pipeline</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Filter candidates by job and progress them through each hiring stage.</p>

        <div className="mt-4 grid max-w-3xl grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search + Select Job</label>
            <Autocomplete
              options={jobs}
              value={selectedJobOption}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              getOptionLabel={(option) => option?.companyName ? `${option.companyName} - ${option.title}` : option?.title || ""}
              noOptionsText="No matching jobs"
              onChange={(_, value) => {
                const jobId = value?._id || "";
                setSelectedJobId(jobId);
                fetchApplications(jobId);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type job title or company to search"
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
          <span className="rounded-lg bg-slate-100 px-3 py-1.5">Interview Modes: Human or AI</span>
        </div>
      </div>

      {!selectedJobId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:rounded-3xl sm:p-8">
          Select a job to view candidate applications.
        </div>
      )}

      {selectedJobId && busy && (
        <ScreenLoader
          message="Loading applications..."
          subtext="Preparing candidate stages and interview actions."
          className="min-h-[22rem]"
        />
      )}

      {selectedJobId && !busy && applications.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:rounded-3xl sm:p-8">
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

          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
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
                              Interview: {new Date(app.interview.date).toLocaleString()} ({app.interview?.panelType === "HUMAN" ? "Human Panel" : "AI Panel"})
                            </p>
                          ) : null}
                          {status === "ASSESSMENT_PASSED" && openSlots > 0 ? (
                            <p className="mt-1 text-xs text-emerald-700">Open slots: {openSlots}</p>
                          ) : null}

                          {app?.aiInterview?.endedAt ? (
                            <FeatureGate feature="assessmentPanel" compact>
                            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-sm">AI Interview Report</p>
                                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                                  {String(app.aiInterview.status || "COMPLETED").replaceAll("_", " ")}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-lg bg-white/60 p-2 text-center border border-cyan-100/50">
                                  <p className="text-[10px] uppercase tracking-wide text-cyan-600/80 mb-0.5">Recommendation</p>
                                  <p className="font-semibold">{formatRecommendation(app.aiInterview.recommendation)}</p>
                                </div>
                                <div className="rounded-lg bg-white/60 p-2 text-center border border-cyan-100/50">
                                  <p className="text-[10px] uppercase tracking-wide text-cyan-600/80 mb-0.5">Avg Score</p>
                                  <p className="font-semibold">
                                    {(() => {
                                      const scores = [
                                        parseInt(app.aiInterview?.scores?.communication),
                                        parseInt(app.aiInterview?.scores?.technicalKnowledge),
                                        parseInt(app.aiInterview?.scores?.problemSolving),
                                        parseInt(app.aiInterview?.scores?.roleFit)
                                      ].filter(s => !isNaN(s));
                                      return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) + " / 5" : "N/A";
                                    })()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="contained" 
                                  size="small" 
                                  fullWidth
                                  onClick={() => setReportDialog({ open: true, app })}
                                  sx={{ textTransform: "none", bgcolor: "#0891b2", "&:hover": { bgcolor: "#0e7490" }, boxShadow: "none" }}
                                >
                                  View Full Report
                                </Button>
                              </div>
                            </div>
                            </FeatureGate>
                          ) : null}

                          {status === "INTERVIEW_SCHEDULED" && (app?.aiInterview?.endedAt || app?.interviewSession?.endedAt) ? (
                            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
                              <p className="font-semibold">Interview ended</p>
                              <p className="mt-1">
                                If this round ended by mistake, use <span className="font-semibold">Reschedule</span> to reset the session and give the candidate a fresh interview time.
                              </p>
                            </div>
                          ) : null}

                          {status === "INTERVIEW_SCHEDULED" && app.interview?.panelType === "AI" ? (
                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
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
                                  TalentX will run this round through the in-app AI interviewer panel.
                                </p>
                              )}
                            </div>
                          ) : null}

                          {status === "INTERVIEW_SCHEDULED" && app.interview?.panelType === "HUMAN" ? (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                              <p className="font-semibold">Human Interview Panel</p>
                              <p className="mt-1">
                                Interviewer: {app.interviewerAssignment?.interviewerUserId?.name || "Not assigned yet"}
                              </p>
                              {app.interview?.mode === "Online" ? (
                                <p className="mt-1 break-all">
                                  Meeting link: {app.interview?.link || "Not provided"}
                                </p>
                              ) : (
                                <p className="mt-1">Venue: {app.interview?.link || "Not provided"}</p>
                              )}
                              <p className="mt-1 text-emerald-700">
                                Student and interviewer join the same TalentX virtual room for this application.
                              </p>
                            </div>
                          ) : null}

                          {app?.interviewerFeedback?.submittedAt ? (
                            <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900">
                              <p className="font-semibold">Interviewer Feedback</p>
                              <p className="mt-1">Recommendation: {formatRecommendation(app.interviewerFeedback.recommendation)}</p>
                              <p className="mt-1">
                                Ratings: Communication {app.interviewerFeedback.ratings?.communication || "-"},
                                Technical {app.interviewerFeedback.ratings?.technical || "-"},
                                Problem Solving {app.interviewerFeedback.ratings?.problemSolving || "-"},
                                Culture Fit {app.interviewerFeedback.ratings?.cultureFit || "-"}
                              </p>
                              {app.interviewerFeedback.notes ? (
                                <p className="mt-1 whitespace-pre-wrap">{app.interviewerFeedback.notes}</p>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {app.resumeUrl ? (
                              <ProtectedUploadLink
                                uploadPath={app.resumeUrl}
                                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <DescriptionIcon sx={{ fontSize: 14 }} />
                                  Resume
                                </span>
                              </ProtectedUploadLink>
                            ) : null}

                            {status === "APPLIED" ? (
                              <>
                                <ActionButton label="Shortlist" tone="blue" onClick={() => shortlist(app._id)} />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "SHORTLISTED" ? (
                              <>
                                <FeatureGate feature="assessmentPanel" compact>
                                <ActionButton
                                  label={assessmentSentMap[app._id] ? "Assessment Sent" : "Send Assessment"}
                                  tone="indigo"
                                  onClick={() => sendAssessment(app._id)}
                                  disabled={Boolean(assessmentSentMap[app._id] || assessmentSendingMap[app._id])}
                                />
                                </FeatureGate>
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "ASSESSMENT_SENT" ? (
                              <FeatureGate feature="assessmentPanel" compact>
                                <ActionButton label="Mark Passed" tone="green" onClick={() => markAssessmentResult(app._id, true)} />
                                <ActionButton label="Mark Failed" tone="red" onClick={() => markAssessmentResult(app._id, false)} />
                              </FeatureGate>
                            ) : null}

                            {status === "ASSESSMENT_PASSED" ? (
                              <>
                                <ActionButton label="Publish Slots" tone="amber" onClick={() => openSlotDialog(app._id)} />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "INTERVIEW_SCHEDULED" ? (
                              <>
                                {app.interview?.panelType === "HUMAN" ? (
                                  <>
                                    <ActionButton
                                      label={app.interviewerAssignment?.interviewerUserId ? "Change Interviewer" : "Assign Interviewer"}
                                      tone="indigo"
                                      onClick={() => assignInterviewer(app)}
                                      disabled={Boolean(app?.interviewerFeedback?.submittedAt)}
                                    />
                                    {app.interviewerAssignment?.interviewerUserId && !app?.interviewerFeedback?.submittedAt ? (
                                      <ActionButton label="Unassign Interviewer" tone="red" onClick={() => unassignInterviewer(app)} />
                                    ) : null}
                                  </>
                                ) : null}
                                <ActionButton label="Reschedule" tone="amber" onClick={() => rescheduleInterview(app)} />
                                <ActionButton label="Select" tone="green" onClick={() => selectCandidate(app._id)} />
                                <ActionButton label="Reject" tone="red" onClick={() => reject(app._id)} />
                              </>
                            ) : null}

                            {status === "SELECTED" && !app.offer?.pdfPath ? (
                              <FeatureGate feature="offerGeneration" compact>
                              <ActionButton label="Generate Offer" tone="indigo" onClick={() => generateOffer(app._id)} />
                              </FeatureGate>
                            ) : null}

                            {status === "SELECTED" && app.offer?.pdfPath ? (
                              <button
                                type="button"
                                onClick={() => downloadOfferLetter(app._id)}
                                disabled={downloadingOfferId === app._id}
                                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <DescriptionIcon sx={{ fontSize: 14 }} />
                                  {downloadingOfferId === app._id ? "Downloading..." : "Offer"}
                                </span>
                              </button>
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
          {inputDialog.fields.map((field, index) => {
            if (field.type === "location") {
              return (
                <LocationAutocompleteField
                  key={field.name}
                  field={field}
                  autoFocus={index === 0}
                  value={inputValues[field.name] || ""}
                  onChange={(val) =>
                    setInputValues((prev) => ({
                      ...prev,
                      [field.name]: val,
                    }))
                  }
                />
              );
            }

            return (
              <TextField
                key={field.name}
                autoFocus={index === 0}
                select={field.type === "select"}
                type={field.type !== "select" ? (field.type || "text") : undefined}
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
                InputLabelProps={(field.type === "datetime-local" || field.type === "date" || field.type === "time") ? { shrink: true } : undefined}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "#ffffff",
                  },
                }}
              >
                {field.type === "select"
                  ? field.options?.map((option) => {
                      const value = typeof option === "object" ? option.value : option;
                      const label = typeof option === "object" ? option.label : option;
                      return (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                      );
                    })
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
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a", pb: 0.5 }}>
          Publish Interview Slots — {slotDialog.panelType === "HUMAN" ? "Human Panel" : "AI Panel"}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <DialogContentText sx={{ color: "#475569", fontSize: "0.86rem" }}>
            {slotDialog.panelType === "HUMAN"
              ? "Share interview time options for a human panel. Students will book one slot. Assign an interviewer after the student books."
              : "Share AI interview time options. Students will book one slot and complete the round inside the TalentX AI panel."}
          </DialogContentText>

          {/* Panel type selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSlotDialog((prev) => ({ ...prev, panelType: "AI" }))}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                slotDialog.panelType === "AI"
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              AI Panel
            </button>
            <button
              type="button"
              onClick={() => setSlotDialog((prev) => ({ ...prev, panelType: "HUMAN" }))}
              className={`rounded-lg border px-4 py-2 text-xs font-semibold transition ${
                slotDialog.panelType === "HUMAN"
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Human Panel
            </button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Basic scheduling is available on Starter. Advanced AI interview configuration unlocks on Recruiter Pro.
          </div>

          {slotDialog.panelType === "AI" ? (
          <FeatureGate feature="assessmentPanel" compact>
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
          </FeatureGate>
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
                    disabled
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff", opacity: 0.8 } }}
                  />
                  <TextField
                    select={slotDialog.panelType === "HUMAN"}
                    label="Mode"
                    value={slot.mode}
                    onChange={(e) => slotDialog.panelType === "HUMAN" && updateSlotField(index, "mode", e.target.value)}
                    size="small"
                    fullWidth
                    disabled={slotDialog.panelType === "AI"}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "#ffffff" } }}
                  >
                    {slotDialog.panelType === "HUMAN" ? (
                      <>
                        <MenuItem value="Online">Online</MenuItem>
                        <MenuItem value="Offline">Offline</MenuItem>
                      </>
                    ) : null}
                  </TextField>
                  <TextField
                    label={
                      slotDialog.panelType === "HUMAN" && slot.mode === "Offline"
                        ? "Venue / Address"
                        : slotDialog.panelType === "HUMAN"
                        ? "Meeting Link (required)"
                        : "Optional Backup Link"
                    }
                    value={slot.link}
                    onChange={(e) => updateSlotField(index, "link", e.target.value)}
                    placeholder={
                      slotDialog.panelType === "HUMAN" && slot.mode === "Offline"
                        ? "Office / Campus location"
                        : "https://meet.google.com/..."
                    }
                    required={slotDialog.panelType === "HUMAN" && slot.mode === "Online"}
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

      <Dialog
        open={reportDialog.open}
        onClose={() => setReportDialog({ open: false, app: null })}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid #e2e8f0",
            boxShadow: "0 24px 45px rgba(15, 23, 42, 0.25)",
            background: "#ffffff",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a", pb: 1, borderBottom: "1px solid #f1f5f9" }}>
          <div className="flex items-center justify-between">
            <span>AI Interview Report</span>
            {reportDialog.app?.aiInterview?.status && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
                {String(reportDialog.app.aiInterview.status).replaceAll("_", " ")}
              </span>
            )}
          </div>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {reportDialog.app?.aiInterview && (
            <div className="p-5 space-y-6">
              {/* Top Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Recommendation</h4>
                  <p className="text-xl font-bold text-indigo-900">{formatRecommendation(reportDialog.app.aiInterview.recommendation) || "N/A"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Scores</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-600">Communication</span>
                      <span className="font-semibold text-slate-900">{reportDialog.app.aiInterview.scores?.communication || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-600">Technical</span>
                      <span className="font-semibold text-slate-900">{reportDialog.app.aiInterview.scores?.technicalKnowledge || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-600">Problem Solving</span>
                      <span className="font-semibold text-slate-900">{reportDialog.app.aiInterview.scores?.problemSolving || "-"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-600">Role Fit</span>
                      <span className="font-semibold text-slate-900">{reportDialog.app.aiInterview.scores?.roleFit || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summaries */}
              <div className="space-y-4">
                {reportDialog.app.aiInterview.summary && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Summary</h4>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {reportDialog.app.aiInterview.summary}
                    </div>
                  </div>
                )}
                {reportDialog.app.aiInterview.finalReport && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Final Report</h4>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {reportDialog.app.aiInterview.finalReport}
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript */}
              {Array.isArray(reportDialog.app.aiInterview.transcript) && reportDialog.app.aiInterview.transcript.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3">Transcript</h4>
                  <div className="space-y-3">
                    {reportDialog.app.aiInterview.transcript.map((t, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="font-semibold text-slate-900 text-sm mb-2 pb-2 border-b border-slate-100">
                          <span className="text-indigo-500 mr-2">Q{idx + 1}:</span> {t.question}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          <span className="font-semibold text-slate-400 mr-2">A:</span> {t.answer || "(No answer provided)"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #f1f5f9" }}>
          <Button
            onClick={() => setReportDialog({ open: false, app: null })}
            variant="outlined"
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Close
          </Button>
          <Button
            onClick={() => handleDownloadPDF(reportDialog.app)}
            variant="contained"
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#0f172a", "&:hover": { bgcolor: "#1e293b" } }}
          >
            Download PDF
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
    "Reschedule": EventIcon,
    "Assign Interviewer": AssignmentIcon,
    "Change Interviewer": AssignmentIcon,
    "Unassign Interviewer": DeleteOutlineIcon,
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

function formatRecommendation(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.replaceAll("_", " ") : "Pending";
}

function LocationAutocompleteField({ field, value, onChange, autoFocus }) {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (inputValue === "") {
      setOptions(value ? [value] : []);
      return undefined;
    }

    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GEOAPIFY_API_KEY is missing. Please add it to the frontend .env file!");
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(inputValue)}&apiKey=${apiKey}`);
        const data = await res.json();
        if (active && data.features) {
          const newOptions = data.features.map((feature) => feature.properties.formatted);
          setOptions([...new Set(newOptions)].filter(Boolean));
        }
      } catch (err) {
        console.error("Geoapify search failed:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [inputValue, value]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      value={value}
      onChange={(event, newValue) => {
        onChange(newValue || "");
      }}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
        onChange(newInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          label={field.label}
          placeholder={field.placeholder || ""}
          required={Boolean(field.required)}
          size="small"
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "#ffffff",
            },
          }}
        />
      )}
    />
  );
}

function TranscriptPreview({ appId, transcript }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 2;
  const entries = expanded ? transcript : transcript.slice(0, PREVIEW_COUNT);
  const hasMore = transcript.length > PREVIEW_COUNT;

  return (
    <div className="mt-2 rounded-lg border border-cyan-100 bg-white/80 p-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-cyan-900">
          Transcript {expanded ? `(${transcript.length} entries)` : "Preview"}
        </p>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-md bg-cyan-100 px-2 py-1 text-[10px] font-semibold text-cyan-800 transition hover:bg-cyan-200"
          >
            {expanded ? "Collapse" : `Show All (${transcript.length})`}
          </button>
        )}
      </div>
      {entries.map((entry) => (
        <div key={`${appId}-${entry.questionIndex}`} className="mt-1">
          <p className="font-medium">Q{entry.questionIndex + 1}: {entry.question || "Question"}</p>
          <p className="text-cyan-800">A: {entry.answer || "No answer captured"}</p>
        </div>
      ))}
    </div>
  );
}
