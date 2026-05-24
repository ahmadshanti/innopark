import { useRef } from 'react';
import { motion } from 'framer-motion';
import type { Submission } from '../types';
import Navbar from '../components/Navbar';

interface ResultsPageProps {
  submission: Submission;
  onBack: () => void;
  onNewEval: () => void;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'غير جاهز':        { bg: '#FCEBEB', text: '#A32D2D', border: '#F7C1C1', bar: '#E24B4A' },
  'مبكر جداً':       { bg: '#FAEEDA', text: '#854F0B', border: '#FAC775', bar: '#EF9F27' },
  'جاهز للاحتضان':  { bg: '#E6F1FB', text: '#185FA5', border: '#85B7EB', bar: '#378ADD' },
  'متقدم':           { bg: '#E1F5EE', text: '#0F6E56', border: '#5DCAA5', bar: '#1D9E75' },
  'عالي النضج':      { bg: '#EEEDFE', text: '#534AB7', border: '#CECBF6', bar: '#F5A623' },
};

export default function ResultsPage({ submission, onBack, onNewEval }: ResultsPageProps) {
  const { results, data } = submission;
  const printRef = useRef<HTMLDivElement>(null);
  const color = LEVEL_COLORS[results.classification] ?? LEVEL_COLORS['متقدم'];
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (results.finalScore / 100) * circumference;

  function handlePrint() {
    window.print();
  }

  function handleExport() {
    const rows = [
      ['المحور', 'المتوسط', 'الوزن', 'الدرجة الموزونة'],
      ...results.dimensions.map(d => [d.nameAr, d.avgScore, `${d.weight}%`, d.weightedScore]),
      ['الدرجة النهائية', '', '', results.finalScore],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_${data.projectInfo.projectName}_${submission.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar onStartEval={onNewEval} onAdminClick={onBack} />

      {/* Hero result bar */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: "80px", paddingBottom: "32px" }}>
        <div className="max-w-5xl mx-auto">

          {/* Top row: score + name + classification + decision */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-8 mb-6">

            {/* Circular score */}
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
              <div className="text-white text-2xl font-black mb-3">{data.projectInfo.projectName}</div>
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
                style={{ background: color.bg, color: color.text }}
              >
                {results.classification}
                <span className="text-xs opacity-60">— {results.classificationEn}</span>
              </div>
            </div>

            {/* Decision */}
            <div className="border border-white/10 rounded-2xl p-4 md:p-5 w-full sm:max-w-sm sm:flex-1">
              <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">القرار الموصى به</div>
              <div className="text-white text-sm leading-relaxed">{results.decision}</div>
            </div>
          </div>

          {/* Bottom row: action buttons */}
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
              onClick={onNewEval}
              className="text-white/40 hover:text-white text-sm px-5 py-2 transition-colors mr-auto"
            >
              + تقييم جديد
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={printRef} className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">

        {/* Dimensions table */}
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

        {/* Strengths & Weaknesses */}
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

        {/* Recommendations */}
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

        {/* Project info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-navy/8 p-6"
        >
          <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">بيانات مقدم الطلب</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'اسم المشروع', val: data.projectInfo.projectName },
              { label: 'مقدم الطلب', val: data.projectInfo.applicantName },
              { label: 'البريد الإلكتروني', val: data.projectInfo.email },
              { label: 'الجهة / الكلية', val: data.projectInfo.department },
            ].map(f => (
              <div key={f.label}>
                <div className="text-xs text-navy/40 mb-1">{f.label}</div>
                <div className="text-sm font-bold text-navy">{f.val || '—'}</div>
              </div>
            ))}
          </div>
          {data.projectInfo.description && (
            <div className="mt-4 pt-4 border-t border-navy/8">
              <div className="text-xs text-navy/40 mb-1">وصف المشروع</div>
              <div className="text-sm text-navy/70 leading-relaxed">{data.projectInfo.description}</div>
            </div>
          )}
        </motion.div>

        {/* Back button */}
        <div className="mt-8 flex justify-center">
          <button onClick={onBack} className="text-navy/40 hover:text-navy text-sm transition-colors flex items-center gap-2">
            → العودة للرئيسية
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0f1e47] py-5 px-4 md:px-8 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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