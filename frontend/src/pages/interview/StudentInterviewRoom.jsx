import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import AIInterviewRoom from "./AIInterviewRoom";
import VirtualInterviewRoom from "./VirtualInterviewRoom";

function InterviewRoomShell({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_42%,#eff6ff_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1580px] flex-col gap-6">
        {children}
      </div>
    </div>
  );
}

export default function StudentInterviewRoom() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await API.get(`/application/${applicationId}/interview/room`);
        if (cancelled) return;
        setRoomData(res.data);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Failed to open interview room");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRoom();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (loading) {
    return (
      <InterviewRoomShell>
        <div className="grid min-h-[70vh] place-items-center rounded-[34px] border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_80px_rgba(148,163,184,0.15)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">Interview Room</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">Preparing interview panel...</p>
            <p className="mt-2 text-sm text-slate-500">Checking session access, restoring transcript, and loading the room.</p>
          </div>
        </div>
      </InterviewRoomShell>
    );
  }

  if (error || !roomData) {
    return (
      <InterviewRoomShell>
        <div className="grid min-h-[70vh] place-items-center">
          <div className="w-full max-w-xl space-y-4 rounded-[34px] border border-rose-200 bg-white/95 p-8 text-rose-700 shadow-[0_24px_80px_rgba(244,63,94,0.12)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Interview Access</p>
              <p className="mt-3 text-xl font-bold text-rose-900">{error || "Interview room is unavailable."}</p>
            </div>
            <p className="text-sm leading-6 text-rose-700">
              Return to your interviews list and check the schedule window, browser permissions, or panel status.
            </p>
            <button
              onClick={() => navigate("/student/interviews")}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Back to Interviews
            </button>
          </div>
        </div>
      </InterviewRoomShell>
    );
  }

  if (String(roomData?.interview?.panelType || "HUMAN").trim().toUpperCase() === "AI") {
    return (
      <InterviewRoomShell>
        <AIInterviewRoom roomData={roomData} />
      </InterviewRoomShell>
    );
  }

  return (
    <InterviewRoomShell>
      <VirtualInterviewRoom role="student" initialRoomData={roomData} />
    </InterviewRoomShell>
  );
}
