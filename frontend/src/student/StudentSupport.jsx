import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";

export default function StudentSupport() {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [ticketLoading, setTicketLoading] = useState(true);

  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketQuestion, setTicketQuestion] = useState("");
  const [ticketScreenshot, setTicketScreenshot] = useState(null);
  const [raisingTicket, setRaisingTicket] = useState(false);

  const lastQuestion = useMemo(
    () => [...chat].reverse().find((msg) => msg.type === "student"),
    [chat]
  );

  const lastAnswer = useMemo(
    () => [...chat].reverse().find((msg) => msg.type === "ai"),
    [chat]
  );

  const fetchTickets = async () => {
    try {
      setTicketLoading(true);
      let res;
      try {
        res = await API.get("/support/my");
      } catch {
        try {
          res = await API.get("/support/tickets/my");
        } catch {
          res = await API.get("/support/student/tickets");
        }
      }

      const normalized = Array.isArray(res?.data) ? res.data.filter(Boolean) : [];
      setTickets(normalized);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tickets");
    } finally {
      setTicketLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const askAI = async () => {
    if (!question.trim()) return;

    setLoading(true);

    try {
      const res = await API.post("/support/ask-ai", { question });
      const aiAnswer = res.data.answer;

      setChat((prev) => [...prev, { type: "student", text: question }, { type: "ai", text: aiAnswer }]);
      setQuestion("");
    } catch {
      toast.error("AI failed");
    } finally {
      setLoading(false);
    }
  };

  const openTicketForm = () => {
    setTicketQuestion(lastQuestion?.text || "");
    setTicketScreenshot(null);
    setShowTicketForm(true);
  };

  const submitTicket = async (e) => {
    e.preventDefault();

    if (!ticketQuestion.trim()) {
      toast.error("Ticket question is required");
      return;
    }

    try {
      setRaisingTicket(true);

      const formData = new FormData();
      formData.append("question", ticketQuestion.trim());
      if (lastAnswer?.text) {
        formData.append("aiResponse", lastAnswer.text);
      }
      if (ticketScreenshot) {
        formData.append("screenshot", ticketScreenshot);
      }

      await API.post("/support/ticket", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Ticket raised successfully");
      setShowTicketForm(false);
      setTicketQuestion("");
      setTicketScreenshot(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to raise ticket");
    } finally {
      setRaisingTicket(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">Student Support</h1>
        <p className="mt-2 text-sm text-indigo-100">Ask AI for quick help, then raise a support ticket with screenshot if needed.</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
          <SmartToyIcon sx={{ fontSize: 20 }} />
          AI Chat
        </h2>

        <div className="mt-4 h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {chat.length === 0 && <p className="text-sm text-slate-500">Start by asking your question.</p>}

          {chat.map((msg, index) => (
            <div
              key={index}
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.type === "student" ? "ml-auto bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {msg.text}
            </div>
          ))}

          {loading && <p className="text-sm text-slate-500">AI is typing...</p>}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Ask something..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          />

          <button
            onClick={askAI}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1">
              <SendIcon sx={{ fontSize: 16 }} />
              Ask
            </span>
          </button>
        </div>

        <button
          onClick={openTicketForm}
          className="mt-4 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          <span className="inline-flex items-center gap-1">
            <ReportProblemIcon sx={{ fontSize: 16 }} />
            Raise Support Ticket
          </span>
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">My Tickets</h2>

        {ticketLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No tickets yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {tickets.filter(Boolean).map((ticket) => (
              <article key={ticket._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{ticket?.question || "Untitled ticket"}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ticket?.status === "ANSWERED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {ticket?.status || "OPEN"}
                  </span>
                </div>

                {ticket?.screenshotPath && (
                  <a
                    href={`http://localhost:5000${ticket?.screenshotPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <AddPhotoAlternateIcon sx={{ fontSize: 14 }} />
                    View Screenshot
                  </a>
                )}

                {ticket?.adminResponse ? (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <span className="font-semibold">Admin Reply:</span> {ticket?.adminResponse}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Waiting for admin reply...</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showTicketForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Raise Support Ticket</h3>
              <button onClick={() => setShowTicketForm(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={submitTicket} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</label>
                <textarea
                  rows={4}
                  value={ticketQuestion}
                  onChange={(e) => setTicketQuestion(e.target.value)}
                  placeholder="Describe your issue"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload Screenshot (Optional)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setTicketScreenshot(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTicketForm(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={raisingTicket}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {raisingTicket ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
