import { useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

export default function ApplyJobModal({ jobId, onClose }) {
  const [file, setFile] = useState(null);
  const [coverNote, setCoverNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submitApplication = async () => {
    if (!file) {
      toast.error("Please upload your resume (PDF)");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("resume", file);
      formData.append("coverNote", coverNote);

      await API.post("/application/apply", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Application submitted");
      onClose(true);

    } catch (err) {
      toast.error(err.response?.data?.message || "Apply failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Apply for Job</h2>

        {/* Resume Upload */}
        <input
          type="file"
          accept="application/pdf"
          className="w-full border rounded-lg px-3 py-2 mb-3"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <textarea
          className="w-full border rounded-lg px-3 py-2 mb-4"
          placeholder="Cover note (optional)"
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={submitApplication}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            {loading ? "Submitting..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
