import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Navbar } from "./components/Navbar";
import { AuthProvider, RequireAdmin, RequireAuth } from "./lib/auth";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CheckoutReturnPage } from "./pages/CheckoutReturnPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LandingPage } from "./pages/LandingPage";
import { LessonPage } from "./pages/LessonPage";
import { LoginPage } from "./pages/LoginPage";
import { QuizPage } from "./pages/QuizPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ScoresPage } from "./pages/ScoresPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
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
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Authenticated Learner */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/lessons/today"
        element={
          <RequireAuth>
            <LessonPage mode="today" />
          </RequireAuth>
        }
      />
      <Route
        path="/lessons/:lessonId"
        element={
          <RequireAuth>
            <LessonPage mode="byId" />
          </RequireAuth>
        }
      />
      <Route
        path="/lessons/:lessonId/quiz"
        element={
          <RequireAuth>
            <QuizPage />
          </RequireAuth>
        }
      />
      <Route
        path="/scores"
        element={
          <RequireAuth>
            <ScoresPage />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout"
        element={
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout/callback"
        element={
          <RequireAuth>
            <CheckoutReturnPage mode="callback" />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout/success"
        element={
          <RequireAuth>
            <CheckoutReturnPage mode="success" />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout/failure"
        element={
          <RequireAuth>
            <CheckoutReturnPage mode="failure" />
          </RequireAuth>
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
