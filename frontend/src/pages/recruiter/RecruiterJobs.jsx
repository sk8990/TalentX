import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SaveIcon from "@mui/icons-material/Save";
import PeopleIcon from "@mui/icons-material/People";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { FormControl, MenuItem, Select } from "@mui/material";
import toast from "react-hot-toast";
import { useConfirmDialog } from "../../components/useConfirmDialog";

const initialForm = {
  companyName: "",
  companyDomain: "",
  companyLogo: "",
  title: "",
  description: "",
  ctc: "",
  aboutCompany: "",
  minCgpa: "",
  eligibleBranches: [],
  eligibilityText: "",
  deadline: "",
  isActive: true,
};

const branchOptions = ["CS", "IT", "ENTC", "MECH", "CIVIL"];

export default function RecruiterJobs() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("other");
  const [selectedJob, setSelectedJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [jdUploadName, setJdUploadName] = useState("");
  const [jdInputKey, setJdInputKey] = useState(0);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isParsingJd, setIsParsingJd] = useState(false);
  const [jobSearch, setJobSearch] = useState("");
  const [jobCompanyFilter, setJobCompanyFilter] = useState("all");
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();
  const jobFormRef = useRef(null);

  const [formData, setFormData] = useState(initialForm);

  const totalApplicants = useMemo(
    () => jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0),
    [jobs]
  );

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = useCallback(() => {
    setFormData(initialForm);
    setSelectedCompany("other");
    setSelectedJob(null);
    setJdUploadName("");
    setJdInputKey((prev) => prev + 1);
  }, []);

  const showAlert = useCallback((severity, message) => {
    if (severity === "success") {
      toast.success(message);
      return;
    }
    if (severity === "warning") {
      toast(message, { icon: "!" });
      return;
    }
    toast.error(message);
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await API.get("/company/recruiter/jobs");
      setJobs(res.data || []);
    } catch {
      showAlert("error", "Failed to fetch jobs");
    }
  }, [showAlert]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await API.get("/company/list");
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCompanies([]);
      showAlert("error", "Failed to fetch company list");
    }
  }, [showAlert]);

  useEffect(() => {
    fetchJobs();
    fetchCompanies();
  }, [fetchCompanies, fetchJobs]);

  useEffect(() => {
    if (!selectedJob || !jobFormRef.current) {
      return;
    }

    jobFormRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedJob]);

  const generateAI = async () => {
    if (!formData.title.trim()) {
      showAlert("warning", "Add a job title first");
      return;
    }

    try {
      setIsGeneratingDescription(true);
      const res = await API.post("/company/job/generate-description", {
        title: formData.title,
        experience: "Fresher / 0-2 Years",
        skills: formData.eligibleBranches.join(", "),
      });

      setField("description", res.data?.description || "");
      showAlert("success", "Description generated");
    } catch (err) {
      showAlert("error", err.response?.data?.message || "AI generation failed");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const applyParsedJobData = useCallback(
    (parsed) => {
      const parsedCompanyName = String(parsed?.companyName || "").trim();
      const parsedCompanyDomain = String(parsed?.companyDomain || "").trim();
      const matchedCompany = parsedCompanyName
        ? companies.find(
            (company) => String(company.name || "").trim().toLowerCase() === parsedCompanyName.toLowerCase()
          )
        : null;

      if (matchedCompany) {
        setSelectedCompany(matchedCompany.name);
      } else if (parsedCompanyName || parsedCompanyDomain) {
        setSelectedCompany("other");
      }

      setFormData((prev) => {
        const next = { ...prev };
        const assignText = (field, value) => {
          const normalized = String(value || "").trim();
          if (normalized) {
            next[field] = normalized;
          }
        };
        const assignNumber = (field, value) => {
          if (value === null || value === undefined || value === "") {
            return;
          }

          const normalized = Number(value);
          if (Number.isFinite(normalized)) {
            next[field] = String(normalized);
          }
        };

        assignText("title", parsed?.title);
        assignText("description", parsed?.description);
        assignText("aboutCompany", parsed?.aboutCompany);
        assignNumber("ctc", parsed?.ctc);
        assignNumber("minCgpa", parsed?.minCgpa);
        assignText("eligibilityText", parsed?.eligibilityText);
        assignText("deadline", parsed?.deadline);

        if (Array.isArray(parsed?.eligibleBranches) && parsed.eligibleBranches.length) {
          next.eligibleBranches = [...new Set(parsed.eligibleBranches.filter((branch) => branchOptions.includes(branch)))];
        }

        if (matchedCompany) {
          next.companyName = matchedCompany.name || next.companyName;
          next.companyDomain = matchedCompany.domain || next.companyDomain;
          next.companyLogo = matchedCompany.logo || next.companyLogo;
        } else {
          assignText("companyName", parsedCompanyName);
          assignText("companyDomain", parsedCompanyDomain);
          if (parsedCompanyDomain) {
            next.companyLogo = `https://img.logo.dev/${parsedCompanyDomain}`;
          }
        }

        return next;
      });
    },
    [companies]
  );

  const handleJdFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      return;
    }

    const formPayload = new FormData();
    formPayload.append("jd", file);

    try {
      setIsParsingJd(true);
      const res = await API.post("/company/job/parse-jd-upload", formPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      applyParsedJobData(res.data?.parsed || {});
      setJdUploadName(res.data?.uploadedFileName || file.name || "");
      showAlert("success", "JD uploaded, parsed, and form auto-filled");
    } catch (err) {
      setJdUploadName("");
      showAlert("error", err.response?.data?.message || "AI JD parsing failed");
    } finally {
      setIsParsingJd(false);
      setJdInputKey((prev) => prev + 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const chosenCompany = companies.find((c) => c.name === selectedCompany);
    const finalCompanyName =
      selectedCompany === "other"
        ? formData.companyName.trim()
        : chosenCompany?.name || "";
    const finalCompanyLogo =
      selectedCompany === "other"
        ? formData.companyLogo.trim()
        : chosenCompany?.logo || "";
    const finalCompanyDomain =
      selectedCompany === "other"
        ? formData.companyDomain.trim()
        : chosenCompany?.domain || "";

    const payload = {
      companyName: finalCompanyName,
      companyDomain: finalCompanyDomain,
      companyLogo: finalCompanyLogo,
      title: formData.title.trim(),
      description: formData.description.trim(),
      ctc: Number(formData.ctc),
      aboutCompany: formData.aboutCompany.trim(),
      minCgpa: Number(formData.minCgpa),
      eligibleBranches: formData.eligibleBranches,
      eligibilityText: formData.eligibilityText.trim(),
      deadline: formData.deadline,
      isActive: formData.isActive,
    };

    if (!payload.eligibleBranches.length) {
      showAlert("warning", "Select at least one eligible branch");
      return;
    }

    if (!payload.companyName) {
      showAlert("warning", "Company name is required");
      return;
    }

    if (Number.isNaN(payload.ctc) || payload.ctc <= 0) {
      showAlert("warning", "Enter a valid CTC");
      return;
    }

    if (Number.isNaN(payload.minCgpa) || payload.minCgpa < 0 || payload.minCgpa > 10) {
      showAlert("warning", "Minimum CGPA must be between 0 and 10");
      return;
    }

    try {
      setBusy(true);
      if (selectedJob) {
        await API.put(`/company/job/${selectedJob._id}`, payload);
        showAlert("success", "Job updated");
      } else {
        await API.post("/company/job", payload);
        showAlert("success", "Job posted");
      }

      resetForm();
      fetchJobs();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteJob = async (id) => {
    const shouldDelete = await confirm({
      title: "Delete Job",
      message: "Do you want to delete this job posting? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!shouldDelete) return;

    try {
      setBusy(true);
      await API.delete(`/company/job/${id}`);
      showAlert("success", "Job deleted");
      if (selectedJob?._id === id) {
        resetForm();
      }
      fetchJobs();
    } catch {
      showAlert("error", "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const editJob = (job) => {
    const matchedCompany = companies.find((c) => c.name === (job.companyName || ""));
    setSelectedJob(job);
    setJdUploadName("");
    setJdInputKey((prev) => prev + 1);
    setFormData({
      companyName: job.companyName || "",
      companyDomain: job.companyDomain || "",
      companyLogo: job.companyLogo || "",
      title: job.title || "",
      description: job.description || "",
      ctc: job.ctc ?? "",
      aboutCompany: job.aboutCompany || "",
      minCgpa: job.minCgpa || "",
      eligibleBranches: job.eligibleBranches || [],
      eligibilityText: job.eligibilityText || "",
      deadline: job.deadline?.split("T")[0] || "",
      isActive: typeof job.isActive === "boolean" ? job.isActive : true,
    });
    setSelectedCompany(matchedCompany ? matchedCompany.name : "other");
  };

  const toggleBranch = (branch) => {
    setFormData((prev) => {
      const hasBranch = prev.eligibleBranches.includes(branch);
      return {
        ...prev,
        eligibleBranches: hasBranch
          ? prev.eligibleBranches.filter((b) => b !== branch)
          : [...prev.eligibleBranches, branch],
      };
    });
  };

  const viewApplications = (jobId) => {
    navigate(`/recruiter/applications?jobId=${jobId}`);
  };

  const isActionBusy = busy || isGeneratingDescription || isParsingJd;

  const companyFilterOptions = useMemo(
    () =>
      [...new Set(jobs.map((job) => String(job.companyName || "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [jobs]
  );

  const filteredRecruiterJobs = useMemo(() => {
    const normalizedSearch = jobSearch.trim().toLowerCase();

    return jobs.filter((job) => {
      const companyName = String(job.companyName || "").trim();
      const title = String(job.title || "").trim();

      if (jobCompanyFilter !== "all" && companyName !== jobCompanyFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [title, companyName, job.description, job.aboutCompany]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [jobs, jobCompanyFilter, jobSearch]);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  const dropdownMenuProps = {
    PaperProps: {
      sx: {
        mt: 1,
        borderRadius: 2,
        border: "1px solid #dbe2ef",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.15)",
        "& .MuiMenuItem-root": {
          fontSize: "0.9rem",
          borderRadius: 1,
          mx: 0.5,
          my: 0.25,
          minHeight: 36,
        },
        "& .MuiMenuItem-root:hover": {
          backgroundColor: "#eef2ff",
        },
        "& .MuiMenuItem-root.Mui-selected": {
          backgroundColor: "#e0e7ff",
          color: "#3730a3",
          fontWeight: 700,
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          backgroundColor: "#c7d2fe",
        },
      },
    },
  };

  const selectSx = {
    mt: 1,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#cbd5e1",
      borderWidth: "1px",
      borderRadius: "0.75rem",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#a5b4fc",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#6366f1",
      borderWidth: "2px",
    },
    "& .MuiSelect-select": {
      py: "10px",
      px: "16px",
      fontSize: "0.875rem",
      fontWeight: 500,
      color: "#0f172a",
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: "0.75rem",
    },
    "& .MuiSelect-icon": {
      color: "#64748b",
      right: 10,
    },
  };

  return (
    <>
      <div className="space-y-5 sm:space-y-8">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 sm:rounded-3xl sm:p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Manage Jobs</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Create new openings, edit active roles, and review candidates.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OverviewCard label="Total Jobs" value={jobs.length} />
          <OverviewCard label="Applicants (listed jobs)" value={totalApplicants} />
          <OverviewCard label="Form Mode" value={selectedJob ? "Editing" : "Creating"} />
        </div>
      </div>

      <div ref={jobFormRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-900">{selectedJob ? "Edit Job" : "Post New Job"}</h3>
          {selectedJob && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Upload JD On Top</label>
                  <p className="mt-1 text-sm text-emerald-900">
                    Upload the JD PDF and TalentX will parse it with AI to auto-fill the job form.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  PDF only
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  key={jdInputKey}
                  type="file"
                  accept="application/pdf"
                  onChange={handleJdFileChange}
                  disabled={isActionBusy}
                  className="block w-full max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-emerald-700 hover:file:bg-emerald-200 disabled:opacity-60"
                />
                <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <UploadFileIcon sx={{ fontSize: 18 }} />
                  {isParsingJd ? "Parsing uploaded JD..." : jdUploadName || "Choose a JD PDF to auto-fill the form"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select Company</label>
            <FormControl fullWidth size="small">
              <Select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                IconComponent={KeyboardArrowDownIcon}
                MenuProps={dropdownMenuProps}
                sx={selectSx}
              >
                <MenuItem value="other">Other</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c._id || c.name} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {selectedCompany === "other" ? (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Name</label>
                <input
                  placeholder="TalentX Pvt Ltd"
                  className={inputClass}
                  value={formData.companyName}
                  onChange={(e) => setField("companyName", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Logo Path</label>
                <input
                  placeholder="/logos/company.png"
                  className={inputClass}
                  value={formData.companyLogo}
                  onChange={(e) => setField("companyLogo", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Domain</label>
                <input
                  placeholder="example.com"
                  className={inputClass}
                  value={formData.companyDomain}
                  onChange={(e) => setField("companyDomain", e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company Logo</label>
              <div className="mt-1 flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5">
                <img
                  src={
                    companies.find((c) => c.name === selectedCompany)?.logo ||
                    (companies.find((c) => c.name === selectedCompany)?.domain
                      ? `https://img.logo.dev/${companies.find((c) => c.name === selectedCompany)?.domain}`
                      : "/default-company-logo.png")
                  }
                  alt={selectedCompany}
                  className="h-8 w-8 rounded object-contain bg-white p-1"
                  onError={(e) => {
                    e.currentTarget.src = "/default-company-logo.png";
                  }}
                />
                <span className="text-sm font-medium text-slate-700">
                  {companies.find((c) => c.name === selectedCompany)?.domain || "Logo not configured"}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job Title</label>
            <input
              placeholder="Software Engineer"
              className={inputClass}
              value={formData.title}
              onChange={(e) => setField("title", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum CGPA</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="7.0"
              className={inputClass}
              value={formData.minCgpa}
              onChange={(e) => setField("minCgpa", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">CTC (LPA)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="6.5"
              className={inputClass}
              value={formData.ctc}
              onChange={(e) => setField("ctc", e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">About Company</label>
            <textarea
              rows={3}
              placeholder="Brief company overview shown to students"
              className={inputClass}
              value={formData.aboutCompany}
              onChange={(e) => setField("aboutCompany", e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eligible Branches</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {branchOptions.map((branch) => {
                const selected = formData.eligibleBranches.includes(branch);
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => toggleBranch(branch)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {branch}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eligibility Text (Optional)</label>
            <input
              placeholder="No active backlogs, strong DSA fundamentals"
              className={inputClass}
              value={formData.eligibilityText}
              onChange={(e) => setField("eligibilityText", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline</label>
            <input
              type="date"
              className={inputClass}
              value={formData.deadline}
              onChange={(e) => setField("deadline", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <FormControl fullWidth size="small">
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onChange={(e) => setField("isActive", e.target.value === "active")}
                IconComponent={KeyboardArrowDownIcon}
                MenuProps={dropdownMenuProps}
                sx={selectSx}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</label>
            <textarea
              rows={5}
              placeholder="Role overview, responsibilities, and required skills"
              className={inputClass}
              value={formData.description}
              onChange={(e) => setField("description", e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generateAI}
              disabled={isActionBusy}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1">
                <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                {isGeneratingDescription ? "Generating..." : "Generate Description with AI"}
              </span>
            </button>

            <button
              type="submit"
              disabled={isActionBusy}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1">
                <SaveIcon sx={{ fontSize: 16 }} />
                {selectedJob ? "Update Job" : "Post Job"}
              </span>
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">Your Jobs</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Search your postings and filter them company-wise.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {filteredRecruiterJobs.length} of {jobs.length} jobs
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-[minmax(0,1fr)_240px] md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Jobs</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
              <SearchIcon sx={{ fontSize: 18 }} className="text-slate-500" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search by title or company"
                className="w-full py-3 text-sm text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter By Company</label>
            <FormControl fullWidth size="small">
              <Select
                value={jobCompanyFilter}
                onChange={(e) => setJobCompanyFilter(e.target.value)}
                IconComponent={KeyboardArrowDownIcon}
                MenuProps={dropdownMenuProps}
                sx={selectSx}
              >
                <MenuItem value="all">All Companies</MenuItem>
                {companyFilterOptions.map((companyName) => (
                  <MenuItem key={companyName} value={companyName}>
                    {companyName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {!jobs.length && <p className="mt-4 text-sm text-slate-500">No jobs posted yet.</p>}
        {!!jobs.length && !filteredRecruiterJobs.length && (
          <p className="mt-4 text-sm text-slate-500">No jobs match your current search or company filter.</p>
        )}

        <div className="mt-5 space-y-4">
          {filteredRecruiterJobs.map((job) => (
            <article
              key={job._id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{job.title}</h4>
                  <p className="mt-1 text-sm font-medium text-slate-700">{job.companyName || "Unknown company"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : "N/A"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">CTC: {job.ctc ?? "N/A"} LPA</p>
                  <p className="mt-1 text-xs text-slate-500">Status: {job.isActive ? "Active" : "Inactive"}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => viewApplications(job._id)}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      <PeopleIcon sx={{ fontSize: 14 }} />
                      View Applicants
                    </span>
                  </button>

                  <button
                    onClick={() => editJob(job)}
                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                  >
                    <span className="inline-flex items-center gap-1">
                      <EditIcon sx={{ fontSize: 14 }} />
                      Edit
                    </span>
                  </button>

                  <button
                    onClick={() => deleteJob(job._id)}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      <DeleteIcon sx={{ fontSize: 14 }} />
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      </div>
      {confirmDialog}
    </>
  );
}

function OverviewCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50 sm:rounded-2xl sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100 sm:mt-3 sm:text-2xl">{value}</p>
    </div>
  );
}
