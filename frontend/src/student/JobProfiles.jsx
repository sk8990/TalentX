import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import FilterListIcon from "@mui/icons-material/FilterList";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { FormControl, MenuItem, Select } from "@mui/material";
import toast from "react-hot-toast";

export default function JobProfiles() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [student, setStudent] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("all");
  const [eligibilityFilter, setEligibilityFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [ctcFilter, setCtcFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [expandedJobId, setExpandedJobId] = useState(null);

  const showAlert = (severity, message) => {
    if (severity === "success") {
      toast.success(message);
      return;
    }
    if (severity === "warning") {
      toast(message, { icon: "!" });
      return;
    }
    toast.error(message);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const jobsRes = await API.get("/student/jobs?sort=deadline");

        let appliedRes = { data: [] };
        try {
          appliedRes = await API.get("/application/my");
        } catch (err) {
          console.error("Applications fetch failed:", err);
        }

        setJobs(jobsRes.data?.jobs || []);
        setStudent(jobsRes.data?.student || null);

        const appliedIds = Array.isArray(appliedRes.data)
          ? appliedRes.data.map((app) => app.jobId?._id || app.jobId)
          : [];

        setAppliedJobs([...new Set(appliedIds)]);
      } catch (err) {
        console.error("fetchAll error:", err);
        showAlert("error", err?.response?.data?.message || "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const allJobs = useMemo(
    () => jobs.filter((job) => !appliedJobs.includes(job._id)),
    [jobs, appliedJobs]
  );

  const appliedOnlyJobs = useMemo(
    () => jobs.filter((job) => appliedJobs.includes(job._id)),
    [jobs, appliedJobs]
  );

  const visibleJobs = activeSection === "all" ? allJobs : appliedOnlyJobs;

  const isEligible = (job) => {
    if (!student) return false;
    if (student.cgpa < job.minCgpa) return false;

    if (job.eligibleBranches.length > 0 && !job.eligibleBranches.includes(student.branch)) {
      return false;
    }

    return true;
  };

  const getIneligibilityReason = (job) => {
    if (!student) return "Student profile not loaded.";

    const reasons = [];

    if (student.cgpa < job.minCgpa) {
      reasons.push(`CGPA ${student.cgpa} is below minimum ${job.minCgpa}`);
    }

    if (job.eligibleBranches.length > 0 && !job.eligibleBranches.includes(student.branch)) {
      reasons.push(`Branch ${student.branch} is not in eligible branches`);
    }

    return reasons.join(". ");
  };

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    let results = visibleJobs.filter((job) => {
      const searchableText = [
        job.title,
        job.companyName,
        job.description,
        job.aboutCompany,
        ...(job.eligibleBranches || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchableText.includes(query)) {
        return false;
      }

      if (eligibilityFilter === "eligible" && !isEligible(job)) {
        return false;
      }

      if (eligibilityFilter === "notEligible" && isEligible(job)) {
        return false;
      }

      if (branchFilter !== "all") {
        const jobBranches = job.eligibleBranches || [];
        if (jobBranches.length > 0 && !jobBranches.includes(branchFilter)) {
          return false;
        }
      }

      const ctc = Number(job.ctc || 0);
      if (ctcFilter === "upto5" && ctc > 5) return false;
      if (ctcFilter === "5to10" && (ctc < 5 || ctc > 10)) return false;
      if (ctcFilter === "10plus" && ctc < 10) return false;

      return true;
    });

    if (sortBy === "ctcHigh") {
      results = [...results].sort((a, b) => Number(b.ctc || 0) - Number(a.ctc || 0));
    } else if (sortBy === "ctcLow") {
      results = [...results].sort((a, b) => Number(a.ctc || 0) - Number(b.ctc || 0));
    } else if (sortBy === "title") {
      results = [...results].sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    } else {
      results = [...results].sort(
        (a, b) => new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime()
      );
    }

    return results;
  }, [visibleJobs, search, eligibilityFilter, branchFilter, ctcFilter, sortBy, student]);

  const menuProps = {
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
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#e2e8f0",
      borderWidth: "1px",
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
      px: "12px",
      fontSize: "0.9rem",
      fontWeight: 600,
      color: "#1e293b",
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: "10px",
    },
    "& .MuiSelect-icon": {
      color: "#64748b",
      right: 10,
    },
  };

  const applyJob = async (jobId) => {
    if (!resume) {
      showAlert("warning", "Please upload your resume (PDF)");
      return;
    }

    if (applyingId) return;

    try {
      setApplyingId(jobId);

      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("resume", resume);

      await API.post("/application/apply", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAppliedJobs((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
      setSelectedJob(null);
      setResume(null);
      setActiveSection("applied");
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Apply failed");
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500">
        Loading jobs...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-white p-10 text-center text-sm font-medium text-rose-600">
        Student profile not loaded. Please login again.
      </div>
    );
  }

  const isProfileComplete = student.branch && student.year && student.cgpa > 0;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">Job Profiles</h1>
        <p className="mt-2 text-sm text-indigo-100">Discover roles that match your branch and CGPA.</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search Jobs</label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 px-3">
          <SearchIcon sx={{ fontSize: 18 }} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search by role or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-3 text-sm text-slate-800 outline-none"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="group rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <p className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition group-hover:text-indigo-600">
              <FilterListIcon sx={{ fontSize: 14 }} />
              Eligibility
            </p>
            <FormControl fullWidth size="small">
              <Select
                value={eligibilityFilter}
                onChange={(e) => setEligibilityFilter(e.target.value)}
                IconComponent={KeyboardArrowDownRoundedIcon}
                MenuProps={menuProps}
                sx={selectSx}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="eligible">Eligible</MenuItem>
                <MenuItem value="notEligible">Not Eligible</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition group-hover:text-indigo-600">Branch</p>
            <FormControl fullWidth size="small">
              <Select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                IconComponent={KeyboardArrowDownRoundedIcon}
                MenuProps={menuProps}
                sx={selectSx}
              >
                <MenuItem value="all">All Branches</MenuItem>
                <MenuItem value="CS">CS</MenuItem>
                <MenuItem value="IT">IT</MenuItem>
                <MenuItem value="ENTC">ENTC</MenuItem>
                <MenuItem value="MECH">MECH</MenuItem>
                <MenuItem value="CIVIL">CIVIL</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition group-hover:text-indigo-600">CTC</p>
            <FormControl fullWidth size="small">
              <Select
                value={ctcFilter}
                onChange={(e) => setCtcFilter(e.target.value)}
                IconComponent={KeyboardArrowDownRoundedIcon}
                MenuProps={menuProps}
                sx={selectSx}
              >
                <MenuItem value="all">All Ranges</MenuItem>
                <MenuItem value="upto5">Up to 5 LPA</MenuItem>
                <MenuItem value="5to10">5 to 10 LPA</MenuItem>
                <MenuItem value="10plus">10+ LPA</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition group-hover:text-indigo-600">Sort</p>
            <FormControl fullWidth size="small">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                IconComponent={KeyboardArrowDownRoundedIcon}
                MenuProps={menuProps}
                sx={selectSx}
              >
                <MenuItem value="deadline">Deadline (Soonest)</MenuItem>
                <MenuItem value="ctcHigh">CTC (High to Low)</MenuItem>
                <MenuItem value="ctcLow">CTC (Low to High)</MenuItem>
                <MenuItem value="title">Title (A-Z)</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveSection("all")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeSection === "all"
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            All Jobs ({allJobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("applied")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeSection === "applied"
                ? "bg-emerald-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Applied Jobs ({appliedOnlyJobs.length})
          </button>
        </div>
      </section>

      {filteredJobs.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {activeSection === "all" ? "No jobs match your filters." : "No applied jobs match your filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
          {filteredJobs.map((job) => {
            const eligible = isEligible(job);
            const alreadyApplied = appliedJobs.includes(job._id);
            const isExpanded = expandedJobId === job._id;

            return (
              <article
                key={job._id}
                onClick={() => setExpandedJobId((prev) => (prev === job._id ? null : job._id))}
                className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={job.companyLogo || "/default-company-logo.png"}
                      alt={job.companyName || "Company"}
                      className="w-10 h-10 object-contain rounded"
                      onError={(e) => {
                        e.target.src = "/default-company-logo.png";
                      }}
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{job.companyName || "Unknown company"}</p>
                    </div>
                  </div>
                  {alreadyApplied && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Applied</span>
                  )}
                </div>

                <p
                  className="mt-3 text-sm text-slate-600"
                  style={
                    isExpanded
                      ? undefined
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }
                  }
                >
                  {job.description || "No description provided."}
                </p>
                <p className="mt-2 text-xs font-medium text-indigo-600">
                  {isExpanded ? "Click card to collapse" : "Click card to read more"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600">
                    <span className="block font-semibold text-slate-800">Min CGPA</span>
                    {job.minCgpa}
                  </div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600">
                    <span className="block font-semibold text-slate-800">CTC</span>
                    {job.ctc || "N/A"} LPA
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Branches: {job.eligibleBranches.length > 0 ? job.eligibleBranches.join(", ") : "All"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : "N/A"}
                </p>
                {isExpanded && (
                  <p className="mt-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">About Company:</span>{" "}
                    {job.aboutCompany || "Not provided."}
                  </p>
                )}

                <div className="mt-5" onClick={(e) => e.stopPropagation()}>
                  {!isProfileComplete ? (
                    <button
                      onClick={() => navigate("/student/profile")}
                      className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Complete Profile
                    </button>
                  ) : alreadyApplied ? (
                    <button disabled className="w-full cursor-not-allowed rounded-xl bg-emerald-100 py-2.5 text-sm font-semibold text-emerald-700">
                      Applied
                    </button>
                  ) : eligible ? (
                    <button
                      onClick={() => setSelectedJob(job)}
                      disabled={applyingId === job._id}
                      className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {applyingId === job._id ? "Applying..." : "Apply Now"}
                    </button>
                  ) : (
                    <div>
                      <button disabled className="w-full cursor-not-allowed rounded-xl bg-rose-100 py-2.5 text-sm font-semibold text-rose-700">
                        Not Eligible
                      </button>
                      <p className="mt-2 text-xs font-medium text-rose-700">
                        {getIneligibilityReason(job)}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{selectedJob.companyName}</p>

            <div className="mt-5 max-h-64 space-y-3 overflow-y-auto pr-2 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Description:</span> {selectedJob.description}</p>
              <p><span className="font-semibold text-slate-900">CTC:</span> {selectedJob.ctc} LPA</p>
              <p><span className="font-semibold text-slate-900">Eligibility:</span> {selectedJob.eligibilityText || "N/A"}</p>
              <p><span className="font-semibold text-slate-900">About Company:</span> {selectedJob.aboutCompany || "N/A"}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Resume (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setResume(e.target.files[0])}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
              />
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                <UploadFileIcon sx={{ fontSize: 14 }} />
                Upload latest PDF resume.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setResume(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <span className="inline-flex items-center gap-1">
                  <CloseIcon sx={{ fontSize: 16 }} />
                  Close
                </span>
              </button>
              <button
                onClick={() => applyJob(selectedJob._id)}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <span className="inline-flex items-center gap-1">
                  <SendIcon sx={{ fontSize: 16 }} />
                  Apply
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
