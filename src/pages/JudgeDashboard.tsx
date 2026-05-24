import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface JudgeInfo {
  id: string;
  full_name: string;
  email: string;
  status: string;
}

interface JudgeSubmission {
  id: string;
  date: string;
  projectNumber: string | null;
  projectName: string | null;
  finalScore: number | null;
  classification: string | null;
  // full data for editing
  data: any;
  results: any;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  'غير جاهز':       { bg: '#FCEBEB', text: '#A32D2D' },
  'مبكر جداً':      { bg: '#FAEEDA', text: '#854F0B' },
  'جاهز للاحتضان': { bg: '#E6F1FB', text: '#185FA5' },
  'متقدم':          { bg: '#E1F5EE', text: '#0F6E56' },
  'عالي النضج':     { bg: '#EEEDFE', text: '#534AB7' },
};

export default function JudgeDashboard() {
  const nav = useNavigate();
  const [judge, setJudge] = useState<JudgeInfo | null>(null);
  const [submissions, setSubmissions] = useState<JudgeSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav('/login'); return; }

      if (session.user.email === 'admin@innopark.ps') { nav('/admin'); return; }

      const { data: judgeData } = await supabase
        .from('judges')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!judgeData || judgeData.status !== 'approved') {
        await supabase.auth.signOut();
        nav('/login');
        return;
      }

      setJudge(judgeData);

      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('judge_id', session.user.id)
        .order('created_at', { ascending: false });

      if (subs) {
        setSubmissions(subs.map((row: any) => ({
          id: row.id,
          date: row.date,
          projectNumber: row.project_number ?? (row.data as any)?.projectNumber ?? null,
          projectName: row.project_name ?? row.data?.projectInfo?.projectName ?? null,
          finalScore: row.final_score ?? row.results?.finalScore ?? null,
          classification: row.classification ?? row.results?.classification ?? null,
          data: row.data,
          results: row.results,
        })));
      }
      setLoading(false);
    }
    init();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    nav('/');
  }

  function handleEdit(sub: JudgeSubmission) {
    nav('/evaluation', {
      state: {
        editSubmission: {
          id: sub.id,
          data: sub.data,
          results: sub.results,
        },
      },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy/40">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      {/* Header */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '100px', paddingBottom: '32px' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-white/40 text-sm mb-1">لوحة الحكّام</div>
            <h1 className="text-2xl md:text-3xl font-black text-white">مرحباً، {judge?.full_name}</h1>
            <div className="text-white/40 text-sm mt-1">{judge?.email}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center bg-white/8 rounded-xl p-4">
              <div className="text-3xl font-black text-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {submissions.length}
              </div>
              <div className="text-white/40 text-xs mt-1">تقييم أجريته</div>
            </div>
            <div className="flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => nav('/evaluation')}
                className="bg-gold text-navy font-black text-sm px-5 py-2.5 rounded-lg"
              >
                + تقييم جديد
              </motion.button>
              <button
                onClick={handleLogout}
                className="text-white/40 hover:text-red-400 text-sm transition-colors text-center"
              >
                🚪 تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        <h2 className="text-xl font-black text-navy mb-6">تقييماتي السابقة</h2>

        {submissions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
            <div className="text-5xl mb-4">📋</div>
            <div className="text-navy/40 font-medium mb-4">لم تُجرِ أي تقييم بعد</div>
            <button
              onClick={() => nav('/evaluation')}
              className="bg-gold text-navy font-black px-6 py-3 rounded-xl text-sm"
            >
              ابدأ أول تقييم
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
            <div className="hidden md:grid grid-cols-6 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider">
              <div>رقم المشروع</div>
              <div className="col-span-2">اسم المشروع</div>
              <div>الدرجة</div>
              <div>التصنيف</div>
              <div>تعديل</div>
            </div>
            <div className="divide-y divide-navy/5">
              {submissions.map((sub, i) => {
                const c = LEVEL_COLORS[sub.classification ?? ''] ?? { bg: '#f1f5f9', text: '#64748b' };
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-4 md:px-6 py-4 md:grid md:grid-cols-6 md:items-center space-y-2 md:space-y-0 hover:bg-cream transition-colors"
                  >
                    <div className="font-bold text-gold text-sm" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                      {sub.projectNumber || '—'}
                    </div>
                    <div className="md:col-span-2">
                      <div className="font-bold text-navy text-sm">{sub.projectName || '—'}</div>
                      <div className="text-xs text-navy/40 mt-0.5">{sub.date}</div>
                    </div>
                    <div className="font-black text-navy text-xl" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                      {sub.finalScore ?? '—'}
                    </div>
                    <div>
                      {sub.classification ? (
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: c.bg, color: c.text }}
                        >
                          {sub.classification}
                        </span>
                      ) : '—'}
                    </div>
                    <div>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(sub)}
                        className="text-xs bg-navy text-white font-bold px-4 py-1.5 rounded-lg hover:bg-navy/80 transition-colors"
                      >
                        ✏️ تعديل
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <footer className="bg-[#0f1e47] py-6 px-8 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="INNOPARK" width={36} height={36} style={{ objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: '#F5A623', fontSize: '13px', letterSpacing: '2px' }}>INNOPARK</div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>حديقة النجاح للابتكار</div>
            </div>
          </div>
          <div className="text-white/20 text-xs">© 2026 جميع الحقوق محفوظة</div>
        </div>
      </footer>
    </div>
  );
}
