import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Navbar } from "./components/Navbar";
import { AuthProvider, RequireAdmin, RequireAuth, RequireLearner } from "./lib/auth";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CheckoutReturnPage } from "./pages/CheckoutReturnPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LandingPage } from "./pages/LandingPage";
import { LessonPage } from "./pages/LessonPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuizPage } from "./pages/QuizPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ScoresPage } from "./pages/ScoresPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/admin/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function AppRoutes() {
  const location = useLocation();
  const isPublicRoute = PUBLIC_PATHS.has(location.pathname);

  const routes = (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage isAdmin />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Authenticated Learner (admins redirect to /admin) */}
      <Route
        path="/dashboard"
        element={
          <RequireLearner>
            <DashboardPage />
          </RequireLearner>
        }
      />
      <Route
        path="/lessons/today"
        element={
          <RequireLearner>
            <LessonPage mode="today" />
          </RequireLearner>
        }
      />
      <Route
        path="/lessons/:lessonId"
        element={
          <RequireLearner>
            <LessonPage mode="byId" />
          </RequireLearner>
        }
      />
      <Route
        path="/lessons/:lessonId/quiz"
        element={
          <RequireLearner>
            <QuizPage />
          </RequireLearner>
        }
      />
      <Route
        path="/scores"
        element={
          <RequireLearner>
            <ScoresPage />
          </RequireLearner>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout"
        element={
          <RequireLearner>
            <CheckoutPage />
          </RequireLearner>
        }
      />
      <Route
        path="/checkout/callback"
        element={
          <RequireLearner>
            <CheckoutReturnPage mode="callback" />
          </RequireLearner>
        }
      />
      <Route
        path="/checkout/success"
        element={
          <RequireLearner>
            <CheckoutReturnPage mode="success" />
          </RequireLearner>
        }
      />
      <Route
        path="/checkout/failure"
        element={
          <RequireLearner>
            <CheckoutReturnPage mode="failure" />
          </RequireLearner>
        }
      />

      {/* Role-Guarded Admin */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] text-zinc-900">
        <Navbar />
        <main>{routes}</main>
      </div>
    );
  }

  return <AppShell>{routes}</AppShell>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
