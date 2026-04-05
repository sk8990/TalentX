import { useEffect, useMemo, useState } from "react";
import API, { getServerOrigin } from "../api/axios";
import toast from "react-hot-toast";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import GroupsIcon from "@mui/icons-material/Groups";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import TalentXBrand from "../components/TalentXBrand";
import { useConfirmDialog } from "../components/useConfirmDialog";
import { logout } from "../utils/logout";

const AUDIT_ACTION_OPTIONS = [
  "APPLICATION_STATUS_UPDATED",
  "ASSESSMENT_SENT",
  "ASSESSMENT_RESULT_UPDATED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_SLOTS_PUBLISHED",
  "INTERVIEW_SLOT_BOOKED",
  "BULK_APPLICATION_STATUS_UPDATED",
  "BULK_STATUS_ACTION_EXECUTED",
  "OFFER_GENERATED",
  "OFFER_RESPONSE_UPDATED",
];

const AUDIT_ENTITY_OPTIONS = ["APPLICATION", "INTERVIEW_SLOT", "BULK_ACTION"];
const AUDIT_ROLE_OPTIONS = ["student", "recruiter", "admin", "system"];
const AUDIT_LOG_ENDPOINTS = ["/admin/audit-logs", "/admin/audit/logs", "/admin/audit_logs"];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [replies, setReplies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("recruiters");
  const [exporting, setExporting] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    entityType: "",
    actorRole: "",
    from: "",
    to: "",
  });
  const [auditMeta, setAuditMeta] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [auditEndpoint, setAuditEndpoint] = useState(AUDIT_LOG_ENDPOINTS[0]);
  const { confirm, confirmDialog } = useConfirmDialog();
  const serverOrigin = getServerOrigin();

  const computedStats = useMemo(() => {
    if (!stats) {
      return {
        students: 0,
        recruiters: 0,
        jobs: 0,
        applications: 0,
        selected: 0,
      };
    }

    return {
      students: stats.students || 0,
      recruiters: stats.recruiters || 0,
      jobs: stats.jobs || 0,
      applications: stats.applications || 0,
      selected: stats.selected || 0,
    };
  }, [stats]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [statsRes, usersRes, jobsRes, ticketsRes, pendingRes, selectedCandidatesRes] = await Promise.all([
        API.get("/admin/stats"),
        API.get("/admin/users"),
        API.get("/admin/jobs"),
        API.get("/support/admin"),
        API.get("/admin/pending-recruiters"),
        API.get("/admin/selected-candidates"),
      ]);

      setStats(statsRes.data || {});
      setUsers(usersRes.data || []);
      setJobs(jobsRes.data || []);
      setPendingRecruiters(pendingRes.data || []);
      setSelectedCandidates(selectedCandidatesRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin dashboard data");
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async ({ page = 1, filters = auditFilters } = {}) => {
    try {
      setAuditLoading(true);
      const params = {
        page,
        limit: auditMeta.limit,
      };

      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.actorRole) params.actorRole = filters.actorRole;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const endpointCandidates = [
        auditEndpoint,
        ...AUDIT_LOG_ENDPOINTS.filter((item) => item !== auditEndpoint),
      ];

      let res = null;
      let last404 = null;

      for (const endpoint of endpointCandidates) {
        try {
          res = await API.get(endpoint, { params });
          if (endpoint !== auditEndpoint) {
            setAuditEndpoint(endpoint);
          }
          break;
        } catch (err) {
          if (err.response?.status === 404) {
            last404 = err;
            continue;
          }
          throw err;
        }
      }

      if (!res) {
        throw last404 || new Error("Audit logs endpoint not available");
      }

      setAuditLogs(res.data?.items || []);
      setAuditMeta({
        page: res.data?.page || page,
        limit: res.data?.limit || auditMeta.limit,
        total: res.data?.total || 0,
        totalPages: res.data?.totalPages || 1,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  };

  const applyAuditFilters = async () => {
    await fetchAuditLogs({ page: 1, filters: auditFilters });
  };

  const clearAuditFilters = async () => {
    const cleared = {
      action: "",
      entityType: "",
      actorRole: "",
      from: "",
      to: "",
    };
    setAuditFilters(cleared);
    await fetchAuditLogs({ page: 1, filters: cleared });
  };

  const downloadExport = async (type) => {
    try {
      setExporting(type);
      const response = await API.get(`/export/${type}`, {
        responseType: "blob",
      });

      const contentType = response.headers["content-type"] || "application/vnd.ms-excel";
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const disposition = String(response.headers["content-disposition"] || "");
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `${type}.xls`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setExporting("");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleUser = async (id) => {
    try {
      await API.put(`/admin/users/${id}/toggle`);
      toast.success("User status updated");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user");
    }
  };

  const deleteJob = async (id) => {
    const shouldDelete = await confirm({
      title: "Delete Job",
      message: "Are you sure you want to delete this job? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!shouldDelete) return;

    try {
      await API.delete(`/admin/jobs/${id}`);
      toast.success("Job deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete job");
    }
  };

  const respondToTicket = async (id) => {
    if (!replies[id]?.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }

    try {
      await API.put(`/support/admin/${id}/respond`, {
        response: replies[id],
      });
      toast.success("Reply sent");
      setReplies((prev) => ({ ...prev, [id]: "" }));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reply");
    }
  };

  const reviewRecruiter = async (id, action) => {
    try {
      await API.put(`/admin/recruiter-review/${id}`, { action });
      toast.success(action === "APPROVE" ? "Recruiter approved" : "Recruiter rejected");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-20 rounded-2xl bg-white dark:bg-slate-800 sm:h-24 sm:rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white dark:bg-slate-800 sm:h-28 sm:rounded-2xl" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-white dark:bg-slate-800 sm:h-96 sm:rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-800 dark:bg-slate-800 sm:rounded-3xl sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">Admin Dashboard</h2>
        <p className="mt-3 text-sm text-rose-600">{error}</p>
        <button
          onClick={fetchData}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-800 to-cyan-700 p-5 text-white shadow-xl sm:rounded-3xl sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">Admin Dashboard</h1>
            <p className="mt-1 max-w-xl text-xs text-slate-200 sm:mt-2 sm:text-sm">
              Review platform health, user activity, recruiter approvals, and support operations.
            </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                <span className="inline-flex items-center gap-1">
                  <RefreshIcon sx={{ fontSize: 16 }} />
                  Refresh
                </span>
              </button>
              <button
                onClick={logout}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                <span className="inline-flex items-center gap-1">
                  <LogoutIcon sx={{ fontSize: 16 }} />
                  Logout
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          <StatCard label="Students" value={computedStats.students} tone="sky" icon={GroupsIcon} />
          <StatCard label="Recruiters" value={computedStats.recruiters} tone="indigo" icon={GroupAddIcon} />
          <StatCard label="Jobs" value={computedStats.jobs} tone="emerald" icon={WorkIcon} />
          <StatCard label="Applications" value={computedStats.applications} tone="amber" icon={DescriptionIcon} />
          <StatCard label="Selected" value={computedStats.selected} tone="rose" icon={VerifiedUserIcon} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-4">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "recruiters"} onClick={() => setActiveTab("recruiters")}>
              Pending Recruiters ({pendingRecruiters.length})
            </TabButton>
            <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
              Users ({users.length})
            </TabButton>
            <TabButton active={activeTab === "jobs"} onClick={() => setActiveTab("jobs")}>
              Jobs ({jobs.length})
            </TabButton>
            <TabButton active={activeTab === "tickets"} onClick={() => setActiveTab("tickets")}>
              Support Tickets ({tickets.length})
            </TabButton>
            <TabButton active={activeTab === "selected"} onClick={() => setActiveTab("selected")}>
              Selected Candidates ({selectedCandidates.length})
            </TabButton>
            <TabButton active={activeTab === "exports"} onClick={() => setActiveTab("exports")}>
              Export Center
            </TabButton>
            <TabButton
              active={activeTab === "audit"}
              onClick={() => {
                setActiveTab("audit");
                fetchAuditLogs({ page: 1, filters: auditFilters });
              }}
            >
              Audit Logs
            </TabButton>
          </div>
        </section>

        {activeTab === "recruiters" && (
          <Section title="Pending Recruiter Approvals" subtitle="Approve verified recruiters or reject suspicious accounts.">
            {pendingRecruiters.length === 0 ? (
              <EmptyState message="No pending recruiters." />
            ) : (
              <DataTable headers={["Name", "Email", "Action"]}>
                {pendingRecruiters.map((rec) => (
                  <tr key={rec._id} className="border-b border-slate-100 last:border-none">
                    <TD>{rec.name}</TD>
                    <TD>{rec.email}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => reviewRecruiter(rec._id, "APPROVE")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <span className="inline-flex items-center gap-1">
                            <CheckIcon sx={{ fontSize: 14 }} />
                            Approve
                          </span>
                        </button>
                        <button
                          onClick={() => reviewRecruiter(rec._id, "REJECT")}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          <span className="inline-flex items-center gap-1">
                            <CloseIcon sx={{ fontSize: 14 }} />
                            Reject
                          </span>
                        </button>
                      </div>
                    </TD>
                  </tr>
                ))}
              </DataTable>
            )}
          </Section>
        )}

        {activeTab === "users" && (
          <Section title="Users" subtitle="Manage account status across student, recruiter, and admin roles.">
            {users.length === 0 ? (
              <EmptyState message="No users found." />
            ) : (
              <DataTable headers={["Name", "Email", "Role", "Status", "Action"]}>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 last:border-none">
                    <TD>{user.name}</TD>
                    <TD>{user.email}</TD>
                    <TD>
                      <RoleBadge role={user.role} />
                    </TD>
                    <TD>
                      <StatusBadge active={user.isActive} />
                    </TD>
                    <TD>
                      <button
                        onClick={() => toggleUser(user._id)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                      >
                        {user.isActive ? "Disable" : "Enable"}
                      </button>
                    </TD>
                  </tr>
                ))}
              </DataTable>
            )}
          </Section>
        )}

        {activeTab === "jobs" && (
          <Section title="Jobs" subtitle="Review all published jobs and remove outdated or invalid listings.">
            {jobs.length === 0 ? (
              <EmptyState message="No jobs found." />
            ) : (
              <DataTable headers={["Title", "Company", "Recruiter", "Action"]}>
                {jobs.map((job) => (
                  <tr key={job._id} className="border-b border-slate-100 last:border-none">
                    <TD>{job.title}</TD>
                    <TD>{job.companyName || "N/A"}</TD>
                    <TD>{job.recruiterId?.name || "N/A"}</TD>
                    <TD>
                      <button
                        onClick={() => deleteJob(job._id)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                      >
                        <span className="inline-flex items-center gap-1">
                          <DeleteIcon sx={{ fontSize: 14 }} />
                          Delete
                        </span>
                      </button>
                    </TD>
                  </tr>
                ))}
              </DataTable>
            )}
          </Section>
        )}

        {activeTab === "tickets" && (
          <Section title="Support Tickets" subtitle="Respond to student and recruiter queries and track ticket status.">
            {tickets.length === 0 ? (
              <EmptyState message="No support tickets found." />
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <article key={ticket._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {ticket.requesterRole === "recruiter"
                            ? ticket.recruiterId?.name || "Unknown Recruiter"
                            : ticket.studentId?.userId?.name || "Unknown Student"}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {ticket.requesterRole === "recruiter"
                            ? ticket.recruiterId?.email || "No email"
                            : ticket.studentId?.userId?.email || "No email"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {ticket.requesterRole || "student"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          ticket.status === "ANSWERED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <InfoBlock label="Question" value={ticket.question} />
                      <InfoBlock label="AI Response" value={ticket.aiResponse || "N/A"} />
                    </div>

                    {ticket.screenshotPath && (
                      <a
                        href={`${serverOrigin}${ticket.screenshotPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        View Screenshot
                      </a>
                    )}

                    <div className="mt-4">
                      {ticket.status === "ANSWERED" ? (
                        <InfoBlock label="Admin Response" value={ticket.adminResponse || "N/A"} />
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={replies[ticket._id] || ""}
                            onChange={(e) =>
                              setReplies((prev) => ({
                                ...prev,
                                [ticket._id]: e.target.value,
                              }))
                            }
                            placeholder="Write your response"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          />
                          <button
                            onClick={() => respondToTicket(ticket._id)}
                            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                          >
                            <span className="inline-flex items-center gap-1">
                              <SendIcon sx={{ fontSize: 16 }} />
                              Send Reply
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Section>
        )}

        {activeTab === "selected" && (
          <Section
            title="Selected Candidates"
            subtitle="View candidates who are marked as selected by recruiters."
          >
            {selectedCandidates.length === 0 ? (
              <EmptyState message="No selected candidates found." />
            ) : (
              <DataTable headers={["Candidate Name", "Company Name", "Package"]}>
                {selectedCandidates.map((candidate) => (
                  <tr key={candidate._id} className="border-b border-slate-100 last:border-none">
                    <TD>{candidate.candidateName || "N/A"}</TD>
                    <TD>{candidate.companyName || "N/A"}</TD>
                    <TD>{candidate.package ?? "N/A"}</TD>
                  </tr>
                ))}
              </DataTable>
            )}
          </Section>
        )}

        {activeTab === "exports" && (
          <Section
            title="Export Center"
            subtitle="Download platform reports in Excel format for audits, placement reports, and external analysis."
          >
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Placement Export</p>
                <p className="mt-1 text-xs text-slate-500">Selected candidates with company, role, and package.</p>
                <button
                  onClick={() => downloadExport("placements")}
                  disabled={exporting === "placements"}
                  className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <span className="inline-flex items-center gap-1">
                    <DownloadIcon sx={{ fontSize: 14 }} />
                    {exporting === "placements" ? "Exporting..." : "Download placements.xls"}
                  </span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">User Export</p>
                <p className="mt-1 text-xs text-slate-500">All users with role, status, and approval details.</p>
                <button
                  onClick={() => downloadExport("users")}
                  disabled={exporting === "users"}
                  className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <span className="inline-flex items-center gap-1">
                    <DownloadIcon sx={{ fontSize: 14 }} />
                    {exporting === "users" ? "Exporting..." : "Download users.xls"}
                  </span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Job Export</p>
                <p className="mt-1 text-xs text-slate-500">Complete jobs catalog with recruiter attribution.</p>
                <button
                  onClick={() => downloadExport("jobs")}
                  disabled={exporting === "jobs"}
                  className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <span className="inline-flex items-center gap-1">
                    <DownloadIcon sx={{ fontSize: 14 }} />
                    {exporting === "jobs" ? "Exporting..." : "Download jobs.xls"}
                  </span>
                </button>
              </div>
            </div>
          </Section>
        )}

        {activeTab === "audit" && (
          <Section
            title="Audit Logs"
            subtitle="Track system actions across application workflow, interview slots, and bulk operations."
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <select
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">All Actions</option>
                  {AUDIT_ACTION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={auditFilters.entityType}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, entityType: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">All Entities</option>
                  {AUDIT_ENTITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <select
                  value={auditFilters.actorRole}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, actorRole: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">All Actor Roles</option>
                  {AUDIT_ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={auditFilters.from}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, from: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />

                <input
                  type="date"
                  value={auditFilters.to}
                  onChange={(e) => setAuditFilters((prev) => ({ ...prev, to: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={applyAuditFilters}
                  disabled={auditLoading}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <span className="inline-flex items-center gap-1">
                    <FilterAltIcon sx={{ fontSize: 14 }} />
                    Apply Filters
                  </span>
                </button>
                <button
                  onClick={clearAuditFilters}
                  disabled={auditLoading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-4">
              {auditLoading ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Loading audit logs...
                </p>
              ) : auditLogs.length === 0 ? (
                <EmptyState message="No audit logs found for the selected filters." />
              ) : (
                <>
                  <DataTable headers={["Time", "Action", "Actor", "Entity", "Reference", "Changes"]}>
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="border-b border-slate-100 last:border-none">
                        <TD>{new Date(log.createdAt).toLocaleString()}</TD>
                        <TD>
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            <HistoryIcon sx={{ fontSize: 12 }} />
                            {log.action}
                          </span>
                        </TD>
                        <TD>
                          <p className="text-xs font-semibold text-slate-800">{log.actorId?.name || "System"}</p>
                          <p className="text-[11px] text-slate-500">{log.actorRole || "system"}</p>
                        </TD>
                        <TD>{log.entityType}</TD>
                        <TD>
                          <p className="text-xs text-slate-700">{String(log.entityId || "").slice(-8)}</p>
                          {log.jobId?.companyName ? (
                            <p className="text-[11px] text-slate-500">{log.jobId.companyName}</p>
                          ) : null}
                        </TD>
                        <TD>
                          <code className="block max-w-[280px] whitespace-pre-wrap break-words rounded bg-slate-100 p-2 text-[11px] text-slate-700">
                            {safeJSONStringify(log.changes)}
                          </code>
                        </TD>
                      </tr>
                    ))}
                  </DataTable>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      Showing page {auditMeta.page} of {auditMeta.totalPages} ({auditMeta.total} total records)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchAuditLogs({ page: Math.max(auditMeta.page - 1, 1), filters: auditFilters })}
                        disabled={auditMeta.page <= 1 || auditLoading}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1">
                          <NavigateBeforeIcon sx={{ fontSize: 14 }} />
                          Prev
                        </span>
                      </button>
                      <button
                        onClick={() =>
                          fetchAuditLogs({
                            page: Math.min(auditMeta.page + 1, auditMeta.totalPages),
                            filters: auditFilters,
                          })
                        }
                        disabled={auditMeta.page >= auditMeta.totalPages || auditLoading}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1">
                          Next
                          <NavigateNextIcon sx={{ fontSize: 14 }} />
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Section>
        )}
        </div>
      {confirmDialog}
    </>
  );
}

function safeJSONStringify(value) {
  try {
    const text = JSON.stringify(value || {}, null, 2);
    return text.length > 400 ? `${text.slice(0, 400)}...` : text;
  } catch {
    return "{}";
  }
}

function StatCard({ label, value, tone, icon: Icon }) {
  const toneMap = {
    sky: "from-sky-50 to-sky-100 text-sky-700 dark:from-sky-900/30 dark:to-sky-800/30 dark:text-sky-300",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700 dark:from-indigo-900/30 dark:to-indigo-800/30 dark:text-indigo-300",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 dark:from-emerald-900/30 dark:to-emerald-800/30 dark:text-emerald-300",
    amber: "from-amber-50 to-amber-100 text-amber-700 dark:from-amber-900/30 dark:to-amber-800/30 dark:text-amber-300",
    rose: "from-rose-50 to-rose-100 text-rose-700 dark:from-rose-900/30 dark:to-rose-800/30 dark:text-rose-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">{label}</p>
      <div className={`mt-2 rounded-lg bg-gradient-to-br px-3 py-3 sm:mt-3 sm:rounded-xl sm:py-4 ${toneMap[tone] || toneMap.indigo}`}>
        <p className="inline-flex items-center gap-1.5 text-xl font-bold sm:gap-2 sm:text-2xl">
          {Icon ? <Icon sx={{ fontSize: 20 }} /> : null}
          {value}
        </p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-5 md:p-6">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function DataTable({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">{children}</tbody>
      </table>
    </div>
  );
}

function TD({ children }) {
  return <td className="px-4 py-3 align-top text-slate-700">{children}</td>;
}

function RoleBadge({ role }) {
  const tone = {
    admin: "bg-violet-100 text-violet-700",
    recruiter: "bg-blue-100 text-blue-700",
    student: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone[role] || "bg-slate-100 text-slate-700"}`}>
      {role}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function EmptyState({ message }) {
  return <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">{message}</p>;
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}
