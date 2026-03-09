import { useEffect, useState } from "react";
import API from "../api/axios";
import { logout } from "../utils/logout";
import toast from "react-hot-toast";

export default function StudentDashboard() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const res = await API.get("/company/jobs");
      setJobs(res.data);
    };
    fetchJobs();
  }, []);

  const applyJob = async (jobId) => {
    try {
      await API.post("/application/apply", { jobId });
      toast.success("Job applied successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Apply failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 relative">
      
      {/* Logout Button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={logout}
          className="rounded-lg border border-purple-200 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 hover:text-purple-800 transition"
        >
          Logout
        </button>
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-800">
            Student Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Browse and apply for available job opportunities
          </p>
        </div>

        {/* Jobs Grid */}
        {jobs.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            No jobs available right now
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition"
              >
                {/* Job Title */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {job.title}
                  </h3>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-600">
                    💼
                  </span>
                </div>

                {/* Company */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span className="text-purple-500">🏢</span>
                  <span>{job.companyId?.name || "Unknown Company"}</span>
                </div>

                {/* CGPA */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                  <span className="text-purple-500">🎓</span>
                  <span>Minimum CGPA: {job.minCgpa}</span>
                </div>

                {/* Apply Button */}
                <button
                  onClick={() => applyJob(job._id)}
                  className="w-full rounded-lg bg-purple-600 py-2.5 text-white font-medium hover:bg-purple-700 transition"
                >
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
