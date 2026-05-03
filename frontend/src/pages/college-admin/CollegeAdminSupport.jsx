import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SendIcon from "@mui/icons-material/Send";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import API from "../../api/axios";
import ProtectedUploadLink from "../../components/ProtectedUploadLink";

export default function CollegeAdminSupport() {
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await API.get("/support/college-admin");
      setAssignedTickets(Array.isArray(res.data?.assignedTickets) ? res.data.assignedTickets : []);
      setMyTickets(Array.isArray(res.data?.myTickets) ? res.data.myTickets : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const submitTicket = async (event) => {
    event.preventDefault();
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

      await API.post("/support/college-admin/ticket", formData, {
        headers: { "Content-Type": "multipart/form-data" }
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

  const respond = async (id) => {
    const response = String(replies[id] || "").trim();
    if (!response) {
      toast.error("Response is required");
      return;
    }

    try {
      await API.put(`/support/college-admin/${id}/respond`, { response });
      toast.success("Response sent");
      setReplies((prev) => ({ ...prev, [id]: "" }));
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send response");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="tx-page-header px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">College Support</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">Handle student tickets for your college and raise platform requests.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Raise Ticket to Super Admin
        </button>
      </section>

      <TicketSection
        title="Assigned Student Tickets"
        loading={loading}
        tickets={assignedTickets}
        replies={replies}
        setReplies={setReplies}
        onRespond={respond}
        emptyText="No student tickets are assigned to your college yet."
        canRespond
      />

      <TicketSection
        title="My Tickets"
        loading={loading}
        tickets={myTickets}
        replies={replies}
        setReplies={setReplies}
        onRespond={respond}
        emptyText="No platform support tickets raised yet."
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-3 backdrop-blur-sm sm:px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Raise Platform Ticket</h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close ticket form"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={submitTicket} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</span>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Describe the issue"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Screenshot (Optional)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => setScreenshot(event.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
                />
              </label>

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

function TicketSection({ title, loading, tickets, replies, setReplies, onRespond, emptyText, canRespond = false }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
        <SupportAgentIcon sx={{ fontSize: 20 }} />
        {title}
      </h2>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              reply={replies[ticket._id] || ""}
              setReply={(value) => setReplies((prev) => ({ ...prev, [ticket._id]: value }))}
              onRespond={() => onRespond(ticket._id)}
              canRespond={canRespond}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TicketCard({ ticket, reply, setReply, onRespond, canRespond }) {
  const requesterName =
    ticket.studentId?.userId?.name ||
    ticket.requesterId?.name ||
    ticket.recruiterId?.name ||
    "Requester";
  const requesterEmail =
    ticket.studentId?.userId?.email ||
    ticket.requesterId?.email ||
    ticket.recruiterId?.email ||
    "";

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition dark:border-slate-600 dark:bg-slate-700/50 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{requesterName}</h4>
          {requesterEmail ? <p className="text-xs text-slate-500 dark:text-slate-400">{requesterEmail}</p> : null}
          <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {ticket.requesterRole || "student"}
          </span>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            ticket.status === "ANSWERED" || ticket.status === "CLOSED"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {ticket.status || "OPEN"}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Question</p>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{ticket.question}</p>
      </div>

      {ticket.screenshotPath ? (
        <ProtectedUploadLink
          uploadPath={ticket.screenshotPath}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          <AddPhotoAlternateIcon sx={{ fontSize: 14 }} />
          View Screenshot
        </ProtectedUploadLink>
      ) : null}

      {ticket.adminResponse ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Response</p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{ticket.adminResponse}</p>
        </div>
      ) : canRespond ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Write your response..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={onRespond}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <span className="inline-flex items-center gap-1">
              <SendIcon sx={{ fontSize: 16 }} />
              Send Reply
            </span>
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">Waiting for response...</p>
      )}
    </article>
  );
}
