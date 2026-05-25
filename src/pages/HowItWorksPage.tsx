import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    num: '01',
    title: 'التقديم والتسجيل',
    desc: 'يقوم المشروع بتقديم طلب التقييم مع تعبئة استمارة شاملة تتضمن معلومات المشروع الأساسية والوثائق الداعمة',
    points: ['تعبئة نموذج التقديم الإلكتروني', 'إرفاق خطة العمل والعرض التقديمي', 'تقديم الوثائق الداعمة والشهادات'],
    icon: '📋',
  },
  {
    num: '02',
    title: 'الفرز الأولي',
    desc: 'يتم فحص الطلبات للتحقق من استيفاء الشروط الأساسية ومتطلبات الأهلية',
    points: ['التحقق من اكتمال المستندات', 'مراجعة معايير الأهلية', 'تصنيف المشروع حسب القطاع'],
    icon: '🔍',
  },
  {
    num: '03',
    title: 'التقييم التفصيلي',
    desc: 'فريق من المقيّمين المتخصصين يقوم بتقييم المشروع عبر المحاور الخمسة باستخدام المصفوفة',
    points: ['تقييم كل محور على حدة', 'جمع التقييمات من 3 مقيّمين مستقلين', 'حساب المتوسط المرجح'],
    icon: '⚙️',
  },
  {
    num: '04',
    title: 'المراجعة والتدقيق',
    desc: 'لجنة المراجعة تقوم بمراجعة نتائج التقييم وضمان الاتساق والموضوعية',
    points: ['مراجعة التقييمات من قبل اللجنة', 'حل أي تباينات في التقييم', 'اعتماد النتائج النهائية'],
    icon: '✅',
  },
  {
    num: '05',
    title: 'إصدار التقرير',
    desc: 'إعداد تقرير شامل يتضمن النتائج والتوصيات وخارطة طريق للتطوير',
    points: ['إعداد تقرير التقييم المفصل', 'تحديد نقاط القوة والتحسين', 'تقديم توصيات مخصصة'],
    icon: '📊',
  },
  {
    num: '06',
    title: 'المتابعة والدعم',
    desc: 'تقديم الدعم والإرشاد بناءً على نتائج التقييم مع متابعة دورية للتقدم',
    points: ['جلسات إرشاد مخصصة', 'ربط المشروع بالموارد المناسبة', 'إعادة التقييم بعد 6 أشهر'],
    icon: '🤝',
  },
];

export default function HowItWorksPage() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-block bg-gold/15 text-gold text-xs font-bold tracking-widest uppercase px-4 py-2 rounded mb-4">آلية العمل</div>
            <h1 className="text-4xl font-black text-white mb-4">المراحل والخطوات</h1>
            <p className="text-white/50 text-lg max-w-xl mx-auto">التي يمر بها المشروع خلال عملية التقييم</p>
          </motion.div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8 md:py-16">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute right-[28px] top-0 bottom-0 w-px bg-navy/10 hidden md:block" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 md:gap-8 items-start"
              >
                {/* Number bubble */}
                <div className="flex-shrink-0 w-10 h-10 md:w-14 md:h-14 rounded-full bg-navy flex items-center justify-center relative z-10">
                  <span className="text-gold font-black text-lg" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{step.num}</span>
                </div>

                {/* Card */}
                <div className="flex-1 bg-white rounded-2xl border border-navy/8 p-4 md:p-6 hover:border-navy/20 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{step.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-navy mb-2">{step.title}</h3>
                      <p className="text-navy/55 text-sm leading-relaxed mb-4">{step.desc}</p>
                      <ul className="space-y-1.5">
                        {step.points.map((p, pi) => (
                          <li key={pi} className="flex items-center gap-2 text-sm text-navy/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-navy rounded-2xl p-8 text-center"
        >
          <h2 className="text-2xl font-black text-white mb-3">مشروعك جاهز للتقييم؟</h2>
          <p className="text-white/40 mb-6">ابدأ الآن وستحصل على تقرير مفصل خلال دقائق</p>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/evaluation')}
            className="bg-gold text-navy font-black px-8 py-3 rounded-xl text-lg"
          >
            ابدأ التقييم الآن ←
          </motion.button>
        </motion.div>
      </div>

      <footer className="bg-[#0f1e47] py-5 px-4 md:px-8 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="INNOPARK" width={36} height={36} style={{ objectFit: 'contain' }} />
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
