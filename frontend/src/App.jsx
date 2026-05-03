import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import MyApplications from "./student/MyApplications";
import StudentLayout from "./layout/StudentLayout";
import JobProfiles from "./student/JobProfiles";
import MyProfile from "./student/MyProfile";
import StudentSettings from "./student/StudentSettings";
import Interviews from "./student/Interviews";
import Assessments from "./student/Assessments";
import AdminDashboard from "./dashboards/AdminDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import AdminLayout from "./layout/AdminLayout";
import RecruiterLayout from "./pages/recruiter/RecruiterLayout";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import StudentSupport from "./student/StudentSupport";
import StudentFAQ from "./student/StudentFAQ";
import AdminSupport from "./admin/AdminSupport";
import RecruiterApplications from "./pages/recruiter/RecruiterApplications";
import RecruiterSupport from "./pages/recruiter/RecruiterSupport";
import RecruiterInterviewers from "./pages/recruiter/RecruiterInterviewers";
import RecruiterOnboardingReviews from "./pages/recruiter/RecruiterOnboardingReviews";
import InterviewerLayout from "./pages/interviewer/InterviewerLayout";
import InterviewerPanel from "./pages/interviewer/InterviewerPanel";
import InterviewerResetPassword from "./pages/interviewer/InterviewerResetPassword";
import VirtualInterviewRoom from "./pages/interview/VirtualInterviewRoom";
import StudentInterviewRoom from "./pages/interview/StudentInterviewRoom";
import { Toaster } from "react-hot-toast";
import LandingPage from "./pages/LandingPage";
import BillingSuccess from "./pages/BillingSuccess";
import BlogPlaceholder from "./pages/BlogPlaceholder";
import { ThemeProvider } from "./utils/ThemeContext";
import OnboardingPortal from "./onboarding/OnboardingPortal";
import FeatureGate from "./components/FeatureGate";
import PackageQuotaExceededModal from "./components/PackageQuotaExceededModal";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import SuperAdminLayout from "./layout/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import PackagesPage from "./pages/super-admin/PackagesPage";
import PaymentsPage from "./pages/super-admin/PaymentsPage";
import RevenuePage from "./pages/super-admin/RevenuePage";
import SubscriptionsPage from "./pages/super-admin/SubscriptionsPage";
import UniversitiesPage from "./pages/super-admin/UniversitiesPage";
import RecruitersPage from "./pages/super-admin/RecruitersPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import SuperAdminSettingsPage from "./pages/super-admin/SuperAdminSettingsPage";
import CollegesPage from "./pages/super-admin/CollegesPage";
import CreateCollegeAdminPage from "./pages/super-admin/CreateCollegeAdminPage";
import RecruiterApprovalsPage from "./pages/super-admin/RecruiterApprovalsPage";
import CollegeAdminLayout from "./layout/CollegeAdminLayout";
import CollegeAdminDashboard from "./pages/college-admin/CollegeAdminDashboard";
import StudentVerificationPage from "./pages/college-admin/StudentVerificationPage";
import CollegeJobsPage from "./pages/college-admin/CollegeJobsPage";
import PlacementReportsPage from "./pages/college-admin/PlacementReportsPage";
import CollegeAdminSupport from "./pages/college-admin/CollegeAdminSupport";
import { readStoredSession, getDefaultRouteForUser, LOGIN_ROUTE } from "./utils/authRouting";

function CatchAllRedirect() {
  const { token, user } = readStoredSession();
  if (token && user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }
  return <Navigate to={LOGIN_ROUTE} replace />;
}

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

      <SubscriptionProvider>
      <BrowserRouter>
        <PackageQuotaExceededModal />
        <Routes>
          {/* PUBLIC */}
          <Route
            path="/"
            element={<LandingPage />}
          />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/blog/:slug" element={<BlogPlaceholder />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route path="/onboarding" element={<OnboardingPortal />} />
          <Route
            path="/billing/success"
            element={
              <ProtectedRoute role="recruiter">
                <BillingSuccess />
              </ProtectedRoute>
            }
          />

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
            <Route path="settings" element={<StudentSettings />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="support" element={<StudentSupport />} />
            <Route path="faq" element={<StudentFAQ />} />
          </Route>

          <Route
            path="/student/interviews/:applicationId/room"
            element={
              <ProtectedRoute role="student">
                <StudentInterviewRoom />
              </ProtectedRoute>
            }
          />

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
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route
              path="jobs"
              element={
                <FeatureGate feature="jobPosting">
                  <RecruiterJobs />
                </FeatureGate>
              }
            />
            <Route
              path="applications"
              element={
                <FeatureGate feature="basicApplicantTracking">
                  <RecruiterApplications />
                </FeatureGate>
              }
            />
            <Route
              path="onboarding"
              element={
                <FeatureGate feature="onboardingManagement">
                  <RecruiterOnboardingReviews />
                </FeatureGate>
              }
            />
            <Route
              path="interviewers"
              element={
                <FeatureGate feature="humanInterviewPanel">
                  <RecruiterInterviewers />
                </FeatureGate>
              }
            />
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
            <Route path="dashboard" element={<InterviewerPanel />} />
            <Route path="panel" element={<InterviewerPanel />} />
            <Route path="interviews/:applicationId/room" element={<VirtualInterviewRoom role="interviewer" />} />
          </Route>

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role={["admin", "university_admin"]}>
              <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={
                <FeatureGate feature="adminDashboard">
                  <AdminDashboard />
                </FeatureGate>
              }
            />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route
              path="dashboard"
              element={
                <FeatureGate feature="adminDashboard">
                  <AdminDashboard />
                </FeatureGate>
              }
            />
            <Route
              path="support"
              element={
                <FeatureGate feature="adminDashboard">
                  <AdminSupport />
                </FeatureGate>
              }
            />
          </Route>

          {/* COLLEGE ADMIN */}
          <Route
            path="/college-admin"
            element={
              <ProtectedRoute role="college_admin">
                <CollegeAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CollegeAdminDashboard />} />
            <Route path="students" element={<StudentVerificationPage />} />
            <Route path="jobs" element={<CollegeJobsPage />} />
            <Route path="reports" element={<PlacementReportsPage />} />
            <Route path="support" element={<CollegeAdminSupport />} />
          </Route>

          {/* SUPER ADMIN */}
          <Route
            path="/super-admin"
            element={
              <ProtectedRoute role="super_admin">
                <SuperAdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="universities" element={<UniversitiesPage />} />
            <Route path="recruiters" element={<RecruitersPage />} />
            <Route path="colleges" element={<CollegesPage />} />
            <Route path="college-admins" element={<CreateCollegeAdminPage />} />
            <Route path="recruiter-approvals" element={<RecruiterApprovalsPage />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="settings" element={<SuperAdminSettingsPage />} />
          </Route>

          {/* CATCH-ALL — redirect unmatched URLs */}
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </BrowserRouter>
      </SubscriptionProvider>
    </ThemeProvider>
  );
}
