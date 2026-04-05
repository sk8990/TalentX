import { useEffect, useState } from "react";
import API, { getServerOrigin } from "../../api/axios";
import toast from "react-hot-toast";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";

export default function RecruiterSupport() {
  const serverOrigin = getServerOrigin();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await API.get("/support/recruiter/my");
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const submitTicket = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("Question is required");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("question", question.trim());
      if (screenshot) {
        formData.append("screenshot", screenshot);
      }

      await API.post("/support/recruiter/ticket", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Support ticket raised");
      setQuestion("");
      setScreenshot(null);
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to raise ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Recruiter Support</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">Raise support issues and track admin responses.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Raise Support Ticket
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
          <SupportAgentIcon sx={{ fontSize: 20 }} />
          My Tickets
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No tickets yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {tickets.map((ticket) => (
              <article key={ticket._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{ticket.question}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ticket.status === "ANSWERED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                {ticket.screenshotPath && (
                  <a
                    href={`${serverOrigin}${ticket.screenshotPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <AddPhotoAlternateIcon sx={{ fontSize: 14 }} />
                    View Screenshot
                  </a>
                )}

                {ticket.adminResponse ? (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <span className="font-semibold">Admin Reply:</span> {ticket.adminResponse}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Waiting for admin reply...</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-3 backdrop-blur-sm sm:px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Raise Recruiter Ticket</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={submitTicket} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</label>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Describe your recruiter-side issue"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Screenshot (Optional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
