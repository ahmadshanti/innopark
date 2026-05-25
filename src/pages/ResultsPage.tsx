import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useCriteria } from '../lib/criteria';
import { loadProjectWithReview, type ProjectWithReview } from '../lib/reviews';
import { calculateResults } from '../utils/scoring';
import type { EvaluationData, EvaluationResult } from '../types';

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'غير جاهز':        { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', bar: '#E24B4A' },
  'مبكر جداً':       { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775', bar: '#EF9F27' },
  'جاهز للاحتضان':  { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', bar: '#378ADD' },
  'متقدم':           { bg: '#E1F5EE', text: '#0F6E56', border: '#5DCAA5', bar: '#1D9E75' },
  'عالي النضج':      { bg: '#EEEDFE', text: '#534AB7', border: '#CECBF6', bar: '#F5A623' },
};

// RFC-4180 style CSV cell quoting.
function csvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function safeFilename(s: string): string {
  // strip filesystem-hostile chars and trim length
  return s.replace(/[\\/:*?"<>|\n\r\t]/g, '').trim().slice(0, 80) || 'report';
}

export default function ResultsPage() {
  const nav = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { dimensions, loading: critLoading } = useCriteria();

  const [ctx, setCtx] = useState<ProjectWithReview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    (async () => {
      try {
        const data = await loadProjectWithReview(projectId);
        if (!cancelled) setCtx(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذّر تحميل النتائج');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const results = useMemo<EvaluationResult | null>(() => {
    if (!ctx?.myReview || dimensions.length === 0) return null;
    const idToName: Record<string, { key: string; name: string }> = {};
    dimensions.forEach((d) =>
      Object.entries(d.criteriaIds).forEach(([name, id]) => {
        idToName[id] = { key: d.key, name };
      }),
    );
    const scoresByDim: Record<string, Record<string, number>> = {};
    ctx.myReview.scores.forEach(({ criterion_id, score }) => {
      const m = idToName[criterion_id];
      if (!m) return;
      scoresByDim[m.key] = { ...(scoresByDim[m.key] ?? {}), [m.name]: score };
    });
    const data: EvaluationData = {
      projectInfo: {
        projectName: ctx.project.project_name,
        applicantName: ctx.project.applicant_name,
        email: ctx.project.email,
        department: ctx.project.department ?? '',
        description: ctx.project.description ?? '',
      },
      ...scoresByDim,
    };
    return calculateResults(data, dimensions);
  }, [ctx, dimensions]);

  if (loading || critLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center" dir="rtl">
        <div className="text-navy/40">جارٍ تحميل النتائج...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3" dir="rtl">
        <div className="text-3xl">⚠️</div>
        <div className="text-red-700 font-bold">{error}</div>
        <button onClick={() => nav('/judge')} className="text-navy/70 hover:text-navy text-sm font-medium">
          → العودة للوحة الحكّام
        </button>
      </div>
    );
  }
  if (!ctx || !ctx.myReview || !ctx.myReview.submitted_at || !results) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-3" dir="rtl">
        <div className="text-3xl">📝</div>
        <div className="text-navy/70 font-bold">لم يتم إرسال تقييم لهذا المشروع بعد.</div>
        <button onClick={() => nav('/judge')} className="text-navy/70 hover:text-navy text-sm font-medium">
          → العودة للوحة الحكّام
        </button>
      </div>
    );
  }

  const project = ctx.project;
  const color = LEVEL_COLORS[results.classification] ?? LEVEL_COLORS['متقدم'];
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (results.finalScore / 100) * circumference;
  const submittedAt = ctx.myReview.submitted_at
    ? new Date(ctx.myReview.submitted_at).toLocaleDateString('ar-SA')
    : '';

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    if (!results) return;
    const rows = [
      ['المحور', 'المتوسط', 'الوزن', 'الدرجة الموزونة'],
      ...results.dimensions.map(d => [d.nameAr, d.avgScore, `${d.weight}%`, d.weightedScore]),
      ['الدرجة النهائية', '', '', results.finalScore],
    ];
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFilename(`تقرير_${project.project_number}_${project.project_name}`)}_${submittedAt || 'report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '80px', paddingBottom: '32px' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-8 mb-6">
            <div className="relative flex-shrink-0" style={{ width: '120px', height: '120px' }}>
              <svg width="120" height="120" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <motion.circle
                  cx="64" cy="64" r="54"
                  fill="none"
                  stroke={color.bar}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {results.finalScore}
                </span>
                <span className="text-white/40 text-xs">/ 100</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-white/50 text-sm mb-1">المشروع</div>
              <div className="text-white text-2xl font-black mb-3">{project.project_name}</div>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
                style={{ background: color.bg, color: color.text }}
              >
                {results.classification}
                <span className="text-xs opacity-60">— {results.classificationEn}</span>
              </div>
            </div>

            <div className="border border-white/10 rounded-2xl p-4 md:p-5 w-full sm:max-w-sm sm:flex-1">
              <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">القرار الموصى به</div>
              <div className="text-white text-sm leading-relaxed">{results.decision}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 border-t border-white/10 pt-4 md:pt-5">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handlePrint}
              className="bg-gold text-navy font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2"
            >
              🖨️ طباعة التقرير
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleExport}
              className="bg-white/10 hover:bg-white/15 text-white font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2"
            >
              📥 تصدير CSV
            </motion.button>
            <button
              onClick={() => nav(`/evaluation/${project.id}`)}
              className="text-white/60 hover:text-white text-sm px-5 py-2 transition-colors"
            >
              ✏️ تعديل التقييم
            </button>
            <button
              onClick={() => nav('/judge')}
              className="text-white/40 hover:text-white text-sm px-5 py-2 transition-colors mr-auto"
            >
              → لوحة الحكّام
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-navy/8 overflow-hidden mb-6"
        >
          <div className="px-4 md:px-6 py-4 border-b border-navy/8 flex items-center justify-between">
            <div className="font-black text-navy text-lg">درجات المحاور</div>
            <div className="text-xs text-navy/40">الدرجة الكلية من 100</div>
          </div>
          <div className="overflow-x-auto">
            <div className="divide-y divide-navy/5 min-w-[420px]">
              {results.dimensions.map((dim, i) => (
                <motion.div
                  key={dim.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className="px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4"
                >
                  <div className="w-28 md:w-36 text-sm font-bold text-navy flex-shrink-0">{dim.nameAr}</div>
                  <div className="flex-1 h-2.5 bg-navy/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(dim.avgScore / 5) * 100}%` }}
                      transition={{ delay: i * 0.1 + 0.5, duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: color.bar }}
                    />
                  </div>
                  <div className="text-sm font-bold text-navy w-12 text-center">{dim.avgScore}/5</div>
                  <div className="text-xs text-navy/40 w-20 text-center">
                    {dim.weightedScore} من {dim.weight}
                  </div>
                  <div
                    className="text-xs font-bold px-2.5 py-1 rounded-full w-14 text-center"
                    style={{ background: color.bg, color: color.text }}
                  >
                    {dim.weight}%
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="px-4 md:px-6 py-4 bg-navy/3 border-t border-navy/8 flex items-center justify-between">
            <div className="font-black text-navy">المجموع الكلي</div>
            <div className="text-2xl font-black" style={{ color: color.bar, fontFamily: "'Space Grotesk',sans-serif" }}>
              {results.finalScore} / 100
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-navy/8 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💪</span>
              <div className="font-black text-navy">نقاط القوة</div>
            </div>
            {results.strengths.length > 0 ? (
              <ul className="space-y-3">
                {results.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-navy/40">لا توجد نقاط قوة بارزة حتى الآن</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-navy/8 p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚠️</span>
              <div className="font-black text-navy">نقاط الضعف</div>
            </div>
            {results.weaknesses.length > 0 ? (
              <ul className="space-y-3">
                {results.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-navy/40">لا توجد نقاط ضعف واضحة — أداء ممتاز!</p>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-navy rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🎯</span>
            <div className="font-black text-white text-lg">التوصيات</div>
          </div>
          <ul className="space-y-3">
            {results.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                  style={{ background: color.bg, color: color.text }}
                >
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-navy/8 p-6"
        >
          <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">بيانات مقدم الطلب</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'رقم المشروع', val: `#${project.project_number}` },
              { label: 'اسم المشروع', val: project.project_name },
              { label: 'مقدم الطلب', val: project.applicant_name },
              { label: 'البريد الإلكتروني', val: project.email },
              { label: 'الجهة / الكلية', val: project.department ?? '—' },
              { label: 'تاريخ الإرسال', val: submittedAt || '—' },
            ].map(f => (
              <div key={f.label}>
                <div className="text-xs text-navy/40 mb-1">{f.label}</div>
                <div className="text-sm font-bold text-navy">{f.val || '—'}</div>
              </div>
            ))}
          </div>
          {project.description && (
            <div className="mt-4 pt-4 border-t border-navy/8">
              <div className="text-xs text-navy/40 mb-1">وصف المشروع</div>
              <div className="text-sm text-navy/70 leading-relaxed">{project.description}</div>
            </div>
          )}
        </motion.div>
      </div>

      <Footer containerClassName="max-w-5xl" />
    </div>
  );
}
