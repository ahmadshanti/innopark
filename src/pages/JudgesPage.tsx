import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import type { Profile } from '../types/db';

export default function JudgesPage() {
  const [judges, setJudges] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadJudges() {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'judge')
        .eq('status', 'approved')
        .eq('visible_on_page', true)
        .order('created_at', { ascending: true });

      if (err) {
        setError(err.message || 'تعذّر تحميل قائمة الحكّام');
        setJudges([]);
      } else {
        setJudges((data ?? []) as Profile[]);
      }
      setLoading(false);
    }

    loadJudges();
  }, []);

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      <div
        className="bg-navy px-4 md:px-8 flex-shrink-0"
        style={{ paddingTop: '100px', paddingBottom: '48px' }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-gold/60 text-xs font-bold uppercase tracking-widest mb-3">
            لجنة التحكيم
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            حكّام حديقة النجاح للابتكار
          </h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto">
            نخبة من الخبراء والمتخصصين المنوط بهم تقييم مشاريع الابتكار
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-12">
        {error && (
          <div className="text-red-700 text-sm mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-24 text-navy/40">جارٍ التحميل...</div>
        ) : judges.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-navy/8">
            <div className="text-5xl mb-4">👨‍⚖️</div>
            <div className="text-navy/40">لا يوجد حكّام متاحون حالياً</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {judges.map((judge, index) => (
              <motion.div
                key={judge.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.07, 0.4) }}
                className="bg-white rounded-2xl border border-navy/8 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-navy/8 mb-4 flex-shrink-0 bg-cream">
                  <img
                    src={judge.avatar_url || '/logo.webp'}
                    alt={judge.full_name || 'حكّم'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.webp';
                    }}
                  />
                </div>

                <div className="font-black text-navy text-lg leading-tight mb-1">
                  {judge.full_name?.trim() || 'حكّم'}
                </div>

                {judge.department && (
                  <div className="text-xs font-bold text-gold-dark bg-gold/10 px-3 py-1 rounded-full mb-3">
                    {judge.department}
                  </div>
                )}

                {judge.bio && (
                  <p className="text-navy/60 text-sm leading-relaxed line-clamp-4">
                    {judge.bio}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer containerClassName="max-w-5xl" className="py-6 px-8" />
    </div>
  );
}
