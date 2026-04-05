import { useEffect, useState } from "react";
import API, { getServerOrigin } from "../api/axios";
import toast from "react-hot-toast";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SendIcon from "@mui/icons-material/Send";
import ImageIcon from "@mui/icons-material/Image";

export default function AdminSupport() {
  const serverOrigin = getServerOrigin();
  const [tickets, setTickets] = useState([]);
  const [replies, setReplies] = useState({});

  async function fetchTickets() {
    try {
      const res = await API.get("/support/admin");
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tickets");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTickets();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const respond = async (id) => {
    const text = (replies[id] || "").trim();
    if (!text) return;

    try {
      await API.put(`/support/admin/${id}/respond`, {
        response: text,
      });

      toast.success("Response sent");
      setReplies((prev) => ({ ...prev, [id]: "" }));
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send response");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-5 py-6 text-white sm:rounded-3xl sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Support Tickets</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">
          Respond to student and recruiter queries and track ticket status.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">
          <SupportAgentIcon sx={{ fontSize: 20 }} />
          All Tickets
        </h2>

        {tickets.length === 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
            No tickets yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {tickets.map((ticket) => (
              <article
                key={ticket._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition dark:border-slate-600 dark:bg-slate-700/50 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ticket.requesterRole === "recruiter"
                        ? ticket.recruiterId?.name || "Unknown Recruiter"
                        : ticket.studentId?.userId?.name || "Unknown Student"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {ticket.requesterRole === "recruiter"
                        ? ticket.recruiterId?.email
                        : ticket.studentId?.userId?.email}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {ticket.requesterRole || "student"}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      ticket.status === "ANSWERED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Question</p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{ticket.question}</p>
                  </div>
                  {ticket.aiResponse && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">AI Response</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{ticket.aiResponse}</p>
                    </div>
                  )}
                </div>

                {ticket.screenshotPath && (
                  <a
                    href={`${serverOrigin}${ticket.screenshotPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <ImageIcon sx={{ fontSize: 14 }} />
                    View Screenshot
                  </a>
                )}

                <div className="mt-4">
                  {ticket.status === "ANSWERED" || ticket.status === "OPEN" && ticket.adminResponse ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Admin Response</p>
                      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{ticket.adminResponse || "N/A"}</p>
                    </div>
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
                        placeholder="Write your response..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-900"
                      />
                      <button
                        onClick={() => respond(ticket._id)}
                        className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
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
      </section>
    </div>
  );
}
