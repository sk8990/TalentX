import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { FormControl, MenuItem, Select } from "@mui/material";
import toast from "react-hot-toast";
import API from "../api/axios";
import TalentXBrand from "../components/TalentXBrand";
import { LOGIN_ROUTE } from "../utils/authRouting";
import {
  authContentVariants,
  authItemVariants,
  authPageVariants,
  authSidebarVariants,
} from "./authMotion";

export default function Register() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleRegister = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !role) {
      toast.error("All fields are required");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register", {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });

      toast.success("Registration successful. Please login.");
      navigate(LOGIN_ROUTE);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:py-3 sm:text-base";

  const registerSelectMenuProps = {
    PaperProps: {
      sx: {
        mt: 1,
        borderRadius: 2,
        border: "1px solid #dbe2ef",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.15)",
        "& .MuiMenuItem-root": {
          fontSize: "0.9rem",
          borderRadius: 1,
          mx: 0.5,
          my: 0.25,
          minHeight: 36,
        },
        "& .MuiMenuItem-root:hover": {
          backgroundColor: "#eef2ff",
        },
        "& .MuiMenuItem-root.Mui-selected": {
          backgroundColor: "#e0e7ff",
          color: "#3730a3",
          fontWeight: 700,
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          backgroundColor: "#c7d2fe",
        },
      },
    },
  };

  const registerSelectSx = {
    mt: 1,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#cbd5e1",
      borderWidth: "1px",
      borderRadius: "0.75rem",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "#a5b4fc",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#6366f1",
      borderWidth: "2px",
    },
    "& .MuiSelect-select": {
      py: "10px",
      px: "16px",
      fontSize: "0.875rem",
      fontWeight: 500,
      color: "#0f172a",
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      borderRadius: "0.75rem",
    },
    "& .MuiSelect-icon": {
      color: "#64748b",
      right: 10,
    },
  };

  return (
    <motion.div
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-6 sm:px-6 sm:py-10"
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      variants={authPageVariants}
    >
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(79,70,229,0.12),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(59,130,246,0.1),transparent_32%)]" />

      <div className="relative mx-auto grid w-full max-w-[72rem] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-3xl lg:grid-cols-2">
        {/* ── Sidebar (desktop) ── */}
        <motion.aside
          className="hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 p-8 text-white lg:flex lg:flex-col lg:justify-between lg:p-10"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authSidebarVariants}
        >
          <div>
            <motion.div variants={authItemVariants} className="mb-6 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <TalentXBrand theme="dark" size="sm" />
            </motion.div>

            <motion.h1 variants={authItemVariants} className="text-3xl font-black leading-tight xl:text-4xl">
              Welcome to TalentX
            </motion.h1>

            <motion.p variants={authItemVariants} className="mt-4 text-sm leading-relaxed text-indigo-100 lg:text-base">
              A modern platform that connects students with recruiters and helps teams hire faster.
            </motion.p>

            <motion.div variants={authContentVariants} className="mt-6 space-y-2 text-sm text-indigo-100">
              {["Career-first onboarding", "Smart applications and role matching", "Progress tracking from one dashboard"].map(
                (item) => (
                  <motion.p key={item} variants={authItemVariants} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[0.6rem]">
                      ✓
                    </span>
                    {item}
                  </motion.p>
                )
              )}
            </motion.div>
          </div>

          <motion.div
            variants={authItemVariants}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
          >
            <p className="text-sm text-indigo-50">Trusted by students, colleges, and recruiters.</p>
          </motion.div>
        </motion.aside>

        {/* ── Form side ── */}
        <motion.section
          className="flex flex-col justify-center p-5 sm:p-8 md:p-10 lg:p-12"
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authContentVariants}
        >
          <div className="mx-auto w-full max-w-md">
            {/* Mobile branding */}
            <motion.div variants={authItemVariants} className="mb-5 lg:hidden">
              <div className="inline-flex rounded-xl bg-indigo-50 px-3 py-2.5 text-indigo-900">
                <TalentXBrand theme="light" size="sm" />
              </div>
            </motion.div>

            <motion.h2 variants={authItemVariants} className="text-2xl font-black text-slate-900 sm:text-3xl">
              Create your account
            </motion.h2>
            <motion.p variants={authItemVariants} className="mt-1.5 text-sm text-slate-500 sm:mt-2">
              Start your TalentX journey in a minute.
            </motion.p>

            <motion.form onSubmit={handleRegister} className="mt-5 space-y-4 sm:mt-8 sm:space-y-5" variants={authContentVariants}>
              <motion.div variants={authItemVariants}>
                <label htmlFor="register-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  placeholder="John Doe"
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label htmlFor="register-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email Address
                </label>
                <input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label htmlFor="register-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    className={`${fieldClass} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <VisibilityOffRoundedIcon sx={{ fontSize: 20 }} />
                    ) : (
                      <VisibilityRoundedIcon sx={{ fontSize: 20 }} />
                    )}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Register As</label>
                <FormControl fullWidth size="small">
                  <Select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    IconComponent={KeyboardArrowDownRoundedIcon}
                    MenuProps={registerSelectMenuProps}
                    sx={registerSelectSx}
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="recruiter">Recruiter</MenuItem>
                  </Select>
                </FormControl>
              </motion.div>

              <motion.button
                variants={authItemVariants}
                type="submit"
                disabled={loading}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
              >
                {loading ? "Creating account..." : "Register"}
              </motion.button>
            </motion.form>

            <motion.div variants={authItemVariants} className="mt-5 space-y-1.5 sm:mt-6 sm:space-y-2">
              <p className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link to={LOGIN_ROUTE} className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Login
                </Link>
              </p>
              <p className="text-sm text-slate-600">
                Explore the platform{" "}
                <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                  TalentX Home
                </Link>
              </p>
            </motion.div>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
