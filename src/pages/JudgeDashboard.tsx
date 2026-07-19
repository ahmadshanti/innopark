import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/use-auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import type { JudgeProject } from '../types/db';

type LoadState = 'loading' | 'ready' | 'error';

const TYPE_LABEL: Record<JudgeProject['project_type'], string> = {
  individual: 'فردي',
  team: 'فريق',
};

// Normalise common Arabic variants (alef forms, ya/alef-maksura, hamza, tatweel,
// diacritics) so search "أحمد" matches "احمد".
function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

export default function JudgeDashboard() {
  const nav = useNavigate();
  const { session, profile } = useAuth();

  const [projects, setProjects] = useState<JudgeProject[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [query, setQuery] = useState('');

  const judgeName = profile?.full_name?.trim() || session?.user.email || '';
  const judgeEmail = session?.user.email ?? '';


  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    (async () => {
      setState('loading');
      const { data, error } = await supabase
        .from('judge_projects')
        .select(
          'id, project_number, project_name, project_type, applicant_name, department, description, created_at, reviewed_by_me, has_draft',
        )
        .order('project_number', { ascending: true });

      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message);
        setState('error');
        return;
      }
      setProjects((data ?? []) as JudgeProject[]);
      setState('ready');
    })();

    return () => { cancelled = true; };
  }, [session]);

  const reviewedCount = useMemo(
    () => projects.filter(p => p.reviewed_by_me).length,
    [projects],
  );

  const filtered = useMemo(() => {
    const q = normalizeArabic(query.trim().toLowerCase());
    if (!q) return projects;
    return projects.filter(p => {
      const haystack = normalizeArabic(
        [
          p.project_name,
          String(p.project_number),
          p.applicant_name,
          p.department ?? '',
          p.description ?? '',
        ].join(' ').toLowerCase(),
      );
      return haystack.includes(q);
    });
  }, [projects, query]);

  async function openProject(p: JudgeProject) {
    if (p.status === 'ready') {
      await supabase.rpc('start_evaluation', { p_project_id: p.id });
      setProjects(prev => prev.map(x => x.id === p.id ? { ...x, status: 'under_evaluation' as const } : x));
    }
    nav(`/evaluation/${p.id}`);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      {/* Header */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '100px', paddingBottom: '32px' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-white/40 text-sm mb-1">لوحة الحكّام</div>
            <h1 className="text-2xl md:text-3xl font-black text-white">مرحباً، {judgeName}</h1>
            <div className="text-white/40 text-sm mt-1">{judgeEmail}</div>
          </div>
          <div className="text-center bg-white/8 rounded-xl p-4">
            <div className="text-3xl font-black text-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              {reviewedCount}
              <span className="text-white/30 text-lg"> / {projects.length}</span>
            </div>
            <div className="text-white/40 text-xs mt-1">مشاريع قُيِّمت</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-black text-navy">المشاريع المعتمدة للتقييم</h2>
            <p className="text-navy/50 text-sm mt-1">اختر مشروعاً لبدء التقييم. لا يمكن تقييم المشروع نفسه أكثر من مرة.</p>
          </div>
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث باسم المشروع أو رقمه..."
              className="w-full bg-white border border-navy/15 rounded-xl pr-10 pl-4 py-2.5 text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/30 text-sm">🔍</span>
          </div>
        </div>

        {state === 'loading' && (
          <div className="bg-white rounded-2xl border border-navy/8 py-20 text-center text-navy/40">
            جارٍ تحميل المشاريع...
          </div>
        )}

        {state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-red-700 font-bold mb-1">تعذّر تحميل المشاريع</div>
            <div className="text-red-700/70 text-sm">{errorMsg}</div>
          </div>
        )}

        {state === 'ready' && projects.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-navy/40 font-medium">لا توجد مشاريع معتمدة حالياً</div>
            <div className="text-navy/30 text-sm mt-2">سيتم إشعارك عندما تعتمد الإدارة مشاريع جديدة.</div>
          </div>
        )}

        {state === 'ready' && projects.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-navy/8">
            <div className="text-4xl mb-3">🔎</div>
            <div className="text-navy/50 font-medium">لا توجد نتائج مطابقة لـ «{query}»</div>
          </div>
        )}

        {state === 'ready' && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider">
              <div className="col-span-1">رقم</div>
              <div className="col-span-5">المشروع</div>
              <div className="col-span-2">النوع</div>
              <div className="col-span-2">الحالة</div>
              <div className="col-span-2 text-left">إجراء</div>
            </div>
            <div className="divide-y divide-navy/5">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="px-4 md:px-6 py-4 md:grid md:grid-cols-12 md:items-center md:gap-4 space-y-2 md:space-y-0 hover:bg-cream transition-colors"
                >
                  <div
                    className="md:col-span-1 font-bold text-gold text-sm"
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    #{p.project_number}
                  </div>
                  <div className="md:col-span-5">
                    <div className="font-bold text-navy text-sm">{p.project_name}</div>
                    <div className="text-xs text-navy/50 mt-0.5">
                      {p.applicant_name}
                      {p.department ? <> · <span className="text-navy/40">{p.department}</span></> : null}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-navy/6 text-navy/70">
                      {TYPE_LABEL[p.project_type]}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    {p.reviewed_by_me ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
                        ✓ قُيِّم
                      </span>
                    ) : p.has_draft ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E6F1FB] text-[#185FA5]">
                        📝 مسودة
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAEEDA] text-[#854F0B]">
                        قيد التقييم
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-2 md:text-left">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => openProject(p)}
                      className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                        p.reviewed_by_me
                          ? 'bg-navy/8 text-navy hover:bg-navy/15'
                          : 'bg-gold text-navy hover:bg-gold-dark'
                      }`}
                    >
                      {p.reviewed_by_me ? '✏️ تعديل التقييم' : p.has_draft ? 'متابعة المسودة ←' : 'بدء التقييم ←'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer containerClassName="max-w-5xl" className="py-6 px-8" />
    </div>
  );
}
