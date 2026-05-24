import React from 'react';
import { motion } from 'framer-motion';

interface HeroProps {
  onStartEval: () => void;
}

const stats = [
  { num: '5', unit: 'محاور', sub: 'أبعاد تقييم شاملة' },
  { num: '25', unit: 'معيار', sub: 'مؤشر قياس علمي' },
  { num: '100', unit: 'درجة', sub: 'نظام تقييم موزون' },
  { num: '5', unit: 'مستويات', sub: 'تصنيف احترافي' },
];

export default function Hero({ onStartEval }: HeroProps) {
  const [spinning, setSpinning] = React.useState(false);
  return (
    <section className="relative min-h-screen bg-cream overflow-hidden flex flex-col">

      {/* Background circuit rings */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <svg
          className="absolute -left-32 top-1/2 -translate-y-1/2 opacity-[0.05]"
          width="700" height="700" viewBox="0 0 700 700"
        >
          <circle cx="350" cy="350" r="340" fill="none" stroke="#1B3A7A" strokeWidth="1.5" />
          <circle cx="350" cy="350" r="285" fill="none" stroke="#1B3A7A" strokeWidth="1" strokeDasharray="6 4" />
          <circle cx="350" cy="350" r="230" fill="none" stroke="#1B3A7A" strokeWidth="1.5" />
          <circle cx="350" cy="350" r="175" fill="none" stroke="#1B3A7A" strokeWidth="1" />
          <circle cx="350" cy="350" r="120" fill="none" stroke="#1B3A7A" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="350" cy="10"  r="6" fill="#1B3A7A" />
          <circle cx="690" cy="350" r="5" fill="#1B3A7A" />
          <circle cx="350" cy="690" r="5" fill="#1B3A7A" />
          <circle cx="10"  cy="350" r="5" fill="#1B3A7A" />
          <circle cx="590" cy="110" r="4" fill="#F5A623" />
          <circle cx="110" cy="590" r="4" fill="#F5A623" />
        </svg>
        {/* dot grid top-left */}
        <svg className="absolute top-0 left-0 opacity-[0.035]" width="280" height="280" viewBox="0 0 280 280">
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 9 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={col * 30 + 15} cy={row * 30 + 15} r="1.5" fill="#1B3A7A" />
            ))
          )}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-navy/8" />
      </div>

      {/* Main grid */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pt-20 md:pt-28 pb-0 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

        {/* Right col — Text */}
        <div className="order-2 md:order-1">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 border border-gold/40 rounded px-4 py-1.5 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-dot" />
            <span className="text-gold text-xs font-bold tracking-widest uppercase">
              INNOPARK — An-Najah Innovation Park
            </span>
          </motion.div>

          <div className="mb-6 leading-none">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 900, lineHeight: 1 }}
              className="text-navy text-[48px] md:text-[88px]"
            >
              نظام
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 900, lineHeight: 1 }}
              className="text-outline text-[48px] md:text-[88px]"
            >
              تقييم
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, lineHeight: 1, marginTop: '8px' }}
              className="text-gold text-[28px] md:text-[50px]"
            >
              نضج الابتكار
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="text-navy/55 text-base md:text-lg leading-relaxed mb-8 md:mb-10 max-w-md"
          >
            منظومة علمية متكاملة تقيّم مشاريع الابتكار داخل الجامعة وحديقة الابتكار عبر خمسة محاور دقيقة، وتقدم توصية واضحة لكل مرحلة.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap items-center gap-3 md:gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartEval}
              className="bg-gold hover:bg-gold-dark text-navy font-black text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-xl transition-colors flex items-center gap-3 shadow-lg shadow-gold/20 min-h-[44px]"
            >
              ابدأ التقييم الآن
              <span className="text-navy/60 text-base">←</span>
            </motion.button>
            <button onClick={() => {
                  setSpinning(true);
                  setTimeout(() => setSpinning(false), 800);
                  const el = document.getElementById('dimensions');
                  if (el) {
                    const start = window.scrollY;
                    const end = el.getBoundingClientRect().top + window.scrollY - 80;
                    const dist = end - start;
                    const duration = Math.min(Math.abs(dist) * 0.6, 900);
                    let startTime: number | null = null;
                    const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
                    const step = (timestamp: number) => {
                      if (!startTime) startTime = timestamp;
                      const p = Math.min((timestamp - startTime) / duration, 1);
                      window.scrollTo(0, start + dist * ease(p));
                      if (p < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                  }
                }} className="text-navy/60 hover:text-navy font-medium text-sm md:text-base border border-navy/15 hover:border-navy/30 px-4 md:px-6 py-3 md:py-4 rounded-xl transition-all min-h-[44px]">
              تعرّف على المعايير
            </button>
          </motion.div>
        </div>

        {/* Left col — Logo with animations */}
        <div className="order-1 md:order-2 relative flex items-center justify-center h-[260px] md:h-[520px]">

          {/* Rotating rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[200px] h-[200px] md:w-[400px] md:h-[400px] rounded-full border border-dashed border-navy/10"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[150px] h-[150px] md:w-[300px] md:h-[300px] rounded-full border border-dashed border-gold/15"
          />
          <div className="absolute w-[105px] h-[105px] md:w-[210px] md:h-[210px] rounded-full border border-navy/8" />

          {/* Orbiting gold dot */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[160px] h-[160px] md:w-[320px] md:h-[320px]"
            style={{ transformOrigin: 'center' }}
          >
            <div
              className="absolute w-3 h-3 rounded-full bg-gold/70"
              style={{ top: 0, left: '50%', transform: 'translate(-50%, -50%)' }}
            />
          </motion.div>

          {/* Orbiting navy dot */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute w-[190px] h-[190px] md:w-[380px] md:h-[380px]"
            style={{ transformOrigin: 'center' }}
          >
            <div
              className="absolute w-2 h-2 rounded-full bg-navy/25"
              style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }}
            />
          </motion.div>

          {/* Logo floating */}
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10"
          >
            {/* Soft glow */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: '-20px',
                borderRadius: '50%',
                background: '#F5A623',
                filter: 'blur(28px)',
                zIndex: -1,
              }}
            />
            <motion.img
              src="/logo.png"
              alt="INNOPARK Logo"
              initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
              style={{ width: 'clamp(110px, 22vw, 220px)', height: 'clamp(110px, 22vw, 220px)', objectFit: 'contain', transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)', transform: spinning ? 'rotate(360deg) scale(1.08)' : 'rotate(0deg) scale(1)' }}
            />
          </motion.div>

          {/* Accent dots */}
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute top-20 right-20 w-2.5 h-2.5 rounded-full bg-gold"
          />
          <motion.div
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute bottom-28 left-16 w-2 h-2 rounded-full bg-navy/30"
          />
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute top-36 left-24 w-1.5 h-1.5 rounded-full bg-gold/60"
          />
        </div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
        className="relative z-10 border-t border-navy/8 mt-8"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className={`px-4 md:px-8 py-4 md:py-6 ${i < 3 ? 'grid-sep' : ''}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="stat-num text-4xl text-navy">{s.num}</span>
                <span className="text-gold text-xl font-bold">{s.unit}</span>
              </div>
              <div className="text-sm text-navy/40 font-medium">{s.sub}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}