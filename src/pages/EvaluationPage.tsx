import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EvaluationData, ProjectInfo, DimensionScores, Submission } from '../types';
import { DIMENSIONS } from '../types';
import { calculateResults, saveSubmission } from '../utils/scoring';
import StarRating from '../components/StarRating';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

interface EvaluationPageProps {
  onComplete: (submission: Submission) => void;
  onBack: () => void;
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
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(emptyInfo);
  const [scores, setScores] = useState<Record<string, DimensionScores>>({
    technology: {}, market: {}, businessModel: {}, teamCapabilities: {}, impact: {},
  });

  const dimKey = DIM_KEYS[step - 1];
  const currentDim = step >= 1 && step <= 5 ? DIMENSIONS[dimKey] : null;
  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  function updateScore(key: string, criterion: string, val: number) {
    setScores(prev => ({ ...prev, [key]: { ...prev[key], [criterion]: val } }));
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (step === 0) {
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

  function next() {
    if (!validate()) return;
    setErrors([]); setDir(1); setStep(s => s + 1);
  }

  function prev() {
    setErrors([]); setDir(-1); setStep(s => s - 1);
  }

  function submit() {
    const data: EvaluationData = {
      projectInfo,
      technology: scores.technology,
      market: scores.market,
      businessModel: scores.businessModel,
      teamCapabilities: scores.teamCapabilities,
      impact: scores.impact,
    };
    const results = calculateResults(data);
    const submission: Submission = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('ar-SA'),
      data, results,
    };
    saveSubmission(submission).then(() => onComplete(submission));
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* Navbar */}
      <Navbar onStartEval={() => nav('/evaluation')} onAdminClick={() => nav('/admin')} />

      {/* Progress bar */}
      <div className="h-1 bg-navy/8 flex-shrink-0" style={{ marginTop: '80px' }}>
        <motion.div
          className="h-full bg-gold"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>

      {/* Stepper bar */}
      <div className="bg-white border-b border-navy/8 px-8 py-4 flex-shrink-0 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-0 min-w-[600px]">
          {[...STEPS].reverse().map((s, ri) => {
            const i = STEPS.length - 1 - ri;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center rounded-full font-bold transition-all duration-300 cursor-default select-none ${
                    i < step  ? 'w-9 h-9 bg-gold text-navy text-sm'
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
                  <div className={`h-px mb-4 mx-1 transition-all duration-500 ${
                    i < step ? 'w-8 bg-gold' : 'w-8 bg-navy/10'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-8 evaluation-content" style={{ paddingTop: '2.5rem' }}>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1"
          >
            {/* Step 0 — Project Info */}
            {step === 0 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-navy mb-2">معلومات المشروع</h2>
                  <p className="text-navy/50">أدخل بيانات مشروعك الأساسية للبدء في عملية التقييم</p>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-8 grid grid-cols-2 gap-6">
                  {[
                    { label: 'اسم المشروع *', key: 'projectName', placeholder: 'أدخل اسم مشروعك الابتكاري', col: 2 },
                    { label: 'اسم مقدم الطلب *', key: 'applicantName', placeholder: 'الاسم الكامل' },
                    { label: 'البريد الإلكتروني *', key: 'email', placeholder: 'example@najah.edu' },
                    { label: 'الجهة / الكلية *', key: 'department', placeholder: 'كلية / قسم / جهة' },
                  ].map((field) => (
                    <div key={field.key} className={field.col === 2 ? 'col-span-2' : ''}>
                      <label className="block text-sm font-bold text-navy/70 mb-2">{field.label}</label>
                      <input
                        type={field.key === 'email' ? 'email' : 'text'}
                        value={projectInfo[field.key as keyof ProjectInfo]}
                        onChange={e => setProjectInfo({ ...projectInfo, [field.key]: e.target.value })}
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

            {/* Steps 1-5 — Dimension scoring */}
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
                    <StarRating
                      key={criterion}
                      criterion={criterion}
                      value={scores[dimKey][criterion] ?? 0}
                      onChange={val => updateScore(dimKey, criterion, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 6 — Review */}
            {step === 6 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-navy mb-2">مراجعة التقييم</h2>
                  <p className="text-navy/50">راجع بياناتك قبل الإرسال النهائي</p>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-6 mb-4">
                  <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">معلومات المشروع</div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
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
                    <div className="text-white text-sm">بعد الإرسال ستحصل على تقرير مفصل كامل</div>
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

        {/* Errors */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4"
          >
            {errors.map((e, i) => (
              <div key={i} className="text-red-700 text-sm flex items-center gap-2">⚠️ {e}</div>
            ))}
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-navy/8">
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-2 text-navy/50 hover:text-navy disabled:opacity-0 transition-all font-medium"
          >
            → السابق
          </button>
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-navy' : i < step ? 'w-2 h-2 bg-gold' : 'w-2 h-2 bg-navy/15'
              }`} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={next}
              className="bg-gold text-navy font-black px-8 py-3 rounded-xl flex items-center gap-2"
            >التالي ←</motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={submit}
              className="bg-navy text-white font-black px-8 py-3 rounded-xl flex items-center gap-2"
            >إرسال التقييم ✓</motion.button>
          )}
        </div>
      </div>

      {/* Footer */}
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