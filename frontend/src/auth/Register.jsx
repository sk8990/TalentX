import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { FormControl, MenuItem, Select } from "@mui/material";
import toast from "react-hot-toast";
import API from "../api/axios";
import TalentXBrand from "../components/TalentXBrand";
import ScreenLoader from "../components/ScreenLoader";
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
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  const [studentType, setStudentType] = useState("open_student");
  const [collegeId, setCollegeId] = useState("");
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(false);

  const selectedCollege = colleges.find((c) => c._id === collegeId);

  useEffect(() => {
    if (role === "student" && studentType === "college_student" && colleges.length === 0) {
      setCollegesLoading(true);
      API.get("/public/active-colleges")
        .then((res) => setColleges(res.data?.colleges || []))
        .catch(() => toast.error("Failed to load colleges"))
        .finally(() => setCollegesLoading(false));
    }
  }, [role, studentType, colleges.length]);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .register-form-section::-webkit-scrollbar {
        width: 8px;
      }
      .register-form-section::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }
      .register-form-section::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 4px;
      }
      .register-form-section::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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

    if (role === "student" && studentType === "college_student" && !collegeId) {
      toast.error("Please select your college.");
      return;
    }

    if (role === "recruiter") {
      if (!companyName.trim()) {
        toast.error("Company name is required");
        return;
      }

      if (!companyWebsite.trim()) {
        toast.error("Company website is required");
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        password,
        role,
      };

      if (role === "student") {
        payload.studentType = studentType;
        if (studentType === "college_student") {
          payload.collegeId = collegeId;
        }
      }

      if (role === "recruiter") {
        payload.companyName = companyName.trim();
        payload.companyEmail = trimmedEmail;
        payload.companyWebsite = companyWebsite.trim();
      }

      const res = await API.post("/auth/register", payload);

      toast.success(res.data?.message || "Registration successful. Please login.");
      navigate(LOGIN_ROUTE);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#243b95] focus:ring-4 focus:ring-[#eef3ff] sm:py-3 sm:text-base";

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
      borderColor: "#314db8",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "#243b95",
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

  if (loading) {
    return (
      <ScreenLoader
        fullScreen
        showBrand
        message="Creating your account..."
        subtext="Setting up your TalentX access."
      />
    );
  }

  return (
    <motion.div
      className="relative flex min-h-[100dvh] items-center justify-center bg-[#f4f6fb] px-4 py-6 sm:px-6 sm:py-10"
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      variants={authPageVariants}
    >
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(36,59,149,0.12),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(14,165,233,0.10),transparent_32%)]" />

      <div className="relative mx-auto grid w-full max-w-[72rem] grid-cols-1 rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-3xl lg:grid-cols-2 lg:overflow-hidden">
        {/* ── Sidebar (desktop) ── */}
        <motion.aside
          className="hidden bg-gradient-to-br from-[#243b95] via-[#314db8] to-[#1d2f80] p-8 text-white lg:flex lg:flex-col lg:justify-between lg:p-10"
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
          className="register-form-section flex flex-col justify-start overflow-y-auto p-4 sm:p-5 md:p-6 lg:py-10 lg:px-12"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
          initial={reduceMotion ? false : "hidden"}
          animate={reduceMotion ? undefined : "visible"}
          variants={authContentVariants}
        >
          <div className="mx-auto w-full max-w-md">
            {/* Mobile branding */}
            <motion.div variants={authItemVariants} className="mb-5 lg:hidden">
              <div className="inline-flex rounded-xl bg-[#eef3ff] px-3 py-2.5 text-[#243b95]">
                <TalentXBrand theme="light" size="sm" />
              </div>
            </motion.div>

            <motion.h2 variants={authItemVariants} className="text-2xl font-black text-slate-900 sm:text-3xl">
              Create your account
            </motion.h2>
            <motion.p variants={authItemVariants} className="mt-1.5 text-sm text-slate-500 sm:mt-2">
              Start your TalentX journey in a minute.
            </motion.p>

            <motion.form onSubmit={handleRegister} className={`mt-4 sm:mt-6 ${role === "recruiter" ? "space-y-2.5 sm:space-y-3" : "space-y-3.5 sm:space-y-4"}`} variants={authContentVariants}>
              <motion.div variants={authItemVariants}>
                <label htmlFor="register-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {role === "recruiter" ? "Recruiter Name" : "Full Name"}
                </label>
                <input
                  id="register-name"
                  type="text"
                  placeholder={role === "recruiter" ? "Recruiter name" : "John Doe"}
                  className={fieldClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </motion.div>

              <motion.div variants={authItemVariants}>
                <label htmlFor="register-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {role === "recruiter" ? "Company Email" : "Email Address"}
                </label>
                <input
                  id="register-email"
                  type="email"
                  placeholder={role === "recruiter" ? "recruiter@company.com" : "you@example.com"}
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

              {role === "recruiter" && (
                <>
                  <motion.div variants={authItemVariants} initial="visible" animate="visible">
                    <label htmlFor="register-company-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company Name
                    </label>
                    <input
                      id="register-company-name"
                      type="text"
                      placeholder="TalentX Pvt Ltd"
                      className={fieldClass}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </motion.div>

                  <motion.div variants={authItemVariants} initial="visible" animate="visible">
                    <label htmlFor="register-company-website" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company Website
                    </label>
                    <input
                      id="register-company-website"
                      type="text"
                      placeholder="https://company.com"
                      className={fieldClass}
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                    />
                  </motion.div>
                </>
              )}

              <motion.div variants={authItemVariants}>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Register As</label>
                <FormControl fullWidth size="small">
                  <Select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setStudentType("open_student");
                      setCollegeId("");
                      if (e.target.value !== "recruiter") {
                        setCompanyName("");
                        setCompanyWebsite("");
                      }
                    }}
                    IconComponent={KeyboardArrowDownRoundedIcon}
                    MenuProps={registerSelectMenuProps}
                    sx={registerSelectSx}
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="recruiter">Recruiter</MenuItem>
                  </Select>
                </FormControl>
              </motion.div>

              {role === "student" && (
                <motion.div variants={authItemVariants} initial="visible" animate="visible">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student Type</label>
                  <FormControl fullWidth size="small">
                    <Select
                      value={studentType}
                      onChange={(e) => {
                        setStudentType(e.target.value);
                        setCollegeId("");
                      }}
                      IconComponent={KeyboardArrowDownRoundedIcon}
                      MenuProps={registerSelectMenuProps}
                      sx={registerSelectSx}
                    >
                      <MenuItem value="open_student">Open Student</MenuItem>
                      <MenuItem value="college_student">College Student</MenuItem>
                    </Select>
                  </FormControl>
                  {studentType === "open_student" && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      Open Students can register with a personal email and get limited access.
                    </p>
                  )}
                </motion.div>
              )}

              {role === "student" && studentType === "college_student" && (
                <motion.div variants={authItemVariants} initial="visible" animate="visible">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select College</label>
                  <FormControl fullWidth size="small">
                    <Select
                      value={collegeId}
                      onChange={(e) => setCollegeId(e.target.value)}
                      displayEmpty
                      IconComponent={KeyboardArrowDownRoundedIcon}
                      MenuProps={registerSelectMenuProps}
                      sx={registerSelectSx}
                    >
                      <MenuItem value="" disabled>
                        {collegesLoading ? "Loading colleges..." : "Choose your college"}
                      </MenuItem>
                      {colleges.map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedCollege && (
                    <p className="mt-1.5 text-xs font-medium text-[#243b95]">
                      Use your official college email ending with @{selectedCollege.domain}
                    </p>
                  )}
                </motion.div>
              )}

              <motion.button
                variants={authItemVariants}
                type="submit"
                disabled={loading}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className="w-full rounded-xl bg-[#243b95] px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#1d2f80] hover:shadow-lg hover:shadow-[#243b95]/20 focus:outline-none focus:ring-4 focus:ring-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-70 sm:py-3"
              >
                {loading ? "Creating account..." : "Register"}
              </motion.button>
            </motion.form>

            <motion.div variants={authItemVariants} className="mt-5 space-y-1.5 sm:mt-6 sm:space-y-2">
              <p className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link to={LOGIN_ROUTE} className="font-semibold text-[#243b95] hover:text-[#1d2f80] hover:underline">
                  Login
                </Link>
              </p>
              <p className="text-sm text-slate-600">
                Explore the platform{" "}
                <Link to="/" className="font-semibold text-[#243b95] hover:text-[#1d2f80] hover:underline">
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
