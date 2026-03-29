import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Login from "./auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import MyApplications from "./student/MyApplications";
import StudentLayout from "./layout/StudentLayout";
import JobProfiles from "./student/JobProfiles";
import MyProfile from "./student/MyProfile";
import Interviews from "./student/Interviews";
import Assessments from "./student/Assessments";
import AdminDashboard from "./dashboards/AdminDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import RecruiterLayout from "./pages/recruiter/RecruiterLayout";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import StudentSupport from "./student/StudentSupport";
import StudentFAQ from "./student/StudentFAQ";
import AdminSupport from "./admin/AdminSupport";
import RecruiterApplications from "./pages/recruiter/RecruiterApplications";
import RecruiterSupport from "./pages/recruiter/RecruiterSupport";
import RecruiterInterviewers from "./pages/recruiter/RecruiterInterviewers";
import InterviewerLayout from "./pages/interviewer/InterviewerLayout";
import InterviewerPanel from "./pages/interviewer/InterviewerPanel";
import InterviewerResetPassword from "./pages/interviewer/InterviewerResetPassword";
import VirtualInterviewRoom from "./pages/interview/VirtualInterviewRoom";
import { Toaster } from "react-hot-toast";
import About from "./pages/About";
import { ThemeProvider } from "./utils/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "12px",
            background: "#1f2937",
            color: "#fff",
          },
        }}
      />

      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* STUDENT */}
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="jobs" element={<JobProfiles />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="interviews/:applicationId/room" element={<VirtualInterviewRoom role="student" />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="support" element={<StudentSupport />} />
            <Route path="faq" element={<StudentFAQ />} />
          </Route>

          {/* RECRUITER */}
          <Route
            path="/recruiter"
            element={
              <ProtectedRoute role="recruiter">
                <RecruiterLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RecruiterDashboard />} />
            <Route path="dashboard" element={<RecruiterDashboard />} />
            <Route path="jobs" element={<RecruiterJobs />} />
            <Route path="applications" element={<RecruiterApplications />} />
            <Route path="interviewers" element={<RecruiterInterviewers />} />
            <Route path="support" element={<RecruiterSupport />} />
          </Route>

          {/* INTERVIEWER */}
          <Route
            path="/interviewer/reset-password"
            element={
              <ProtectedRoute role="interviewer">
                <InterviewerResetPassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/interviewer"
            element={
              <ProtectedRoute role="interviewer">
                <InterviewerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InterviewerPanel />} />
            <Route path="panel" element={<InterviewerPanel />} />
            <Route path="interviews/:applicationId/room" element={<VirtualInterviewRoom role="interviewer" />} />
          </Route>

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <Outlet />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="support" element={<AdminSupport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
