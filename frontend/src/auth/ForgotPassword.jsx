import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import toast from "react-hot-toast";
import API from "../api/axios";
import TalentXBrand from "../components/TalentXBrand";
import { LOGIN_ROUTE } from "../utils/authRouting";
import {
  authContentVariants,
  authItemVariants,
  authPageVariants,
  authSidebarVariants,
  authStepVariants,
} from "./authMotion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const reduceMotion = useReducedMotion();

  const navigate = useNavigate();

  const showAlert = (severity, message) => {
    if (severity === "success") {
      toast.success(message);
      return;
    }
    if (severity === "warning") {
      toast(message, { icon: "!" });
      return;
    }
    toast.error(message);
  };

  const sendToken = async () => {
    if (!email.trim()) {
      showAlert("warning", "Enter your email");
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/forgot-password", { email: email.trim() });
      showAlert("success", "If your email is registered, a reset token has been sent.");
      setStep(2);
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Failed to generate token");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!token.trim() || !newPassword.trim()) {
      showAlert("warning", "All fields are required");
      return;
    }

    try {
      setLoading(true);
      await API.post("/auth/reset-password", {
        token: token.trim(),
        newPassword: newPassword.trim(),
      });
      showAlert("success", "Password reset successful. Redirecting to login...");
      setTimeout(() => navigate(LOGIN_ROUTE), 900);
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden bg-slate-100 px-6 py-10"
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      variants={authPageVariants}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_32%),radial-gradient(circle_at_60%_80%,rgba(14,165,233,0.18),transparent_36%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-2">
        <motion.section
          className="hidden bg-gradient-to-r from-[#4f2df4] via-[#3f63df] to-[#1588db] p-12 text-white lg:flex lg:flex-col lg:justify-between"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authSidebarVariants}
        >
          <div>
            <motion.div variants={authItemVariants} className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur">
              <TalentXBrand theme="dark" size="sm" />
            </motion.div>

            <motion.h2 variants={authItemVariants} className="mt-9 text-4xl font-black leading-tight">
              Account Recovery Made Simple.
            </motion.h2>
            <motion.p variants={authItemVariants} className="mt-4 max-w-xl text-sm leading-relaxed text-indigo-100">
              Generate a secure reset token and update your password to continue your placement journey.
            </motion.p>
          </div>

          <motion.div
            variants={authItemVariants}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">Security Note</p>
            <p className="mt-2 text-sm text-white/90">
              Keep your reset token private. If you did not request a reset, ignore this process and contact support.
            </p>
          </motion.div>
        </motion.section>

        <motion.section
          className="p-8 md:p-12"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authContentVariants}
        >
          <motion.div variants={authItemVariants} className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-100 px-3 py-2 text-indigo-900">
              <LockResetRoundedIcon sx={{ fontSize: 18 }} />
              <span className="text-sm font-black tracking-wide">Reset Password</span>
            </div>
          </motion.div>

          <motion.h2 variants={authItemVariants} className="text-3xl font-black text-slate-900">
            Forgot Password?
          </motion.h2>
          <motion.p variants={authItemVariants} className="mt-2 text-sm text-slate-500">
            {step === 1 ? "Enter your email to generate reset token." : "Use token and set your new password."}
          </motion.p>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="request-token"
                className="mt-6 space-y-5"
                variants={authStepVariants}
                initial={reduceMotion ? false : "initial"}
                animate={reduceMotion ? undefined : "animate"}
                exit={reduceMotion ? undefined : "exit"}
              >
                <motion.div variants={authItemVariants}>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Email address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </motion.div>

                <motion.button
                  variants={authItemVariants}
                  onClick={sendToken}
                  disabled={loading}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Generating..." : "Generate Reset Token"}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="reset-password"
                className="mt-6 space-y-5"
                variants={authStepVariants}
                initial={reduceMotion ? false : "initial"}
                animate={reduceMotion ? undefined : "animate"}
                exit={reduceMotion ? undefined : "exit"}
              >
                <motion.div variants={authItemVariants}>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Reset Token</label>
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </motion.div>

                <motion.div variants={authItemVariants}>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </motion.div>

                <motion.button
                  variants={authItemVariants}
                  onClick={resetPassword}
                  disabled={loading}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={authItemVariants} className="pt-6 text-center">
            <Link to={LOGIN_ROUTE} className="text-sm font-semibold text-indigo-700 transition hover:text-indigo-900">
              Back to Login
            </Link>
          </motion.div>
        </motion.section>
      </div>
    </motion.div>
  );
}
