import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SaveIcon from "@mui/icons-material/Save";
import PeopleIcon from "@mui/icons-material/People";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [formData, setFormData] = useState(initialForm);

  const totalApplicants = useMemo(
    () => jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0),
    [jobs]
  );

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const generateAI = async () => {
    if (!formData.title.trim()) {
      showAlert("warning", "Add a job title first");
      return;
    }

    try {
      setBusy(true);
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
      setBusy(false);
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

      setFormData(initialForm);
      setSelectedCompany("other");
      setSelectedJob(null);
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
        setSelectedJob(null);
        setFormData(initialForm);
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
      <div className="space-y-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Manage Jobs</h2>
        <p className="mt-1 text-sm text-slate-500">Create new openings, edit active roles, and review candidates.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OverviewCard label="Total Jobs" value={jobs.length} />
          <OverviewCard label="Applicants (listed jobs)" value={totalApplicants} />
          <OverviewCard label="Form Mode" value={selectedJob ? "Editing" : "Creating"} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-900">{selectedJob ? "Edit Job" : "Post New Job"}</h3>
          {selectedJob && (
            <button
              type="button"
              onClick={() => {
                setSelectedJob(null);
                setFormData(initialForm);
                setSelectedCompany("other");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
              disabled={busy}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1">
                <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                Generate with AI
              </span>
            </button>

            <button
              type="submit"
              disabled={busy}
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

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-xl font-semibold text-slate-900">Your Jobs</h3>

        {!jobs.length && <p className="mt-4 text-sm text-slate-500">No jobs posted yet.</p>}

        <div className="mt-5 space-y-4">
          {jobs.map((job) => (
            <article
              key={job._id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{job.title}</h4>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
