import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

export default function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [replies, setReplies] = useState({});

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await API.get("/support/admin");
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tickets");
    }
  };

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
    <div className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Support Tickets</h2>

      <div className="space-y-6">
        {tickets.map((ticket) => (
          <div key={ticket._id} className="rounded-xl border bg-white p-5 shadow-sm">
            <p>
              <b>Requester:</b>{" "}
              {ticket.requesterRole === "recruiter"
                ? ticket.recruiterId?.name
                : ticket.studentId?.userId?.name}
            </p>
            <p>
              <b>Email:</b>{" "}
              {ticket.requesterRole === "recruiter"
                ? ticket.recruiterId?.email
                : ticket.studentId?.userId?.email}
            </p>
            <p><b>Role:</b> {ticket.requesterRole || "student"}</p>

            <div className="mt-3">
              <p className="font-semibold">Question:</p>
              <p>{ticket.question}</p>
            </div>

            {ticket.aiResponse && (
              <div className="mt-3">
                <p className="font-semibold">AI Response:</p>
                <p>{ticket.aiResponse}</p>
              </div>
            )}

            {ticket.screenshotPath && (
              <div className="mt-3">
                <p className="font-semibold">Screenshot:</p>
                <a
                  href={`http://localhost:5000${ticket.screenshotPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-indigo-600 underline"
                >
                  View Screenshot
                </a>
              </div>
            )}

            {ticket.status === "OPEN" ? (
              <div className="mt-4">
                <textarea
                  placeholder="Write response..."
                  value={replies[ticket._id] || ""}
                  onChange={(e) =>
                    setReplies((prev) => ({
                      ...prev,
                      [ticket._id]: e.target.value,
                    }))
                  }
                  className="w-full rounded border p-2"
                />

                <button
                  onClick={() => respond(ticket._id)}
                  className="mt-2 rounded bg-purple-600 px-4 py-2 text-white"
                >
                  Respond
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-green-700">
                <b>Admin Response:</b> {ticket.adminResponse}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
