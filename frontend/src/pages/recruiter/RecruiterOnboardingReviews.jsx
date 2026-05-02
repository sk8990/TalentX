import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import API from "../../api/axios";
import ProtectedUploadLink from "../../components/ProtectedUploadLink";
import SecureUploadImage from "../../components/SecureUploadImage";
import ScreenLoader from "../../components/ScreenLoader";

// Phase 4.1: Stats card for the analytics bar
function StatCard({ icon, label, value, bgColor, textColor }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className={`text-xs font-semibold ${textColor}`}>{label}</p>
      </div>
    </div>
  );
}

function FilePill({ item }) {
  return (
    <ProtectedUploadLink
      uploadPath={item.url}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
    >
      <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />
      {item.label}
    </ProtectedUploadLink>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value || "Not provided"}</p>
    </div>
  );
}

export default function RecruiterOnboardingReviews() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [notes, setNotes] = useState({});
  const [rejections, setRejections] = useState({});
  // Phase 4.4: Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  const queueCountLabel = useMemo(() => `${queue.length} pending review${queue.length === 1 ? "" : "s"}`, [queue.length]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        API.get("/onboarding", { params: { view: "review" } }),
        API.get("/onboarding/stats").catch(() => ({ data: null }))
      ]);
      setQueue(queueRes.data?.queue || []);
      setStats(statsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load onboarding reviews");
    } finally {
      setLoading(false);
      setSelectedIds(new Set());
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const approveItem = async (item) => {
    const key = `${item.instanceId}-approve`;
    setBusyKey(key);
    try {
      await API.post("/documents/approve", {
        instanceId: item.instanceId,
        stepId: item.stepId,
        reviewNotes: notes[item.instanceId] || ""
      });
      toast.success("Document submission approved");
      await fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed");
    } finally {
      setBusyKey("");
    }
  };

  const rejectItem = async (item) => {
    const reason = String(rejections[item.instanceId] || "").trim();
    if (!reason) {
      toast.error("Add a rejection reason before sending back the documents");
      return;
    }

    const key = `${item.instanceId}-reject`;
    setBusyKey(key);
    try {
      await API.post("/documents/reject", {
        instanceId: item.instanceId,
        stepId: item.stepId,
        rejectionReason: reason
      });
      toast.success("Document submission sent back to the student");
      await fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed");
    } finally {
      setBusyKey("");
    }
  };

  // Phase 4.4: Bulk approve selected items
  const bulkApprove = async () => {
    const items = queue.filter((item) => selectedIds.has(item.instanceId));
    if (!items.length) return;

    setBusyKey("bulk-approve");
    let successCount = 0;
    for (const item of items) {
      try {
        await API.post("/documents/approve", {
          instanceId: item.instanceId,
          stepId: item.stepId,
          reviewNotes: notes[item.instanceId] || ""
        });
        successCount++;
      } catch { /* continue */ }
    }
    toast.success(`${successCount} of ${items.length} submissions approved`);
    setBusyKey("");
    await fetchQueue();
  };

  // Phase 4.4: Toggle selection
  const toggleSelect = (instanceId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === queue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map((item) => item.instanceId)));
    }
  };

  if (loading) {
    return (
      <ScreenLoader
        message="Loading onboarding reviews..."
        subtext="Collecting submitted documents and review queue details."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <HourglassTopRoundedIcon sx={{ fontSize: 15 }} />
              Review Queue
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Onboarding Document Reviews</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Review submitted student documents, approve complete packets, or send them back with precise correction notes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Phase 4.4: Bulk approve button */}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={bulkApprove}
                disabled={busyKey === "bulk-approve"}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                {busyKey === "bulk-approve" ? "Approving..." : `Approve ${selectedIds.size} Selected`}
              </button>
            )}
            <button
              type="button"
              onClick={fetchQueue}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Phase 4.1: Stats bar */}
        {stats && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<PeopleOutlineRoundedIcon sx={{ fontSize: 20, color: "#6366f1" }} />}
              label="Total Onboarding"
              value={stats.total}
              bgColor="bg-indigo-50"
              textColor="text-slate-500"
            />
            <StatCard
              icon={<TrendingUpRoundedIcon sx={{ fontSize: 20, color: "#f59e0b" }} />}
              label="In Progress"
              value={stats.inProgress}
              bgColor="bg-amber-50"
              textColor="text-amber-600"
            />
            <StatCard
              icon={<TaskAltRoundedIcon sx={{ fontSize: 20, color: "#10b981" }} />}
              label="Completed"
              value={stats.completed}
              bgColor="bg-emerald-50"
              textColor="text-emerald-600"
            />
            <StatCard
              icon={<PendingActionsRoundedIcon sx={{ fontSize: 20, color: "#ef4444" }} />}
              label="Pending Review"
              value={stats.pendingReview}
              bgColor="bg-rose-50"
              textColor="text-rose-600"
            />
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <DescriptionOutlinedIcon sx={{ fontSize: 24 }} />
          </div>
          <div>
            <p className="text-sm font-semibold">{queueCountLabel}</p>
            <p className="text-xs text-slate-300">Only document packets awaiting recruiter action are shown here.</p>
          </div>
        </div>
      </section>

      {queue.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">No pending onboarding reviews</p>
          <p className="mt-2 text-sm text-slate-500">Student document packets will appear here once they are submitted for approval.</p>
        </section>
      ) : (
        <div className="space-y-5">
          {/* Phase 4.4: Select all header */}
          {queue.length > 1 && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <input
                type="checkbox"
                checked={selectedIds.size === queue.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                {selectedIds.size === queue.length ? "Deselect All" : "Select All"}
              </span>
            </div>
          )}

          {queue.map((item) => (
            <section key={item.instanceId} className={`rounded-[28px] border bg-white p-6 shadow-sm sm:p-7 transition ${selectedIds.has(item.instanceId) ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}>
              <div className="flex items-start gap-4">
                {/* Phase 4.4: Individual checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.instanceId)}
                  onChange={() => toggleSelect(item.instanceId)}
                  className="mt-5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                        {item.companyLogo ? (
                          <SecureUploadImage src={item.companyLogo} alt={item.companyName} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl font-semibold text-indigo-600">{item.companyName.slice(0, 1)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.companyName}</p>
                        <h2 className="mt-1 text-2xl font-semibold text-slate-950">{item.student.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">{item.student.email}</p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{item.jobRole}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <p className="font-semibold">Submitted</p>
                      <p className="mt-1">{new Date(item.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {Object.entries(item.formData || {}).map(([label, value]) => (
                      <DetailRow key={label} label={label.replace(/([A-Z])/g, " $1")} value={value} />
                    ))}
                  </div>

                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold text-slate-900">Uploaded Documents</h3>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {item.documents.map((document) => (
                        <FilePill key={document.id} item={document} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 p-5">
                      <label className="text-sm font-semibold text-slate-900">Approval Notes</label>
                      <textarea
                        value={notes[item.instanceId] || ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [item.instanceId]: event.target.value }))}
                        rows={4}
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
                        placeholder="Optional notes for the student or audit trail"
                      />
                    </div>

                    <div className="rounded-[24px] border border-rose-200 bg-rose-50/60 p-5">
                      <label className="text-sm font-semibold text-slate-900">Rejection Reason</label>
                      <textarea
                        value={rejections[item.instanceId] || ""}
                        onChange={(event) => setRejections((current) => ({ ...current, [item.instanceId]: event.target.value }))}
                        rows={4}
                        className="mt-3 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-400"
                        placeholder="Tell the student exactly what needs to be corrected"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => approveItem(item)}
                      disabled={busyKey === `${item.instanceId}-approve`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                      {busyKey === `${item.instanceId}-approve` ? "Approving..." : "Approve Documents"}
                    </button>

                    <button
                      type="button"
                      onClick={() => rejectItem(item)}
                      disabled={busyKey === `${item.instanceId}-reject`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CancelRoundedIcon sx={{ fontSize: 18 }} />
                      {busyKey === `${item.instanceId}-reject` ? "Sending Back..." : "Reject & Request Reupload"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
