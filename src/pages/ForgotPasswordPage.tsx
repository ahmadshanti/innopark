import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email.trim()) { setError('يرجى إدخال البريد الإلكتروني'); return; }
    setError(''); setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (err) { setError('تعذّر إرسال رابط الاسترداد. تحقق من البريد الإلكتروني'); return; }
    setSent(true);
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
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-xl font-black text-navy mb-2">تم إرسال الطلب</h2>
            <p className="text-navy/50 text-sm mb-6">
              إذا كان هذا البريد مسجّلاً في النظام، ستصل إليك رسالة تحتوي على رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <button onClick={() => nav('/login')} className="text-navy font-bold text-sm hover:underline">
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-navy mb-1">نسيت كلمة المرور؟</h1>
            <p className="text-navy/40 text-sm mb-6">أدخل بريدك وسنرسل لك رابط الاسترداد</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-navy/60 mb-2">البريد الإلكتروني</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="example@email.com"
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
                onClick={handleSubmit} disabled={loading}
                className="w-full bg-navy text-white font-black py-3 rounded-xl text-base disabled:opacity-60"
              >
                {loading ? 'جارٍ الإرسال...' : 'إرسال رابط الاسترداد →'}
              </motion.button>
            </div>

            <div className="mt-6 pt-6 border-t border-navy/10 text-center">
              <button onClick={() => nav('/login')} className="text-navy/50 text-sm hover:text-navy hover:underline">
                ← العودة لتسجيل الدخول
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
