import { useContext, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import LockResetIcon from "@mui/icons-material/LockReset";
import EmailIcon from "@mui/icons-material/Email";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { ThemeContext } from "../utils/themeContextObject";

// ── Password strength indicator ──────────────────────────────────────────────

const STRENGTH_LEVELS = [
  { label: "Too short", color: "bg-slate-300" },
  { label: "Weak",      color: "bg-rose-500"  },
  { label: "Fair",      color: "bg-amber-500" },
  { label: "Good",      color: "bg-sky-500"   },
  { label: "Strong",    color: "bg-emerald-500" }
];

function getPasswordStrength(password) {
  if (!password || password.length < 4) return 0;
  let score = 0;
  if (password.length >= 8)                          score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password))                        score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password))      score += 1;
  return Math.min(score, 4);
}

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const level = getPasswordStrength(password);
  const { label, color } = STRENGTH_LEVELS[level];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              bar <= level ? color : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${level <= 1 ? "text-rose-600" : level === 2 ? "text-amber-600" : level === 3 ? "text-sky-600" : "text-emerald-600"}`}>
        {label}
      </p>
    </div>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-indigo-400";

// ── Password field with show/hide toggle ─────────────────────────────────────

function PasswordField({ label, value, onChange, placeholder = "" }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show
            ? <VisibilityOffIcon sx={{ fontSize: 18 }} />
            : <VisibilityIcon sx={{ fontSize: 18 }} />}
        </button>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SettingsSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:rounded-3xl sm:p-6 md:p-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
          <Icon sx={{ fontSize: 20 }} />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// ── Change Password section ───────────────────────────────────────────────────

function ChangePasswordSection() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (form.newPassword === form.currentPassword) {
      toast.error("New password must be different from your current password");
      return;
    }

    try {
      setSaving(true);
      await API.post("/student/settings/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      toast.success("Password changed successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      icon={LockResetIcon}
      title="Change Password"
      subtitle="Use a strong password you haven't used before."
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
        <PasswordField
          label="Current Password"
          value={form.currentPassword}
          onChange={set("currentPassword")}
          placeholder="Enter your current password"
        />

        <div>
          <PasswordField
            label="New Password"
            value={form.newPassword}
            onChange={set("newPassword")}
            placeholder="At least 8 characters"
          />
          <PasswordStrengthBar password={form.newPassword} />
        </div>

        <PasswordField
          label="Confirm New Password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          placeholder="Repeat new password"
        />

        {form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword && (
          <p className="text-xs font-medium text-rose-600">Passwords do not match</p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Update Password"}
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}

// ── Change Email section ──────────────────────────────────────────────────────

function ChangeEmailSection() {
  const [newEmail, setNewEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast("Email change feature coming soon");
  };

  return (
    <SettingsSection
      icon={EmailIcon}
      title="Change Email Address"
      subtitle="Your current email is used for login and notifications."
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md" noValidate>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            New Email Address
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled
            className={inputClass}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
          Email change feature coming soon. Your current login email remains active.
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Coming Soon
          </button>
        </div>
      </form>
    </SettingsSection>
  );
}

// ── Theme section ─────────────────────────────────────────────────────────────

function ThemeSection() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <SettingsSection
      icon={darkMode ? DarkModeIcon : LightModeIcon}
      title="Appearance"
      subtitle="Choose between light and dark mode."
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => !darkMode || toggleDarkMode()}
          className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
            !darkMode
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          }`}
        >
          <LightModeIcon sx={{ fontSize: 18 }} />
          Light
        </button>
        <button
          type="button"
          onClick={() => darkMode || toggleDarkMode()}
          className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
            darkMode
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          }`}
        >
          <DarkModeIcon sx={{ fontSize: 18 }} />
          Dark
        </button>
      </div>
    </SettingsSection>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StudentSettings() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="tx-page-header px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Account Settings</h1>
        <p className="mt-1 text-xs text-indigo-100 sm:mt-2 sm:text-sm">
          Manage your password, email address, and display preferences.
        </p>
      </section>

      <ChangePasswordSection />
      <ChangeEmailSection />
      <ThemeSection />
    </div>
  );
}
