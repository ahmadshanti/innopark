import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^05[0-9]{8}$/;

const DEPARTMENTS = [
  'كلية الهندسة وتكنولوجيا المعلومات',
  'كلية العلوم',
  'كلية الطب وعلوم الصحة',
  'كلية الصيدلة',
  'كلية التمريض',
  'كلية الحقوق والسياسة',
  'كلية الاقتصاد والعلوم الإدارية',
  'كلية التكنولوجيا',
  'كلية الشريعة',
  'كلية التربية',
  'كلية الآداب',
  'كلية الزراعة والعلوم البيطرية',
  'كلية العمارة والتصميم',
  'وحدة أخرى / إدارية',
];

export default function SignupPage() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSignup() {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push('الاسم الكامل');
    if (!email.trim()) missing.push('البريد الإلكتروني');
    if (!password.trim()) missing.push('كلمة المرور');
    if (!bio.trim()) missing.push('النبذة');
    if (!docFile) missing.push('الوثائق والمؤهلات');
    if (missing.length > 0) {
      setError(`${missing.join(' و')} حقول إجبارية`);
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('كلمة المرور يجب أن تحتوي على حروف وأرقام معاً');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      setError('رقم الجوال غير صحيح، يجب أن يكون 10 أرقام ويبدأ بـ 05');
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

    if (userId && docFile && data.session) {
      const ext = docFile.name.split('.').pop();
      await supabase.storage.from('avatars').upload(`${userId}/cv.${ext}`, docFile, { upsert: true });
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
        <h1 className="text-2xl font-black text-navy mb-6 text-center">إنشاء حساب جديد</h1>

        <div className="space-y-4">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative">
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-navy/10 cursor-pointer group bg-navy/5"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="صورة الحكّم" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 text-navy/25" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xl">📷</span>
                </div>
              </div>
              {avatarFile && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  title="حذف الصورة"
                  className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors shadow"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs text-navy/40">
              {avatarFile ? avatarFile.name : 'اضغط لرفع صورة شخصية'}
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
              placeholder="8 أحرف على الأقل (حروف وأرقام)"
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              تأكيد كلمة المرور <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
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
            <label className="block text-sm font-bold text-navy/60 mb-2">رقم الجوال</label>
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
            <label className="block text-sm font-bold text-navy/60 mb-2">الكلية / القسم</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
            >
              <option value="">-- اختر الكلية / القسم --</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-navy/60 mb-2">
              الوثائق والمؤهلات <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => docInputRef.current?.click()}
              className="w-full border-2 border-dashed border-navy/20 rounded-xl px-4 py-4 text-center cursor-pointer hover:border-navy/40 transition-colors bg-cream/30"
            >
              {docFile ? (
                <div className="flex items-center justify-between">
                  <span className="text-navy text-sm font-medium truncate">{docFile.name}</span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setDocFile(null); if (docInputRef.current) docInputRef.current.value = ''; }}
                    className="text-red-500 text-xs mr-2 hover:text-red-700 flex-shrink-0"
                  >✕</button>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-1">📎</div>
                  <p className="text-navy/50 text-sm">اضغط لرفع السيرة الذاتية أو شهادات الخبرة</p>
                  <p className="text-navy/30 text-xs mt-1">PDF, DOC, JPG — حتى 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) { setError('حجم الملف يجب أن يكون أقل من 5MB'); return; }
                setDocFile(f);
                setError('');
              }}
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

          <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <p className="text-blue-700 text-sm leading-relaxed">
              بعد إرسال الطلب، سيتم مراجعته من قِبل الأدمن قبل تفعيل حسابك. ستتمكن من تسجيل الدخول فور الموافقة.
            </p>
          </div>

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
