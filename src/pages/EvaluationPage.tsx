import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { EvaluationData, DimensionScores, Submission } from '../types';
import { calculateResults } from '../utils/scoring';
import { useAuth } from '../lib/use-auth';
import { useCriteria } from '../lib/criteria';
import { loadProjectWithReview, saveReview, type ProjectWithReview } from '../lib/reviews';
import StarRating from '../components/StarRating';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface EvaluationPageProps {
  onComplete: (submission: Submission) => void;
}

const DIM_ICONS: Record<string, string> = {
  technology: '⚙️',
  market: '📈',
  businessModel: '🏢',
  teamCapabilities: '👥',
  impact: '🌍',
};
const DIM_SHORT: Record<string, string> = {
  technology: 'التقنية',
  market: 'السوق',
  businessModel: 'العمل',
  teamCapabilities: 'الفريق',
  impact: 'الأثر',
};

interface NavState { project?: { id: string } | null }

export default function EvaluationPage({ onComplete }: EvaluationPageProps) {
  const nav = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();
  const { dimensions, loading: critLoading } = useCriteria();

  const projectId = (location.state as NavState | null)?.project?.id ?? null;
  const judgeName = profile?.full_name?.trim() || session?.user.email || '';

  const [ctx, setCtx] = useState<ProjectWithReview | null>(null);
  const [ctxError, setCtxError] = useState<string>('');
  const [ctxLoading, setCtxLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<Record<string, DimensionScores>>({});

  const DIM_KEYS = useMemo(() => dimensions.map((d) => d.key), [dimensions]);
  const dimCount = DIM_KEYS.length;
  const startContextLoad = useEffectEvent(() => {
    setCtxLoading(true);
    setCtxError('');
  });
  const finishContextLoad = useEffectEvent(() => {
    setCtxLoading(false);
  });
  const applyContext = useEffectEvent((data: ProjectWithReview) => {
    setCtx(data);
  });
  const failContextLoad = useEffectEvent((message: string) => {
    setCtxError(message);
  });

  const STEPS = useMemo(() => {
    const steps: { id: number; label: string; icon: string; short: string }[] = [
      { id: 0, label: 'ملخص المشروع', icon: '📋', short: 'المشروع' },
    ];
    dimensions.forEach((d, i) => {
      steps.push({
        id: i + 1,
        label: d.nameAr,
        icon: DIM_ICONS[d.key] ?? '📊',
        short: DIM_SHORT[d.key] ?? d.nameAr,
      });
    });
    steps.push({ id: dimensions.length + 1, label: 'المراجعة والإرسال', icon: '✅', short: 'المراجعة' });
    return steps;
  }, [dimensions]);

  // Fetch project + my review once per projectId — no per-step refetch.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      startContextLoad();
      try {
        const data = await loadProjectWithReview(projectId);
        if (!cancelled) applyContext(data);
      } catch (e) {
        if (!cancelled) failContextLoad(e instanceof Error ? e.message : 'تعذّر تحميل بيانات المشروع');
      } finally {
        if (!cancelled) finishContextLoad();
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const seededScores = useMemo(() => {
    if (!ctx?.myReview || dimensions.length === 0) return {};
    const idToName: Record<string, { key: string; name: string }> = {};
    dimensions.forEach((d) =>
      Object.entries(d.criteriaIds).forEach(([name, id]) => { idToName[id] = { key: d.key, name }; }),
    );
    const seeded: Record<string, DimensionScores> = {};
    ctx.myReview.scores.forEach(({ criterion_id, score }) => {
      const m = idToName[criterion_id];
      if (!m) return;
      seeded[m.key] = { ...(seeded[m.key] ?? {}), [m.name]: score };
    });
    return seeded;
  }, [ctx, dimensions]);
  const currentScores = Object.keys(scores).length > 0 ? scores : seededScores;

  // ── derived ────────────────────────────────────────────────────────────
  const editMode = !!ctx?.myReview;
  const dimKey = DIM_KEYS[step - 1];
  const currentDim = step >= 1 && step <= dimCount ? dimensions[step - 1] : null;
  const progress = STEPS.length > 1 ? Math.round((step / (STEPS.length - 1)) * 100) : 0;

  function updateScore(key: string, criterion: string, val: number) {
    setScores((prev) => {
      const base = Object.keys(prev).length > 0 ? prev : currentScores;
      return { ...base, [key]: { ...base[key], [criterion]: val } };
    });
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (step >= 1 && step <= dimCount) {
      const dim = dimensions[step - 1];
      const dimScores = currentScores[dim.key] || {};
      const unrated = dim.criteria.filter((c) => !dimScores[c]);
      if (unrated.length > 0) errs.push(`المعايير التالية لم تُقيَّم بعد: ${unrated.join(' ، ')}`);
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function next() {
    if (!validate()) return;
    setErrors([]); setDir(1); setStep((s) => s + 1);
  }
  function prev() { setErrors([]); setDir(-1); setStep((s) => s - 1); }

  async function submit() {
    if (submitting || !ctx) return;
    setSubmitting(true);
    setErrors([]);
    try {
      const data: EvaluationData = {
        projectInfo: {
          projectName: ctx.project.project_name,
          applicantName: ctx.project.applicant_name,
          email: ctx.project.email,
          department: ctx.project.department ?? '',
          description: ctx.project.description ?? '',
        },
        ...Object.fromEntries(DIM_KEYS.map((k) => [k, currentScores[k] ?? {}])),
      };
      const results = calculateResults(data, dimensions);

      // Flatten {dimKey → {critName → 1..5}} into [{criterion_id, score}] using real DB UUIDs.
      // Fallback static IDs (prefixed "static-") are skipped — those only appear when the DB
      // hasn't been seeded, in which case the RPC would reject the row anyway.
      const flatScores = dimensions.flatMap((dim) =>
        Object.entries(currentScores[dim.key] ?? {}).flatMap(([name, score]) => {
          const cid = dim.criteriaIds[name];
          if (!cid || cid.startsWith('static-') || score < 1 || score > 5) return [];
          return [{ criterion_id: cid, score: score as 1 | 2 | 3 | 4 | 5 }];
        }),
      );

      await saveReview({
        projectId: ctx.project.id,
        scores: flatScores,
        finalScore: results.finalScore,
        classification: results.classification,
        submit: true,
      });

      onComplete({
        id: ctx.project.id,
        date: new Date().toLocaleDateString('ar-SA'),
        data,
        results,
      });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'تعذّر حفظ التقييم. حاول مرة أخرى.']);
    } finally {
      setSubmitting(false);
    }
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  };

  // ── conditional renders after all hooks ────────────────────────────────
  if (!projectId) return <Navigate to="/judge" replace />;

  if (ctxLoading || critLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center" dir="rtl">
        <div className="text-navy/40">جارٍ تحميل بيانات المشروع...</div>
      </div>
    );
  }
  if (ctxError) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3" dir="rtl">
        <div className="text-3xl">⚠️</div>
        <div className="text-red-700 font-bold">{ctxError}</div>
        <button onClick={() => nav('/judge')} className="text-navy/70 hover:text-navy text-sm font-medium">
          → العودة للوحة الحكّام
        </button>
      </div>
    );
  }
  if (!ctx) return <Navigate to="/judge" replace />;

  const project = ctx.project;

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      <div className="h-1 bg-navy/8 flex-shrink-0" style={{ marginTop: '80px' }}>
        <motion.div className="h-full bg-gold" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
      </div>

      {editMode && (
        <div className="bg-gold/10 border-b border-gold/30 px-8 py-2 text-center">
          <span className="text-sm font-bold text-navy/70">✏️ وضع التعديل — ستُحدَّث النتائج عند الإرسال</span>
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
                  <div className="inline-flex items-center gap-2 bg-gold/15 rounded-lg px-3 py-1.5 mb-3">
                    <span className="text-xs font-bold text-navy/70">رقم المشروع</span>
                    <span className="text-xs font-black text-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>#{project.project_number}</span>
                  </div>
                  <h2 className="text-3xl font-black text-navy mb-2">{project.project_name}</h2>
                  <p className="text-navy/50">ملخص المشروع — البيانات معتمدة من الإدارة ولا يمكن تعديلها.</p>
                  {judgeName && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-navy/6 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-navy/50">الحكّم:</span>
                      <span className="text-xs font-bold text-navy">{judgeName}</span>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-8 grid grid-cols-2 gap-6">
                  <ReadField label="نوع المشروع" value={project.project_type === 'team' ? 'فريق' : 'فردي'} />
                  <ReadField label="مقدم الطلب" value={project.applicant_name} />
                  <ReadField label="البريد الإلكتروني" value={project.email} ltr />
                  <ReadField label="الجهة / الكلية" value={project.department ?? '—'} />
                  <ReadField label="وصف المشروع" value={project.description ?? '—'} col={2} />
                  {ctx.members.length > 0 && (
                    <div className="col-span-2">
                      <div className="text-xs text-navy/40 mb-2">أعضاء الفريق</div>
                      <div className="flex flex-wrap gap-2">
                        {ctx.members.map((m) => (
                          <span key={m.id} className="text-xs font-bold text-navy bg-navy/6 px-3 py-1.5 rounded-lg">
                            {m.full_name}{m.role ? <span className="text-navy/40"> — {m.role}</span> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step >= 1 && step <= dimCount && currentDim && (
              <div>
                <div className="mb-8 flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-navy/6 rounded-lg px-3 py-1.5 mb-3">
                      <span className="text-xs font-bold text-navy/50 uppercase tracking-widest">المحور {step} من {dimCount}</span>
                      <span className="text-xs font-black text-gold">وزن {currentDim.weight}%</span>
                    </div>
                    <h2 className="text-3xl font-black text-navy mb-2">{currentDim.nameAr}</h2>
                    <p className="text-navy/50">قيّم كل معيار من 1 (ضعيف جداً) إلى 5 (ممتاز)</p>
                  </div>
                  <div className="bg-navy rounded-2xl p-4 text-center min-w-[90px]">
                    <div className="text-2xl font-black text-gold">
                      {Object.keys(currentScores[dimKey] || {}).length > 0
                        ? (Object.values(currentScores[dimKey] || {}).reduce((a, b) => a + b, 0) / Object.keys(currentScores[dimKey] || {}).length).toFixed(1)
                        : '—'}
                    </div>
                    <div className="text-white/40 text-xs mt-1">متوسط</div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-8">
                  {currentDim.criteria.map((criterion) => (
                    <StarRating key={criterion} criterion={criterion}
                      value={(currentScores[dimKey] || {})[criterion] ?? 0}
                      onChange={(val) => updateScore(dimKey, criterion, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === STEPS.length - 1 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-navy mb-2">{editMode ? 'مراجعة التعديلات' : 'مراجعة التقييم'}</h2>
                  <p className="text-navy/50">راجع بياناتك قبل الإرسال النهائي</p>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-6 mb-4">
                  <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">المشروع</div>
                  <div className="grid grid-cols-2 gap-4">
                    <ReadField label="رقم المشروع" value={`#${project.project_number}`} />
                    <ReadField label="اسم المشروع" value={project.project_name} />
                    <ReadField label="مقدم الطلب" value={project.applicant_name} />
                    <ReadField label="النوع" value={project.project_type === 'team' ? 'فريق' : 'فردي'} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-navy/8 p-6 mb-4">
                  <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">درجات المحاور</div>
                  <div className="space-y-3">
                    {dimensions.map((dim) => {
                      const vals = Object.values(currentScores[dim.key] || {});
                      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                      const weighted = (avg / 5) * dim.weight;
                      return (
                        <div key={dim.key} className="flex items-center gap-4">
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
                    {dimensions.reduce((total, dim) => {
                      const vals = Object.values(currentScores[dim.key] || {});
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
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={next}
              className="bg-gold text-navy font-black px-8 py-3 rounded-xl flex items-center gap-2">
              التالي ←
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={submit} disabled={submitting}
              className="bg-navy text-white font-black px-8 py-3 rounded-xl flex items-center gap-2 disabled:opacity-60">
              {submitting ? 'جارٍ الحفظ...' : editMode ? 'حفظ التعديلات ✓' : 'إرسال التقييم ✓'}
            </motion.button>
          )}
        </div>
      </div>

      <Footer containerClassName="max-w-4xl" className="py-6 px-8 mt-auto" />
    </div>
  );
}

function ReadField({ label, value, col = 1, ltr = false }: { label: string; value: string; col?: 1 | 2; ltr?: boolean }) {
  return (
    <div className={col === 2 ? 'col-span-2' : ''}>
      <div className="text-xs text-navy/40 mb-1">{label}</div>
      <div className="text-sm font-bold text-navy bg-cream/50 border border-navy/10 rounded-xl px-4 py-3" dir={ltr ? 'ltr' : undefined}>
        {value || '—'}
      </div>
    </div>
  );
}
