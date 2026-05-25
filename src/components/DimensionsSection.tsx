import { motion } from 'framer-motion';
import { useCriteria } from '../lib/criteria';

const DIM_META: Record<string, { icon: string; desc: string }> = {
  technology:       { icon: '⚙️', desc: 'قياس مستوى النضج التقني وجاهزية التكنولوجيا' },
  market:           { icon: '📈', desc: 'تقييم فهم السوق والفرصة التجارية' },
  businessModel:    { icon: '🏢', desc: 'تحليل قابلية المشروع للتحول إلى عمل تجاري ناجح' },
  teamCapabilities: { icon: '👥', desc: 'قياس كفاءة الفريق وقدرته على تنفيذ الرؤية' },
  impact:           { icon: '🌍', desc: 'تقييم الأثر الأشمل والتوافق مع الأولويات الاستراتيجية' },
};

export default function DimensionsSection() {
  const { dimensions } = useCriteria();
  const dims = dimensions.map((d, i) => ({
    num: String(i + 1).padStart(2, '0'),
    icon: DIM_META[d.key]?.icon ?? '📊',
    name: d.nameAr,
    weight: `${d.weight}%`,
    criteria: d.criteria,
    desc: DIM_META[d.key]?.desc ?? '',
  }));

  return (
    <section id="dimensions" className="py-24 bg-cream">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block bg-navy text-white text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded mb-5"
          >
            محاور التقييم
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black text-navy mb-4 leading-tight"
          >
            خمسة محاور علمية
            <span className="text-outline block text-6xl">متكاملة</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-navy/50 text-lg max-w-lg"
          >
            مرر على كل محور لرؤية معاييره التفصيلية
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border border-navy/10 rounded-2xl overflow-hidden divide-y divide-navy/10 sm:divide-y-0 sm:divide-x sm:divide-x-reverse">
          {dims.map((dim, i) => (
            <motion.div
              key={dim.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="dim-card group p-6 cursor-default"
            >
              {/* الرقم — بيتحكم فيه CSS مباشرة عبر .dim-card:hover .dim-num */}
              <div className="dim-num font-grotesk text-5xl font-extrabold leading-none mb-5 transition-colors duration-300">
                {dim.num}
              </div>

              <div className="dim-icon w-11 h-11 rounded-xl bg-navy/5 flex items-center justify-center text-xl mb-4 transition-all duration-300">
                {dim.icon}
              </div>

              <div className="dim-name text-base font-bold text-navy mb-2 transition-colors duration-300">
                {dim.name}
              </div>

              <p className="dim-desc text-xs text-navy/45 leading-relaxed mb-4 transition-colors duration-300">
                {dim.desc}
              </p>

              <ul className="space-y-1 mb-5">
                {dim.criteria.map((c, ci) => (
                  <li key={ci} className="dim-desc text-xs text-navy/40 transition-colors duration-300 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>

              <span className="dim-badge inline-block bg-navy/6 text-navy/50 text-xs font-bold tracking-wider px-3 py-1 rounded-full transition-all duration-300">
                وزن {dim.weight}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}