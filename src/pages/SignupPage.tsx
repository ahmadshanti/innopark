import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function SignupPage() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 2MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password.trim() || !bio.trim()) {
      setError('الاسم والبريد وكلمة المرور والنبذة حقول إجبارية');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setError('');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          department: department.trim(),
          bio: bio.trim(),
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered'))
        setError('هذا البريد الإلكتروني مسجّل مسبقاً');
      else if (msg.includes('invalid') || msg.includes('validate email'))
        setError('صيغة البريد الإلكتروني غير صحيحة');
      else if (msg.includes('Password'))
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      else
        setError('تعذّر إنشاء الحساب، حاول مرة أخرى');
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId && avatarFile && data.session) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', userId);
      }
    }

    // Sign out immediately — user must wait for admin approval before logging in.
    if (data.session) await supabase.auth.signOut();

    nav('/', { replace: true, state: { signupSubmitted: true } });
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-10" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center"
      >
        <img src="/logo.webp" alt="INNOPARK" width={72} height={72} style={{ objectFit: 'contain' }} />
        <div className="mt-3 text-center">
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: '#1B3A7A', fontSize: '18px', letterSpacing: '2px' }}>INNOPARK</div>
          <div className="text-navy/40 text-xs mt-0.5">حديقة النجاح للابتكار</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-navy/8 shadow-xl p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-black text-navy mb-1">إنشاء حساب جديد</h1>
        <p className="text-navy/40 text-sm mb-6">سيتم مراجعة طلبك من قبل الأدمن قبل التفعيل</p>

        <div className="space-y-4">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-navy/10 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <img
                src={avatarPreview || '/logo.webp'}
                alt="صورة الحكّم"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xl">📷</span>
              </div>
            </div>
            <span className="text-xs text-navy/40">
              {avatarFile ? avatarFile.name : 'اضغط لرفع صورة (اختياري)'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              نبذة / سبب الانضمام <span className="text-red-500">*</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="عرّف عن نفسك ولماذا تريد الانضمام كحكّم"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              رقم الجوال <span className="text-navy/35 text-xs">(اختياري)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              dir="ltr"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              القسم / الكلية <span className="text-navy/35 text-xs">(اختياري)</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="مثال: كلية الهندسة"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-navy text-white font-black py-3 rounded-xl text-base disabled:opacity-60"
          >
            {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب →'}
          </motion.button>
        </div>

        <div className="mt-6 pt-6 border-t border-navy/10 text-center">
          <span className="text-navy/50 text-sm">لديك حساب بالفعل؟ </span>
          <button
            onClick={() => nav('/login')}
            className="text-navy font-bold text-sm hover:underline"
          >
            تسجيل الدخول
          </button>
        </div>
      </motion.div>

      <button onClick={() => nav('/')} className="mt-6 text-navy/35 hover:text-navy text-sm transition-colors">
        → العودة للرئيسية
      </button>
    </div>
  );
}
