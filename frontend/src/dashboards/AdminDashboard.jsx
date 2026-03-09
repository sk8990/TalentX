import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
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
import { useConfirmDialog } from "../components/ConfirmDialog";

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
  const { confirm, confirmDialog } = useConfirmDialog();

  const navigate = useNavigate();

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

  useEffect(() => {
    fetchData();
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

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
      <div className="min-h-screen bg-slate-100 p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-24 rounded-3xl bg-white" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white" />
            ))}
          </div>
          <div className="h-96 rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          <p className="mt-3 text-sm text-rose-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-sky-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-800 to-cyan-700 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">TalentX Console</p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Admin Dashboard</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-200">
                Review platform health, user activity, recruiter approvals, and support operations in one place.
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Students" value={computedStats.students} tone="sky" icon={GroupsIcon} />
          <StatCard label="Recruiters" value={computedStats.recruiters} tone="indigo" icon={GroupAddIcon} />
          <StatCard label="Jobs" value={computedStats.jobs} tone="emerald" icon={WorkIcon} />
          <StatCard label="Applications" value={computedStats.applications} tone="amber" icon={DescriptionIcon} />
          <StatCard label="Selected" value={computedStats.selected} tone="rose" icon={VerifiedUserIcon} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
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
                        href={`http://localhost:5000${ticket.screenshotPath}`}
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
        </div>
      </div>
      {confirmDialog}
    </>
  );
}

function StatCard({ label, value, tone, icon: Icon }) {
  const toneMap = {
    sky: "from-sky-50 to-sky-100 text-sky-700",
    indigo: "from-indigo-50 to-indigo-100 text-indigo-700",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700",
    amber: "from-amber-50 to-amber-100 text-amber-700",
    rose: "from-rose-50 to-rose-100 text-rose-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className={`mt-3 rounded-xl bg-gradient-to-br px-3 py-4 ${toneMap[tone] || toneMap.indigo}`}>
        <p className="inline-flex items-center gap-2 text-2xl font-bold">
          {Icon ? <Icon sx={{ fontSize: 22 }} /> : null}
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
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
  return <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}
