import { useState } from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { AuthProvider, RequireRole } from './lib/auth';
import { CriteriaProvider } from './lib/criteria';
import type { Submission } from './types';

function AppRoutes() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const nav = useNavigate();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/implementation" element={<ImplementationPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/apply" element={<ApplyProjectPage />} />

      {/* Judge-only — must arrive with a project picked from the dashboard */}
      <Route
        path="/evaluation"
        element={
          <RequireRole role="judge">
            <RequireProjectContext>
              <EvaluationPage onComplete={(sub) => { setSubmission(sub); nav('/results'); }} />
            </RequireProjectContext>
          </RequireRole>
        }
      />
      <Route
        path="/judge"
        element={
          <RequireRole role="judge">
            <JudgeDashboard />
          </RequireRole>
        }
      />

      {/* Results screen — only meaningful after an evaluation in this session */}
      <Route
        path="/results"
        element={
          submission
            ? <ResultsPage submission={submission} onBack={() => nav('/')} onNewEval={() => nav('/evaluation')} />
            : <Navigate to="/" replace />
        }
      />

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

function RequireProjectContext({ children }: { children: ReactElement }) {
  const loc = useLocation();
  const s = loc.state as { project?: { id?: string } | null } | null;
  if (!s?.project?.id) return <Navigate to="/judge" replace />;
  return children;
}

export default function App() {
  const reducedMotion = typeof navigator !== 'undefined' && navigator.webdriver ? 'always' : 'user';

  return (
    <div dir="rtl">
      <MotionConfig reducedMotion={reducedMotion}>
        <BrowserRouter>
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
