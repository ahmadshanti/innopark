import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return; }
    setError(''); setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } else {
      localStorage.setItem('innopark_admin', 'true');
      onLogin();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex flex-col items-center"
      >
        <img src="/logo.png" alt="INNOPARK" width={80} height={80} style={{ objectFit: 'contain' }} />
        <div className="mt-3 text-center">
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: '#1B3A7A', fontSize: '20px', letterSpacing: '2px' }}>
            INNOPARK
          </div>
          <div className="text-navy/40 text-xs mt-0.5">حديقة النجاح للابتكار</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-white rounded-2xl border border-navy/8 shadow-xl p-8 w-full max-w-sm"
      >
        <h1 className="text-2xl font-black text-navy mb-1">تسجيل الدخول</h1>
        <p className="text-navy/40 text-sm mb-8">لوحة تحكم المشرفين</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="admin@innopark.ps"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all bg-cream/50"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all bg-cream/50"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-navy text-white font-black py-3 rounded-xl text-base mt-2 disabled:opacity-60 transition-all"
          >
            {loading ? 'جارٍ التحقق...' : 'دخول →'}
          </motion.button>
        </div>
      </motion.div>

      <button onClick={onBack} className="mt-6 text-navy/35 hover:text-navy text-sm transition-colors">
        → العودة للرئيسية
      </button>
    </div>
  );
}