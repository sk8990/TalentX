import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";
import AIInterviewRoom from "./AIInterviewRoom";
import VirtualInterviewRoom from "./VirtualInterviewRoom";

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
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        Preparing interview room...
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p>{error || "Interview room is unavailable."}</p>
        <button
          onClick={() => navigate("/student/interviews")}
          className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold"
        >
          Back
        </button>
      </div>
    );
  }

  if (String(roomData?.interview?.panelType || "HUMAN").trim().toUpperCase() === "AI") {
    return <AIInterviewRoom roomData={roomData} />;
  }

  return <VirtualInterviewRoom role="student" initialRoomData={roomData} />;
}
