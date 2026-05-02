import { useState, useContext } from "react";
import toast from "react-hot-toast";
import API from "../../api/axios";
import { ThemeContext } from "../../utils/themeContextObject";

export default function SuperAdminSettingsPage() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [emailForm, setEmailForm] = useState({ newEmail: "", password: "" });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!emailForm.newEmail.trim()) {
      toast.error("New email is required");
      return;
    }
    if (!emailForm.password.trim()) {
      toast.error("Password confirmation is required");
      return;
    }
    try {
      setEmailSubmitting(true);
      await API.post("/auth/change-email", {
        newEmail: emailForm.newEmail.trim(),
        password: emailForm.password
      });
      toast.success("Email updated successfully. Please login again.");
      setEmailForm({ newEmail: "", password: "" });
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update email");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword.trim()) {
      toast.error("Current password is required");
      return;
    }
    if (!passwordForm.newPassword.trim()) {
      toast.error("New password is required");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      setPasswordSubmitting(true);
      await API.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="tx-page-header p-5 sm:p-6 md:p-8">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Super Admin Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your account preferences, security, and theme settings.
        </p>
      </header>

      {/* Theme Settings */}
      <section className="tx-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Theme Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Choose your preferred theme for the platform.</p>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
              !darkMode
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Light Mode
          </button>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
              darkMode
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Dark Mode
          </button>
        </div>
      </section>

      {/* Change Email */}
      <section className="tx-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Change Email</h2>
        <p className="mt-1 text-sm text-slate-500">Update your email address. You will need to login again after changing.</p>
        <form onSubmit={handleEmailChange} className="mt-4 space-y-4">
          <label className="block text-sm text-slate-600">
            New Email Address
            <input
              type="email"
              required
              value={emailForm.newEmail}
              onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
              className="mt-1 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="newemail@example.com"
            />
          </label>
          <label className="block text-sm text-slate-600">
            Confirm Password
            <input
              type="password"
              required
              value={emailForm.password}
              onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))}
              className="mt-1 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Enter your current password"
            />
          </label>
          <button
            type="submit"
            disabled={emailSubmitting}
            className="tx-button-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            {emailSubmitting ? "Updating..." : "Update Email"}
          </button>
        </form>
      </section>

      {/* Change Password */}
      <section className="tx-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
        <p className="mt-1 text-sm text-slate-500">Update your password to keep your account secure.</p>
        <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
          <label className="block text-sm text-slate-600">
            Current Password
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
              className="mt-1 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Enter current password"
            />
          </label>
          <label className="block text-sm text-slate-600">
            New Password
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              className="mt-1 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="block text-sm text-slate-600">
            Confirm New Password
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              className="mt-1 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Re-enter new password"
            />
          </label>
          {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
            <p className="text-xs text-rose-600">Password must be at least 8 characters</p>
          )}
          {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
            <p className="text-xs text-rose-600">Passwords do not match</p>
          )}
          <button
            type="submit"
            disabled={passwordSubmitting}
            className="tx-button-primary px-5 py-2 text-sm disabled:opacity-60"
          >
            {passwordSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
