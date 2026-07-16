import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/use-auth';
import { isAdminProfile, isJudgeProfile } from '../lib/authorization';

const features = [
  {
    icon: '🎯',
    title: 'تقييم موضوعي وعلمي',
    desc: 'يعتمد النظام على مصفوفة تقييم مبنية على أفضل الممارسات العالمية في قياس نضج مشاريع الابتكار، بعيداً عن الاجتهادات الشخصية.',
  },
  {
    icon: '📊',
    title: 'نتائج فورية وشفافة',
    desc: 'يحسب النظام الدرجة الموزونة تلقائياً فور اكتمال التقييم، ويُصدر تقريراً مفصلاً بنقاط القوة والضعف والتوصية المناسبة.',
  },
  {
    icon: '👥',
    title: 'لجنة حكّام متخصصة',
    desc: 'يشارك في التقييم نخبة من الخبراء والأكاديميين المتخصصين، مما يضمن دقة النتائج وموضوعيتها.',
  },
  {
    icon: '🔄',
    title: 'معايير قابلة للتطوير',
    desc: 'تتيح لوحة التحكم للإدارة تحديث المحاور والمعايير باستمرار لتواكب أحدث معايير الابتكار العالمية.',
  },
];

const audience = [
  {
    icon: '💡',
    title: 'أصحاب المشاريع',
    desc: 'يقدّمون مشاريعهم للتقييم ويحصلون على تقرير مفصل يوضح مستوى نضج مشروعهم والخطوات التالية الموصى بها.',
    color: '#F5A623',
  },
  {
    icon: '⚖️',
    title: 'لجنة الحكّام',
    desc: 'متخصصون معتمدون يقيّمون المشاريع عبر المنصة الإلكترونية باستخدام المعايير العلمية المعتمدة.',
    color: '#378ADD',
  },
  {
    icon: '🏛️',
    title: 'الإدارة',
    desc: 'يشرفون على العملية كاملة من قبول الطلبات وتعيين الحكّام وحتى متابعة نتائج التقييم وإدارة المعايير.',
    color: '#1D9E75',
  },
];

export default function AboutPage() {
  const nav = useNavigate();
  const { session, profile } = useAuth();
  const isLoggedIn = session && (isAdminProfile(profile) || isJudgeProfile(profile));

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-block bg-gold/15 text-gold text-xs font-bold tracking-widest uppercase px-4 py-2 rounded mb-4">عن النظام</div>
            <h1 className="text-4xl font-black text-white mb-4">نظام تقييم نضج الابتكار</h1>
            <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
              منظومة علمية متكاملة تابعة لحديقة النجاح للابتكار في جامعة النجاح الوطنية، تهدف إلى قياس مستوى نضج مشاريع الابتكار وتقديم توصيات احترافية لدعم مسيرتها.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-12 space-y-16">

        {/* ما هو النظام */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-white rounded-2xl border border-navy/8 p-8"
        >
          <h2 className="text-2xl font-black text-navy mb-4">ما هو النظام؟</h2>
          <p className="text-navy/60 text-base leading-loose">
            نظام تقييم نضج الابتكار هو منصة إلكترونية متكاملة تُتيح تقييم مشاريع الابتكار داخل جامعة النجاح الوطنية وحديقة الابتكار التابعة لها، وذلك عبر مصفوفة علمية دقيقة تشمل عدة محاور ومعايير موزونة. يهدف النظام إلى توحيد عملية التقييم وجعلها شفافة وقابلة للقياس، بدلاً من الاعتماد على التقييمات الذاتية غير المنظمة.
          </p>
        </motion.div>

        {/* المميزات */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-2xl font-black text-navy mb-6"
          >
            مميزات النظام
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-navy/8 p-6 flex gap-4"
              >
                <div className="text-3xl flex-shrink-0">{f.icon}</div>
                <div>
                  <div className="font-black text-navy mb-2">{f.title}</div>
                  <p className="text-navy/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* من يستخدم النظام */}
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-2xl font-black text-navy mb-6"
          >
            من يستخدم النظام؟
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {audience.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl border border-navy/8 p-6 text-center"
              >
                <div className="text-4xl mb-3">{a.icon}</div>
                <div className="font-black text-navy text-lg mb-2">{a.title}</div>
                <p className="text-navy/55 text-sm leading-relaxed">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-navy rounded-2xl p-8 text-center"
          >
            <h2 className="text-2xl font-black text-white mb-3">مشروعك يستحق تقييماً احترافياً</h2>
            <p className="text-white/40 mb-6">قدّم مشروعك الآن وستتم مراجعته من قِبل لجنة الحكّام</p>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => nav('/apply')}
              className="bg-gold text-navy font-black px-8 py-3 rounded-xl text-lg"
            >
              قدّم مشروعك الآن ←
            </motion.button>
          </motion.div>
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
