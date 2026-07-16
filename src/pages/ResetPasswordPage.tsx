import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Event may have fired before this page mounted — check existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    if (!password) { setError('يرجى إدخال كلمة مرور جديدة'); return; }
    if (password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (password !== confirm) { setError('كلمتا المرور غير متطابقتين'); return; }

    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) { setError('تعذّر تحديث كلمة المرور. حاول مجدداً'); return; }
    setDone(true);
    setTimeout(() => nav('/login', { replace: true }), 2500);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center"
      >
        <img src="/logo.webp" alt="INNOPARK" width={72} height={72} style={{ objectFit: 'contain' }} />
        <div className="mt-3 text-center">
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: '#1B3A7A', fontSize: '18px', letterSpacing: '2px' }}>INNOPARK</div>
          <div className="text-navy/40 text-xs mt-0.5">حديقة النجاح للابتكار</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-navy/8 shadow-xl p-8 w-full max-w-sm"
      >
        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-black text-navy mb-2">تم تغيير كلمة المرور</h2>
            <p className="text-navy/50 text-sm">سيتم توجيهك لصفحة الدخول...</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-black text-navy mb-2">جارٍ التحقق من الرابط...</h2>
            <p className="text-navy/40 text-sm mb-4">إذا لم يتم التحقق، تأكد أنك فتحت الرابط من بريدك مباشرة</p>
            <button onClick={() => nav('/forgot-password')} className="text-navy font-bold text-sm hover:underline">
              إرسال رابط جديد
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-navy mb-1">كلمة مرور جديدة</h1>
            <p className="text-navy/40 text-sm mb-6">اختر كلمة مرور قوية لحسابك</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-navy/60 mb-2">كلمة المرور الجديدة</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-navy/60 mb-2">تأكيد كلمة المرور</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  placeholder="••••••••"
                  className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"
                >
                  ⚠️ {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleReset} disabled={loading}
                className="w-full bg-navy text-white font-black py-3 rounded-xl text-base disabled:opacity-60"
              >
                {loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة →'}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
