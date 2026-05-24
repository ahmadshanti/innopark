import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EvaluationPage from './pages/EvaluationPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import { supabase } from './lib/supabase';
import type { Submission } from './types';

function ProtectedAdmin({ onLogout }: { onLogout: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: any }) => {
      setAuthed(!!data.session);
      setChecking(false);
    });
  }, []);

  if (checking) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-navy/40 text-sm">جارٍ التحقق...</div>
    </div>
  );
  if (!authed) return <Navigate to="/login" replace />;
  return <AdminPage onBack={() => nav('/')} onLogout={onLogout} />;
}

function AppRoutes() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const nav = useNavigate();

  async function handleAdminClick() {
    const { data } = await supabase.auth.getSession();
    nav(data.session ? '/admin' : '/login');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('innopark_admin');
    nav('/');
  }

  return (
    <Routes>
      <Route path="/" element={
        <HomePage onStartEval={() => nav('/evaluation')} onAdminClick={handleAdminClick} />
      } />
      <Route path="/evaluation" element={
        <EvaluationPage
          onComplete={(sub) => { setSubmission(sub); nav('/results'); }}
          onBack={() => nav('/')}
        />
      } />
      <Route path="/results" element={
        submission
          ? <ResultsPage submission={submission} onBack={() => nav('/')} onNewEval={() => nav('/evaluation')} />
          : <Navigate to="/" replace />
      } />
      <Route path="/login" element={
        <LoginPage onLogin={() => nav('/admin')} onBack={() => nav('/')} />
      } />
      <Route path="/admin" element={<ProtectedAdmin onLogout={handleLogout} />} />
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