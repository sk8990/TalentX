import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import API from "../api/axios";
import "./Login.css";
import TalentXBrand from "../components/TalentXBrand";
import { getDefaultRouteForUser } from "../utils/authRouting";
import {
  authContentVariants,
  authItemVariants,
  authPageVariants,
  authSidebarVariants,
} from "./authMotion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const reduceMotion = useReducedMotion();
  const highlights = ["Hire Smarter", "Learn Faster", "Grow Careers", "Build Teams"];

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.token;
      const user = {
        ...(res.data.user || {}),
        forcePasswordReset: Boolean(res.data.forcePasswordReset),
      };

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate(getDefaultRouteForUser(user));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
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
              One Platform for Students, Recruiters, and Placement Teams.
            </motion.h2>
            <motion.p variants={authItemVariants} className="mt-4 max-w-xl text-sm leading-relaxed text-cyan-100">
              Track opportunities, apply to top companies, and manage hiring pipelines with speed and confidence.
            </motion.p>
          </div>

          <motion.div variants={authContentVariants} className="space-y-5">
            <motion.div
              variants={authItemVariants}
              className="relative h-14 overflow-hidden rounded-xl border border-white/20 bg-white/10 px-5"
            >
              <div className="ticker-track">
                {[...highlights, ...highlights].map((item, idx) => (
                  <span key={`${item}-${idx}`} className="ticker-item">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div variants={authItemVariants} className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<SchoolRoundedIcon sx={{ fontSize: 18 }} />}
                label="Students"
                value="10k+"
                reduceMotion={reduceMotion}
              />
              <StatCard
                icon={<BusinessCenterRoundedIcon sx={{ fontSize: 18 }} />}
                label="Recruiters"
                value="500+"
                reduceMotion={reduceMotion}
              />
              <StatCard
                icon={<TrendingUpRoundedIcon sx={{ fontSize: 18 }} />}
                label="Placements"
                value="95%"
                reduceMotion={reduceMotion}
              />
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          className="p-8 md:p-12"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authContentVariants}
        >
          <motion.div variants={authItemVariants} className="mb-8 lg:hidden">
            <div className="rounded-2xl bg-indigo-100 px-3 py-3 text-indigo-900">
              <TalentXBrand theme="light" size="sm" />
            </div>
          </motion.div>

          <motion.h2 variants={authItemVariants} className="text-3xl font-black text-slate-900">
            Sign in
          </motion.h2>
          <motion.p variants={authItemVariants} className="mt-2 text-sm text-slate-500">
            Access your dashboard and continue your journey.
          </motion.p>

          {error && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {error}
            </motion.div>
          )}

          <motion.form onSubmit={handleLogin} className="mt-6 space-y-5" variants={authContentVariants}>
            <motion.div variants={authItemVariants}>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </motion.div>

            <motion.div variants={authItemVariants}>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </motion.div>

            <motion.div variants={authItemVariants} className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="font-semibold text-indigo-700 hover:text-indigo-900">
                Forgot password?
              </Link>
            </motion.div>

            <motion.button
              variants={authItemVariants}
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign in to TalentX"}
            </motion.button>
          </motion.form>

          <motion.p variants={authItemVariants} className="mt-6 text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-900">
              Create one
            </Link>
          </motion.p>
          <motion.p variants={authItemVariants} className="mt-2 text-sm text-slate-600">
            Explore the platform{" "}
            <Link to="/" className="font-semibold text-indigo-700 hover:text-indigo-900">
              TalentX Home
            </Link>
          </motion.p>
        </motion.section>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, reduceMotion }) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-xl border border-white/20 bg-white/10 px-3 py-3 backdrop-blur"
    >
      <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
        {icon}
        {label}
      </p>
      <p className="text-lg font-black text-white">{value}</p>
    </motion.div>
  );
}
