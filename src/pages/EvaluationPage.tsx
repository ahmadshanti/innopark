import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EvaluationData, ProjectInfo, DimensionScores, Submission } from '../types';
import { DIMENSIONS } from '../types';
import { calculateResults, saveSubmission } from '../utils/scoring';
import { supabase } from '../lib/supabase';
import StarRating from '../components/StarRating';
import Navbar from '../components/Navbar';
import { useNavigate, useLocation } from 'react-router-dom';

interface EvaluationPageProps {
  onComplete: (submission: Submission) => void;
}

const STEPS = [
  { id: 0, label: 'معلومات المشروع', icon: '📋', short: 'البيانات' },
  { id: 1, label: 'التقنية', icon: '⚙️', weight: '25%', short: 'التقنية' },
  { id: 2, label: 'السوق', icon: '📈', weight: '25%', short: 'السوق' },
  { id: 3, label: 'نموذج العمل', icon: '🏢', weight: '20%', short: 'العمل' },
  { id: 4, label: 'قدرات الفريق', icon: '👥', weight: '20%', short: 'الفريق' },
  { id: 5, label: 'الأثر الاستراتيجي', icon: '🌍', weight: '10%', short: 'الأثر' },
  { id: 6, label: 'المراجعة والإرسال', icon: '✅', short: 'المراجعة' },
];

const DIM_KEYS = ['technology', 'market', 'businessModel', 'teamCapabilities', 'impact'] as const;

const emptyInfo: ProjectInfo = {
  projectName: '', applicantName: '', email: '', department: '', description: '',
};

export default function EvaluationPage({ onComplete }: EvaluationPageProps) {
  const nav = useNavigate();
  const location = useLocation();

  const editSubmission = (location.state as any)?.editSubmission ?? null;
  const editMode = !!editSubmission;

  const [authChecked, setAuthChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingProject, setCheckingProject] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [judgeId, setJudgeId] = useState<string | null>(null);
  const [judgeName, setJudgeName] = useState<string>('');

  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(() => {
    if (editMode && editSubmission.data?.projectInfo) {
      return {
        ...editSubmission.data.projectInfo,
        projectNumber: (editSubmission.data as any).projectNumber ?? '',
      } as any;
    }
    return emptyInfo;
  });

  const [scores, setScores] = useState<Record<string, DimensionScores>>(() => {
    if (editMode && editSubmission.data) {
      return {
        technology: editSubmission.data.technology || {},
        market: editSubmission.data.market || {},
        businessModel: editSubmission.data.businessModel || {},
        teamCapabilities: editSubmission.data.teamCapabilities || {},
        impact: editSubmission.data.impact || {},
      };
    }
    return { technology: {}, market: {}, businessModel: {}, teamCapabilities: {}, impact: {} };
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { nav('/login'); return; }
      if (data.session.user?.email === 'admin@innopark.ps') { nav('/admin'); return; }

      setJudgeId(data.session.user.id);

      const { data: j } = await supabase
        .from('judges')
        .select('full_name, status')
        .eq('id', data.session.user.id)
        .single();

      if (!j || j.status !== 'approved') {
        await supabase.auth.signOut();
        nav('/login');
        return;
      }

      setJudgeName(j.full_name);
      setAuthChecked(true);
    });
  }, []);

  const dimKey = DIM_KEYS[step - 1];
  const currentDim = step >= 1 && step <= 5 ? DIMENSIONS[dimKey] : null;
  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  function updateScore(key: string, criterion: string, val: number) {
    setScores(prev => ({ ...prev, [key]: { ...prev[key], [criterion]: val } }));
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (step === 0) {
      if (!(projectInfo as any).projectNumber?.trim()) errs.push('رقم المشروع مطلوب');
      if (!projectInfo.projectName.trim()) errs.push('اسم المشروع مطلوب');
      if (!projectInfo.applicantName.trim()) errs.push('اسم مقدم الطلب مطلوب');
      if (!projectInfo.email.trim()) errs.push('البريد الإلكتروني مطلوب');
      if (!projectInfo.department.trim()) errs.push('الجهة / الكلية مطلوبة');
    } else if (step >= 1 && step <= 5) {
      const key = DIM_KEYS[step - 1];
      const unrated = DIMENSIONS[key].criteria.filter(c => !scores[key][c]);
      if (unrated.length > 0) errs.push(`المعايير التالية لم تُقيَّم بعد: ${unrated.join(' ، ')}`);
    }
    setErrors(errs);
    return errs.length === 0;
  }

  async function checkDuplicateProject(projectNumber: string): Promise<boolean> {
    if (!judgeId || !projectNumber.trim() || editMode) return false;
    const { data } = await supabase
      .from('submissions')
      .select('id')
      .eq('judge_id', judgeId)
      .eq('project_number', projectNumber.trim())
      .limit(1);
    return (data?.length ?? 0) > 0;
  }

  async function next() {
    if (!validate()) return;

    if (step === 0 && judgeId && !editMode) {
      setCheckingProject(true);
      const isDuplicate = await checkDuplicateProject((projectInfo as any).projectNumber);
      setCheckingProject(false);
      if (isDuplicate) {
        setErrors(['لقد قيّمت هذا المشروع مسبقاً. كل حكّم يمكنه تقييم كل مشروع مرة واحدة فقط.']);
        return;
      }
    }

    setErrors([]); setDir(1); setStep(s => s + 1);
  }

  function prev() { setErrors([]); setDir(-1); setStep(s => s - 1); }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);

    const data: EvaluationData = {
      projectInfo,
      technology: scores.technology,
      market: scores.market,
      businessModel: scores.businessModel,
      teamCapabilities: scores.teamCapabilities,
      impact: scores.impact,
    };
    const results = calculateResults(data);

    if (editMode) {
      // تحديث التقييم الموجود
      const { error } = await supabase.from('submissions').update({
        project_name: projectInfo.projectName,
        applicant_name: projectInfo.applicantName,
        email: projectInfo.email,
        department: projectInfo.department,
        description: projectInfo.description,
        final_score: results.finalScore,
        classification: results.classification,
        classification_en: results.classificationEn,
        decision: results.decision,
        data: { ...data, projectNumber: (projectInfo as any).projectNumber },
        results,
        date: new Date().toLocaleDateString('ar-SA'),
      }).eq('id', editSubmission.id);

      if (error) console.error('Update error:', error.message);
      nav('/judge');
    } else {
      const submission: any = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('ar-SA'),
        data: { ...data, projectNumber: (projectInfo as any).projectNumber },
        results,
        judgeId: judgeId ?? undefined,
        judgeName: judgeName || undefined,
      };
      await saveSubmission(submission as Submission);
      onComplete(submission as Submission);
    }

    setSubmitting(false);
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-navy/40 text-sm">جارٍ التحقق...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <div className="h-1 bg-navy/8 flex-shrink-0" style={{ marginTop: '80px' }}>
        <motion.div className="h-full bg-gold" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
      </div>

      {editMode && (
        <div className="bg-gold/10 border-b border-gold/30 px-8 py-2 text-center">
          <span className="text-sm font-bold text-navy/70">✏️ وضع التعديل — ستُحدَّث النتائج بعد الإرسال</span>
        </div>
      )}

      <div className="bg-white border-b border-navy/8 px-8 py-4 flex-shrink-0 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-0 min-w-[600px]">
          {[...STEPS].reverse().map((s, ri) => {
            const i = STEPS.length - 1 - ri;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center rounded-full font-bold transition-all duration-300 cursor-default select-none ${
                    i < step ? 'w-9 h-9 bg-gold text-navy text-sm'
                    : i === step ? 'w-10 h-10 bg-navy text-white ring-4 ring-navy/15 text-base'
                    : 'w-8 h-8 bg-navy/6 text-navy/25 text-sm'
                  }`}>
                    {i < step ? '✓' : s.icon}
                  </div>
                  <div className={`text-xs mt-1.5 font-medium transition-colors duration-300 ${
                    i === step ? 'text-navy font-bold' : i < step ? 'text-gold' : 'text-navy/30'
                  }`}>{s.short}</div>
                </div>
                {ri < STEPS.length - 1 && (
                  <div className={`h-px mb-4 mx-1 transition-all duration-500 ${i < step ? 'w-8 bg-gold' : 'w-8 bg-navy/10'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-8 evaluation-content" style={{ paddingTop: '2.5rem' }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }} className="flex-1">

            {step === 0 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-navy mb-2">معلومات المشروع</h2>
                  <p className="text-navy/50">أدخل بيانات مشروعك الأساسية للبدء في عملية التقييم</p>
                  {judgeName && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-navy/6 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-navy/50">الحكّم:</span>
                      <span className="text-xs font-bold text-navy">{judgeName}</span>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-8 grid grid-cols-2 gap-6">
                  {[
                    { label: 'رقم المشروع *', key: 'projectNumber', placeholder: 'مثال: 001', col: 2 },
                    { label: 'اسم المشروع *', key: 'projectName', placeholder: 'أدخل اسم مشروعك الابتكاري', col: 2 },
                    { label: 'اسم مقدم الطلب *', key: 'applicantName', placeholder: 'الاسم الكامل' },
                    { label: 'البريد الإلكتروني *', key: 'email', placeholder: 'example@najah.edu' },
                    { label: 'الجهة / الكلية *', key: 'department', placeholder: 'كلية / قسم / جهة' },
                  ].map((field) => (
                    <div key={field.key} className={field.col === 2 ? 'col-span-2' : ''}>
                      <label className="block text-sm font-bold text-navy/70 mb-2">{field.label}</label>
                      <input
                        type={field.key === 'email' ? 'email' : 'text'}
                        value={(projectInfo as any)[field.key] ?? ''}
                        onChange={e => setProjectInfo({ ...projectInfo, [field.key]: e.target.value } as any)}
                        placeholder={field.placeholder}
                        className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all bg-cream/50 placeholder:text-navy/25"
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-navy/70 mb-2">وصف مختصر للمشروع</label>
                    <textarea
                      value={projectInfo.description}
                      onChange={e => setProjectInfo({ ...projectInfo, description: e.target.value })}
                      placeholder="اكتب وصفاً مختصراً لفكرة مشروعك..."
                      rows={4}
                      className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all bg-cream/50 placeholder:text-navy/25 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {step >= 1 && step <= 5 && currentDim && (
              <div>
                <div className="mb-8 flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-navy/6 rounded-lg px-3 py-1.5 mb-3">
                      <span className="text-xs font-bold text-navy/50 uppercase tracking-widest">المحور {step} من 5</span>
                      <span className="text-xs font-black text-gold">وزن {DIMENSIONS[dimKey].weight}%</span>
                    </div>
                    <h2 className="text-3xl font-black text-navy mb-2">{currentDim.nameAr}</h2>
                    <p className="text-navy/50">قيّم كل معيار من 1 (ضعيف جداً) إلى 5 (ممتاز)</p>
                  </div>
                  <div className="bg-navy rounded-2xl p-4 text-center min-w-[90px]">
                    <div className="text-2xl font-black text-gold">
                      {Object.keys(scores[dimKey]).length > 0
                        ? (Object.values(scores[dimKey]).reduce((a, b) => a + b, 0) / Object.keys(scores[dimKey]).length).toFixed(1)
                        : '—'}
                    </div>
                    <div className="text-white/40 text-xs mt-1">متوسط</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-8">
                  {currentDim.criteria.map(criterion => (
                    <StarRating key={criterion} criterion={criterion}
                      value={scores[dimKey][criterion] ?? 0}
                      onChange={val => updateScore(dimKey, criterion, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-navy mb-2">{editMode ? 'مراجعة التعديلات' : 'مراجعة التقييم'}</h2>
                  <p className="text-navy/50">راجع بياناتك قبل الإرسال النهائي</p>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-6 mb-4">
                  <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">معلومات المشروع</div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'رقم المشروع', val: (projectInfo as any).projectNumber },
                      { label: 'اسم المشروع', val: projectInfo.projectName },
                      { label: 'مقدم الطلب', val: projectInfo.applicantName },
                      { label: 'البريد الإلكتروني', val: projectInfo.email },
                      { label: 'الجهة / الكلية', val: projectInfo.department },
                    ].map(f => (
                      <div key={f.label}>
                        <div className="text-xs text-navy/40 mb-0.5">{f.label}</div>
                        <div className="text-sm font-bold text-navy">{f.val || '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-6 mb-4">
                  <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">درجات المحاور</div>
                  <div className="space-y-3">
                    {DIM_KEYS.map(key => {
                      const dim = DIMENSIONS[key];
                      const vals = Object.values(scores[key]);
                      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      const weighted = (avg / 5) * dim.weight;
                      return (
                        <div key={key} className="flex items-center gap-4">
                          <div className="w-36 text-sm font-medium text-navy/70">{dim.nameAr}</div>
                          <div className="flex-1 h-2 bg-navy/6 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(avg / 5) * 100}%` }} />
                          </div>
                          <div className="text-sm font-bold text-navy w-10 text-left">{avg.toFixed(1)}/5</div>
                          <div className="text-xs text-navy/40 w-16 text-left">{weighted.toFixed(1)} من {dim.weight}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-navy rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <div className="text-white/50 text-sm mb-1">الدرجة المتوقعة</div>
                    <div className="text-white text-sm">{editMode ? 'سيتم تحديث نتائج التقييم السابق' : 'بعد الإرسال ستحصل على تقرير مفصل كامل'}</div>
                  </div>
                  <div className="text-5xl font-black text-gold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {DIM_KEYS.reduce((total, key) => {
                      const dim = DIMENSIONS[key];
                      const vals = Object.values(scores[key]);
                      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      return total + (avg / 5) * dim.weight;
                    }, 0).toFixed(1)}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {errors.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            {errors.map((e, i) => <div key={i} className="text-red-700 text-sm flex items-center gap-2">⚠️ {e}</div>)}
          </motion.div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-navy/8">
          <button onClick={prev} disabled={step === 0}
            className="flex items-center gap-2 text-navy/50 hover:text-navy disabled:opacity-0 transition-all font-medium">
            → السابق
          </button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-navy' : i < step ? 'w-2 h-2 bg-gold' : 'w-2 h-2 bg-navy/15'}`} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => next()} disabled={checkingProject}
              className="bg-gold text-navy font-black px-8 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
              {checkingProject ? 'جارٍ التحقق...' : 'التالي ←'}
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={submit} disabled={submitting}
              className="bg-navy text-white font-black px-8 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
              {submitting ? 'جارٍ الحفظ...' : editMode ? 'حفظ التعديلات ✓' : 'إرسال التقييم ✓'}
            </motion.button>
          )}
        </div>
      </div>

      <footer className="bg-[#0f1e47] py-6 px-8 mt-auto flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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