import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

const phases = [
  {
    num: '01', period: '1-3 أشهر', color: '#F5A623',
    title: 'التأسيس والإعداد', phase: 'المرحلة الأولى',
    points: ['تشكيل فريق العمل وتحديد الأدوار والمسؤوليات', 'تطوير الأدوات والنماذج اللازمة للتقييم', 'بناء المنصة الإلكترونية للتقييم', 'تدريب المقيّمين على استخدام المصفوفة', 'إعداد دليل المقيّم الشامل'],
  },
  {
    num: '02', period: '3-6 أشهر', color: '#378ADD',
    title: 'التجريب والاختبار', phase: 'المرحلة الثانية',
    points: ['تطبيق تجريبي على 10-15 مشروع', 'جمع الملاحظات من المقيّمين والمشاريع', 'تعديل وتحسين المعايير بناءً على النتائج', 'اختبار المنصة الإلكترونية وإصلاح المشاكل', 'توثيق الدروس المستفادة'],
  },
  {
    num: '03', period: '6-12 شهر', color: '#1D9E75',
    title: 'الإطلاق والتوسع', phase: 'المرحلة الثالثة',
    points: ['إطلاق المصفوفة بشكل رسمي', 'بناء شراكات مع حاضنات ومسرعات الأعمال', 'إعداد تقارير دورية عن نتائج التقييم', 'تطوير برامج دعم مبنية على نتائج التقييم', 'التوسع لتشمل قطاعات جديدة'],
  },
  {
    num: '04', period: '12+ شهر', color: '#534AB7',
    title: 'النضج والاستدامة', phase: 'المرحلة الرابعة',
    points: ['تحديث المعايير سنوياً بناءً على أفضل الممارسات', 'بناء قاعدة بيانات وطنية للابتكار', 'نشر تقارير سنوية عن حالة الابتكار', 'تطوير مؤشرات أداء وطنية للابتكار', 'التعاون الدولي وتبادل الخبرات'],
  },
];

const governance = [
  { icon: '🏛️', title: 'لجنة الإشراف', desc: 'تتكون من خبراء وأكاديميين ومستثمرين لمراجعة واعتماد المعايير' },
  { icon: '👨‍⚖️', title: 'فريق التقييم', desc: 'مقيّمون معتمدون ومدربون على استخدام المصفوفة بكفاءة' },
  { icon: '✅', title: 'ضمان الجودة', desc: 'آليات مراجعة ومراقبة لضمان دقة وعدالة التقييمات' },
  { icon: '🔄', title: 'التحسين المستمر', desc: 'مراجعة وتحديث دوري للمعايير بناءً على الملاحظات والنتائج' },
];

const kpis = [
  { label: 'عدد المشاريع المُقيّمة', value: '100+', unit: 'سنوياً' },
  { label: 'رضا المشاريع المُقيّمة', value: '85%', unit: 'فأكثر' },
  { label: 'دقة التقييمات', value: '90%', unit: 'فأكثر' },
  { label: 'متوسط وقت التقييم', value: '15', unit: 'يوم كحد أقصى' },
];

export default function ImplementationPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block bg-gold/15 text-gold text-xs font-bold tracking-widest uppercase px-4 py-2 rounded mb-4">خطة التنفيذ</div>
            <h1 className="text-4xl font-black text-white mb-4">المراحل الزمنية</h1>
            <p className="text-white/50 text-lg max-w-xl mx-auto">لتنفيذ المصفوفة وهيكل الحوكمة المقترح</p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8 md:py-16">

        {/* Phases */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-navy text-white text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded">المراحل الزمنية</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-navy/8 p-6 hover:border-navy/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm"
                    style={{ background: phase.color, fontFamily: "'Space Grotesk',sans-serif" }}>
                    {phase.num}
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: phase.color }}>{phase.phase}</div>
                    <div className="text-base font-black text-navy">{phase.title}</div>
                  </div>
                  <div className="mr-auto text-xs font-bold px-3 py-1 rounded-full bg-navy/6 text-navy/50">{phase.period}</div>
                </div>
                <ul className="space-y-2">
                  {phase.points.map((p, pi) => (
                    <li key={pi} className="flex items-start gap-2 text-sm text-navy/60">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: phase.color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Governance */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-navy text-white text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded mb-4">هيكل الحوكمة</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {governance.map((g, i) => (
              <motion.div
                key={g.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-navy/8 p-5 text-center hover:border-navy/20 transition-all"
              >
                <div className="text-3xl mb-3">{g.icon}</div>
                <div className="font-black text-navy text-sm mb-2">{g.title}</div>
                <div className="text-xs text-navy/50 leading-relaxed">{g.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div>
          <div className="text-center mb-10">
            <span className="inline-block bg-navy text-white text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded">مؤشرات الأداء الرئيسية</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-navy rounded-2xl p-6 text-center"
              >
                <div className="text-4xl font-black text-gold mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{kpi.value}</div>
                <div className="text-white/40 text-xs mb-2">{kpi.unit}</div>
                <div className="text-white/70 text-xs font-medium">{kpi.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

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