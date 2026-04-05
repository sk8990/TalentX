import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import API from "../../api/axios";

function getInitialForm() {
  return {
    name: "",
    email: "",
    phone: "",
    expertise: "",
    notes: ""
  };
}

export default function RecruiterInterviewers() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interviewers, setInterviewers] = useState([]);
  const [form, setForm] = useState(getInitialForm());
  const [editingId, setEditingId] = useState("");

  const activeInterviewers = useMemo(
    () => interviewers.filter((item) => item.isActive),
    [interviewers]
  );

  const fetchInterviewers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/recruiter/interviewers");
      setInterviewers(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load interviewers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewers();
  }, []);

  const resetForm = () => {
    setForm(getInitialForm());
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
      expertise: form.expertise
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    try {
      setSaving(true);
      if (editingId) {
        await API.put(`/recruiter/interviewers/${editingId}`, payload);
        toast.success("Interviewer updated");
      } else {
        const res = await API.post("/recruiter/interviewers", payload);
        if (res.data?.emailSent) {
          toast.success("Interviewer created and credentials sent");
        } else {
          toast.success("Interviewer created, but email could not be sent");
        }
      }
      resetForm();
      fetchInterviewers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save interviewer");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.user?.name || "",
      email: item.user?.email || "",
      phone: item.phone || "",
      expertise: (item.expertise || []).join(", "),
      notes: item.notes || ""
    });
  };

  const deactivate = async (item) => {
    const ok = window.confirm(`Deactivate interviewer ${item.user?.name || ""}?`);
    if (!ok) return;

    try {
      await API.delete(`/recruiter/interviewers/${item._id}`);
      toast.success("Interviewer deactivated");
      fetchInterviewers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate interviewer");
    }
  };

  const resendCredentials = async (item) => {
    try {
      await API.post(`/recruiter/interviewers/${item._id}/resend-credentials`);
      toast.success("Credentials resent");
      fetchInterviewers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend credentials");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Manage Interviewers</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">
          Create, update, and deactivate interviewer accounts. New interviewers receive temporary credentials by email.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Total Interviewers" value={interviewers.length} />
        <Stat label="Active Interviewers" value={activeInterviewers.length} />
        <Stat
          label="Pending Feedback"
          value={interviewers.reduce((sum, item) => sum + Number(item?.stats?.pendingFeedback || 0), 0)}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">
          {editingId ? "Edit Interviewer" : "Create Interviewer"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            placeholder="Interviewer name"
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            placeholder="email@example.com"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            placeholder="+1..."
          />
          <Input
            label="Expertise"
            value={form.expertise}
            onChange={(value) => setForm((prev) => ({ ...prev, expertise: value }))}
            placeholder="DSA, Java, System Design"
          />
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              placeholder="Optional notes"
            />
          </label>

          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Interviewer" : "Create Interviewer"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">Interviewer List</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading interviewers...</p>
        ) : interviewers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No interviewers created yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Interviewer</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Expertise</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Assignments</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {interviewers.map((item) => (
                  <tr key={item._id} className="border-b border-slate-100 last:border-none">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-slate-900">{item.user?.name || "N/A"}</p>
                      <p className="text-xs text-slate-500">{item.user?.email || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs font-semibold text-indigo-700">
                      {item.interviewerCode}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      {(item.expertise || []).length ? (item.expertise || []).join(", ") : "N/A"}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      Total: {item?.stats?.totalAssigned || 0}
                      <br />
                      Upcoming: {item?.stats?.upcomingAssigned || 0}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => resendCredentials(item)}
                          disabled={!item.isActive}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Resend Credentials
                        </button>
                        {item.isActive ? (
                          <button
                            onClick={() => deactivate(item)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        placeholder={placeholder}
      />
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100 sm:mt-2 sm:text-2xl">{value}</p>
    </div>
  );
}
