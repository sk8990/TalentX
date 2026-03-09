import { useEffect, useState } from "react";
import axios from "../api/axios";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import toast from "react-hot-toast";

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    branch: "",
    year: "",
    cgpa: "",
    skills: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const res = await axios.get("/student/profile");
        if (isMounted) {
          setProfile(res.data);
          setForm({
            branch: res.data.branch || "",
            year: res.data.year || "",
            cgpa: res.data.cgpa || "",
            skills: Array.isArray(res.data.skills) ? res.data.skills.join(", ") : "",
          });
        }
      } catch (err) {
        console.error("Profile fetch failed", err);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      const res = await axios.put("/student/profile", {
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setProfile(res.data);
      setEdit(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  if (!profile) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading profile...</div>;
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 px-6 py-8 text-white sm:px-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="mt-2 text-sm text-indigo-100">Keep your academic details updated to unlock better job matches.</p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{profile.userId?.name}</h2>
              <p className="text-sm text-slate-500">{profile.userId?.email}</p>
            </div>
            {!edit && (
              <button
                onClick={() => setEdit(true)}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <span className="inline-flex items-center gap-1">
                  <EditIcon sx={{ fontSize: 16 }} />
                  Edit Profile
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <Field label="Branch">
            {edit ? (
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={inputClass}>
                <option value="">Select Branch</option>
                {["CS", "IT", "ENTC", "MECH", "CIVIL"].map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            ) : (
              <Value>{profile.branch || "N/A"}</Value>
            )}
          </Field>

          <Field label="Year">
            {edit ? (
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={inputClass} />
            ) : (
              <Value>{profile.year || "N/A"}</Value>
            )}
          </Field>

          <Field label="CGPA">
            {edit ? (
              <input type="number" step="0.1" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} className={inputClass} />
            ) : (
              <Value>{profile.cgpa || "N/A"}</Value>
            )}
          </Field>

          <Field label="Skills">
            {edit ? (
              <input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="React, Node, SQL"
                className={inputClass}
              />
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.isArray(profile.skills) && profile.skills.length > 0 ? (
                  profile.skills.map((skill, idx) => (
                    <span key={idx} className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No skills added.</p>
                )}
              </div>
            )}
          </Field>
        </div>

        {edit && (
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8">
            <button
              onClick={() => setEdit(false)}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <span className="inline-flex items-center gap-1">
                <SaveIcon sx={{ fontSize: 16 }} />
                Save Changes
              </span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Value({ children }) {
  return <p className="mt-2 text-lg font-semibold text-slate-900">{children}</p>;
}
