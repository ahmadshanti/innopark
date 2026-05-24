import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EvaluationPage from './pages/EvaluationPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import HowItWorksPage from './pages/HowItWorksPage';
import JudgeDashboard from './pages/JudgeDashboard';
import ImplementationPage from './pages/ImplementationPage';
import type { Submission } from './types';

function AppRoutes() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const nav = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/implementation" element={<ImplementationPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/evaluation" element={
        <EvaluationPage onComplete={(sub) => { setSubmission(sub); nav('/results'); }} />
      } />
      <Route path="/results" element={
        submission
          ? <ResultsPage submission={submission} onBack={() => nav('/')} onNewEval={() => nav('/evaluation')} />
          : <Navigate to="/" replace />
      } />
      <Route path="/judge" element={<JudgeDashboard />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div dir="rtl">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}
