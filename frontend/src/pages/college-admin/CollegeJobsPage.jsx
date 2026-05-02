import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import WorkRoundedIcon from "@mui/icons-material/WorkRounded";
import { getCollegeJobs } from "../../api/collegeAdminApi";

export default function CollegeJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCollegeJobs()
      .then((res) => {
        setJobs(res.data?.jobs || []);
        if (res.data?.message) setInfo(res.data.message);
      })
      .catch(() => toast.error("Failed to load jobs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#243b95]">
            <WorkRoundedIcon sx={{ fontSize: 24 }} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Jobs / Drives</h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              View jobs and placement drives targeting your college.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[#243b95]" />
        </div>
      ) : jobs.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            {info || "No jobs or drives are currently targeting your college."}
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Job Title</th>
                  <th className="px-5 py-3">Company / Recruiter</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Applications</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j._id} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{j.title}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {j.companyName || j.recruiterId?.companyName || j.recruiterId?.name || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        j.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {j.isActive ? "Active" : "Closed"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{j.applicationCount ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(j.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
