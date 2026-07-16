import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useCriteria } from '../lib/criteria';

const DIM_ICONS: Record<string, string> = {
  technology: '⚙️',
  market: '📈',
  businessModel: '🏢',
  teamCapabilities: '👥',
  impact: '🌍',
};

export default function CriteriaPage() {
  const { dimensions, loading } = useCriteria();

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-block bg-gold/15 text-gold text-xs font-bold tracking-widest uppercase px-4 py-2 rounded mb-4">معايير التقييم</div>
            <h1 className="text-4xl font-black text-white mb-4">المحاور والمعايير التفصيلية</h1>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              {dimensions.length} محاور تقييمية تشمل {dimensions.reduce((s, d) => s + d.criteria.length, 0)} معياراً علمياً دقيقاً
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-10">
        {loading ? (
          <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
        ) : (
          <div className="space-y-6">
            {dimensions.map((dim, i) => (
              <motion.div
                key={dim.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl border border-navy/8 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-navy px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{DIM_ICONS[dim.key] ?? '📊'}</span>
                    <div>
                      <div className="text-white font-black text-xl">{dim.nameAr}</div>
                      <div className="text-white/40 text-sm">{dim.criteria.length} معيار</div>
                    </div>
                  </div>
                  <div className="bg-gold/20 text-gold font-black text-sm px-3 py-1 rounded-full">
                    وزن {dim.weight}%
                  </div>
                </div>

                {/* Criteria list */}
                <div className="divide-y divide-navy/5">
                  {dim.criteria.map((c, ci) => (
                    <div key={ci} className="flex items-start gap-3 px-6 py-4">
                      <span className="mt-0.5 w-7 h-7 rounded-full bg-gold/10 text-gold text-sm font-black flex items-center justify-center flex-shrink-0">
                        {ci + 1}
                      </span>
                      <span className="text-navy/70 text-base leading-relaxed">{c}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
