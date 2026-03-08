import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import MyApplications from "./student/MyApplications";
import StudentLayout from "./layout/StudentLayout";
import JobProfiles from "./student/JobProfiles";
import MyProfile from "./student/MyProfile";
import Interviews from "./student/Interviews";
import Assessments from "./student/Assessments";
import AdminDashboard from "./dashboards/AdminDashboard";
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
import { Toaster } from "react-hot-toast";
import About from "./pages/About";

export default function App() {
  return (
    <>
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
            <Route path="jobs" element={<JobProfiles />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="/student/support" element={<StudentSupport />} />
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
            <Route path="support" element={<RecruiterSupport />} />
          </Route>

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            <Route path="support" element={<AdminSupport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}
