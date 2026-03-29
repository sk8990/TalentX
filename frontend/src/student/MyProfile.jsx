import { useEffect, useState } from "react";
import API, { getServerOrigin } from "../api/axios";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import toast from "react-hot-toast";

function buildFormFromProfile(profile) {
  return {
    branch: profile?.branch || "",
    year: profile?.year || "",
    cgpa: profile?.cgpa ?? "",
    skills: Array.isArray(profile?.skills) ? profile.skills.join(", ") : "",
    preferences: {
      alertsEnabled: profile?.preferences?.alertsEnabled !== false,
      preferredRoles: Array.isArray(profile?.preferences?.preferredRoles)
        ? profile.preferences.preferredRoles.join(", ")
        : "",
      preferredLocations: Array.isArray(profile?.preferences?.preferredLocations)
        ? profile.preferences.preferredLocations.join(", ")
        : "",
      minCtc: profile?.preferences?.minCtc ?? 0
    }
  };
}

export default function MyProfile() {
  const serverOrigin = getServerOrigin();
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(buildFormFromProfile(null));
  const [resumeFile, setResumeFile] = useState(null);
  const [parsingResume, setParsingResume] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const res = await API.get("/student/profile");
        if (isMounted) {
          setProfile(res.data);
          setForm(buildFormFromProfile(res.data));
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
      const payload = {
        branch: form.branch,
        year: form.year,
        cgpa: Number(form.cgpa || 0),
        skills: String(form.skills || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferences: {
          alertsEnabled: Boolean(form.preferences.alertsEnabled),
          preferredRoles: String(form.preferences.preferredRoles || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          preferredLocations: String(form.preferences.preferredLocations || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          minCtc: Number(form.preferences.minCtc || 0)
        }
      };

      const res = await API.put("/student/profile", payload);
      setProfile(res.data);
      setForm(buildFormFromProfile(res.data));
      setEdit(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const handleParseResume = async () => {
    if (!resumeFile) {
      toast("Select a PDF resume first", { icon: "!" });
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);

    try {
      setParsingResume(true);
      const res = await API.post("/student/profile/parse-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProfile(res.data.student);
      setForm(buildFormFromProfile(res.data.student));
      setResumeFile(null);
      setEdit(false);
      toast.success("Resume parsed and profile auto-filled");
    } catch (err) {
      toast.error(err.response?.data?.message || "Resume parse failed");
    } finally {
      setParsingResume(false);
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
        <p className="mt-2 text-sm text-indigo-100">Keep details updated for better matching and job alerts.</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900">Resume Auto-Fill</h2>
        <p className="mt-1 text-sm text-slate-500">Upload your resume PDF to auto-fill skills, CGPA, and preferences.</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            className="block w-full max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-200"
          />
          <button
            onClick={handleParseResume}
            disabled={parsingResume}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1">
              <AutoFixHighIcon sx={{ fontSize: 16 }} />
              {parsingResume ? "Parsing..." : "Parse & Auto-Fill"}
            </span>
          </button>
        </div>

        {profile.resumeSummary && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <p className="font-semibold">Resume Summary</p>
            <p className="mt-1">{profile.resumeSummary}</p>
          </div>
        )}

        {profile.resumeUrl && (
          <a
            href={`${serverOrigin}${profile.resumeUrl}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <UploadFileIcon sx={{ fontSize: 16 }} />
            View last parsed resume
          </a>
        )}
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
              <input type="number" step="0.1" min="0" max="10" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} className={inputClass} />
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

          <Field label="Job Alerts Enabled">
            {edit ? (
              <select
                value={form.preferences.alertsEnabled ? "yes" : "no"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferences: {
                      ...form.preferences,
                      alertsEnabled: e.target.value === "yes"
                    }
                  })
                }
                className={inputClass}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : (
              <Value>{profile.preferences?.alertsEnabled === false ? "No" : "Yes"}</Value>
            )}
          </Field>

          <Field label="Preferred Roles">
            {edit ? (
              <input
                value={form.preferences.preferredRoles}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferences: { ...form.preferences, preferredRoles: e.target.value }
                  })
                }
                placeholder="Frontend Developer, Data Analyst"
                className={inputClass}
              />
            ) : (
              <Value>{profile.preferences?.preferredRoles?.join(", ") || "N/A"}</Value>
            )}
          </Field>

          <Field label="Preferred Locations">
            {edit ? (
              <input
                value={form.preferences.preferredLocations}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferences: { ...form.preferences, preferredLocations: e.target.value }
                  })
                }
                placeholder="Pune, Bangalore, Remote"
                className={inputClass}
              />
            ) : (
              <Value>{profile.preferences?.preferredLocations?.join(", ") || "N/A"}</Value>
            )}
          </Field>

          <Field label="Minimum CTC Preference (LPA)">
            {edit ? (
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.preferences.minCtc}
                onChange={(e) =>
                  setForm({
                    ...form,
                    preferences: { ...form.preferences, minCtc: e.target.value }
                  })
                }
                className={inputClass}
              />
            ) : (
              <Value>{Number(profile.preferences?.minCtc || 0)} LPA</Value>
            )}
          </Field>
        </div>

        {edit && (
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8">
            <button
              onClick={() => {
                setEdit(false);
                setForm(buildFormFromProfile(profile));
              }}
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
