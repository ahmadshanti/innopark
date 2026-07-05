import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import HomePage from './pages/HomePage';
import ApplyProjectPage from './pages/ApplyProjectPage';
import EvaluationPage from './pages/EvaluationPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HowItWorksPage from './pages/HowItWorksPage';
import JudgeDashboard from './pages/JudgeDashboard';
import ImplementationPage from './pages/ImplementationPage';
import JudgesPage from './pages/JudgesPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { AuthProvider, RequireRole } from './lib/auth';
import { CriteriaProvider } from './lib/criteria';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/implementation" element={<ImplementationPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/apply" element={<ApplyProjectPage />} />
      <Route path="/judges" element={<JudgesPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Judge profile */}
      <Route
        path="/profile"
        element={
          <RequireRole role="judge">
            <ProfilePage />
          </RequireRole>
        }
      />

      {/* Admin profile */}
      <Route
        path="/admin-profile"
        element={
          <RequireRole role="admin">
            <ProfilePage />
          </RequireRole>
        }
      />

      {/* Judge-only — project id lives in the URL so refresh / share works */}
      <Route
        path="/evaluation/:projectId"
        element={
          <RequireRole role="judge">
            <EvaluationPage />
          </RequireRole>
        }
      />
      {/* Legacy bare path → bounce to dashboard */}
      <Route path="/evaluation" element={<Navigate to="/judge" replace />} />

      <Route
        path="/judge"
        element={
          <RequireRole role="judge">
            <JudgeDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/results/:projectId"
        element={
          <RequireRole role="judge">
            <ResultsPage />
          </RequireRole>
        }
      />
      <Route path="/results" element={<Navigate to="/judge" replace />} />

      {/* Admin-only */}
      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminPage />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const reducedMotion = typeof navigator !== 'undefined' && navigator.webdriver ? 'always' : 'never';

  return (
    <div dir="rtl">
      <MotionConfig reducedMotion={reducedMotion}>
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <CriteriaProvider>
              <AppRoutes />
            </CriteriaProvider>
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </div>
  );
}
