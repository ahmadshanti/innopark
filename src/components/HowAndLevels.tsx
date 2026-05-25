import React from 'react';
import { motion } from 'framer-motion';
import { useReveal } from '../hooks/useReveal';

const steps = [
  { n: '01', icon: '📋', title: 'بيانات المشروع', desc: 'أدخل اسم مشروعك وبياناتك الأساسية ووصفاً مختصراً للفكرة' },
  { n: '02', icon: '⭐', title: 'التقييم الشامل', desc: 'قيّم مشروعك عبر 25 معياراً موزعة على 5 محاور بمقياس 1 إلى 5' },
  { n: '03', icon: '🔢', title: 'الحساب التلقائي', desc: 'النظام يحسب الدرجة الموزونة النهائية بدقة علمية فورية' },
  { n: '04', icon: '📊', title: 'التقرير والتوصية', desc: 'احصل على تقرير مفصل مع نقاط القوة والضعف والقرار الموصى به' },
];

const levels = [
  { range: '< 40', name: 'غير جاهز', en: 'Not Ready', color: '#E24B4A', bg: '#FCEBEB', bar: 15 },
  { range: '40–60', name: 'مبكر جداً', en: 'Pre-Incubation', color: '#EF9F27', bg: '#FAEEDA', bar: 35 },
  { range: '60–75', name: 'جاهز للاحتضان', en: 'Early Incubation', color: '#378ADD', bg: '#E6F1FB', bar: 55 },
  { range: '75–85', name: 'متقدم', en: 'Late Incubation', color: '#1D9E75', bg: '#E1F5EE', bar: 75 },
  { range: '> 85', name: 'عالي النضج', en: 'Acceleration', color: '#F5A623', bg: '#FEF3E2', bar: 95 },
];

interface HowAndLevelsProps { onApply: () => void; }

export default function HowAndLevels({ onApply }: HowAndLevelsProps) {
  const refHow = useReveal();
  const refLevels = useReveal();
  const refCta = useReveal();
  return (
    <>
      {/* How it works */}
      <section id="how" className="py-24 bg-[#F0F0EA]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div ref={refHow as React.RefObject<HTMLDivElement>} className="mb-10 md:mb-16 text-right reveal">
            <span className="inline-block bg-gold text-navy text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded mb-5">
              كيف يعمل؟
            </span>
            <h2 className="text-5xl font-black text-navy mb-3">أربع خطوات</h2>
            <p className="text-navy/50 text-lg">من تعبئة النموذج وحتى الحصول على توصية احترافية</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-navy/8 rounded-2xl overflow-hidden border border-navy/8">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="how-card bg-[#F0F0EA] p-5 md:p-8 cursor-default transition-colors duration-300 hover:bg-navy group"
              >
                {/* الرقم */}
                <div className="how-num font-grotesk text-7xl font-extrabold leading-none mb-6 transition-colors duration-300">
                  {s.n}
                </div>
                {/* الأيقونة */}
                <div className="how-icon w-12 h-12 rounded-xl bg-navy/8 flex items-center justify-center text-2xl mb-5 transition-all duration-300 group-hover:bg-gold/20">
                  {s.icon}
                </div>
                {/* العنوان */}
                <div className="how-title text-lg font-bold text-navy mb-3 transition-colors duration-300 group-hover:text-white">
                  {s.title}
                </div>
                {/* الوصف */}
                <p className="how-desc text-sm text-navy/50 leading-relaxed transition-colors duration-300 group-hover:text-white/50">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Maturity Levels */}
      <section className="py-24 bg-navy">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div ref={refLevels as React.RefObject<HTMLDivElement>} className="mb-10 md:mb-16 reveal">
            <span className="inline-block bg-gold text-navy text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded mb-5">
              مستويات النضج
            </span>
            <h2 className="text-5xl font-black text-white mb-3">خمسة تصنيفات</h2>
            <p className="text-white/40 text-lg">كل مشروع يحصل على مستوى دقيق وتوصية مخصصة</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {levels.map((l, i) => (
              <motion.div
                key={l.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="level-card border border-white/10 rounded-2xl p-6 hover:border-white/25"
              >
                <div
                  className="level-badge font-grotesk text-xs font-bold mb-4 px-3 py-1.5 rounded-full inline-block"
                  style={{ background: l.bg, color: l.color }}
                >
                  {l.range}
                </div>
                <div className="text-white font-bold text-lg mb-1">{l.name}</div>
                <div className="text-white/35 text-xs mb-6">{l.en}</div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${l.bar}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="level-bar-fill h-full rounded-full"
                    style={{ background: l.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gold py-20">
        <div ref={refCta as React.RefObject<HTMLDivElement>} className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 reveal">
          <div>
            <h2 className="text-2xl md:text-4xl font-black text-navy leading-tight mb-3">
              مشروعك الابتكاري<br />يستحق فرصة احترافية
            </h2>
            <p className="text-navy/60 text-base md:text-lg">قدّم طلبك الآن وستتم مراجعته من قِبل لجنة التحكيم</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04, x: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={onApply}
            className="bg-navy text-white font-black text-base md:text-xl px-7 md:px-10 py-4 md:py-5 rounded-xl flex items-center gap-3 md:gap-4 flex-shrink-0 min-h-[44px] w-full md:w-auto justify-center"
          >
            قدّم مشروعك
            <span className="text-gold text-xl md:text-2xl">←</span>
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-[#0f1e47] py-6 md:py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.webp" alt="INNOPARK" width={44} height={44} style={{ objectFit: 'contain' }} />
            <div>
              <div className="font-grotesk font-extrabold text-gold tracking-[3px] text-base">INNOPARK</div>
              <div className="text-white/25 text-xs mt-1">حديقة النجاح للابتكار — جامعة النجاح الوطنية</div>
            </div>
          </div>
          <div className="text-white/20 text-xs">© 2026 جميع الحقوق محفوظة</div>
        </div>
      </footer>
    </>
  );
}
