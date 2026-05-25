import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/use-auth';
import { getHomePathForRole } from '../lib/authorization';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ProfilePage() {
  const nav = useNavigate();
  const { session, profile: authProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, bio, phone, department, avatar_url')
        .eq('id', session!.user.id)
        .single();

      if (data) {
        setFullName(data.full_name ?? '');
        setBio(data.bio ?? '');
        setPhone(data.phone ?? '');
        setDepartment(data.department ?? '');
        setAvatarUrl(data.avatar_url ?? null);
      }
      setLoading(false);
    }
    loadProfile();
  }, [session]);

  const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_AVATAR_MIME.includes(file.type)) {
      setError('نوع الملف غير مدعوم. اختر صورة JPG / PNG / WEBP / GIF.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 2MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  }

  async function handleSave() {
    if (!fullName.trim()) {
      setError('الاسم الكامل مطلوب');
      return;
    }
    if (!session) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    const userId = session.user.id;
    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      // Normalise the extension by MIME type so we always overwrite the same
      // object instead of orphaning previous uploads.
      const extByMime: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png':  'png',
        'image/webp': 'webp',
        'image/gif':  'gif',
      };
      const ext = extByMime[avatarFile.type] ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

      if (uploadError) {
        setError('تعذّر رفع الصورة: ' + uploadError.message);
        setSaving(false);
        return;
      }
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        // Cache-buster so navbar / judges page show the fresh image immediately.
        newAvatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      }
    }

    const { data: updatedRows, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        department: department.trim(),
        avatar_url: newAvatarUrl,
      })
      .eq('id', userId)
      .select('id');

    setSaving(false);

    if (updateError) {
      setError('تعذّر حفظ التغييرات: ' + updateError.message);
      return;
    }
    // RLS returns 0 rows without raising when the policy denies the write —
    // surface that as an explicit error instead of a silent fake-success.
    if (!updatedRows || updatedRows.length === 0) {
      setError('تعذّر حفظ التغييرات: الصلاحيات لا تسمح بتحديث هذا الحساب');
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين');
      return;
    }
    setSavingPassword(true);
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (pwError) {
      setPasswordError('تعذّر تغيير كلمة المرور: ' + pwError.message);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess(true);
    setTimeout(() => setPasswordSuccess(false), 3000);
  }

  const displayAvatar = avatarPreview || avatarUrl || '/logo.webp';

  return (
    <div className="min-h-screen bg-cream flex flex-col" dir="rtl">
      <Navbar />

      <div
        className="bg-navy px-4 md:px-8 flex-shrink-0"
        style={{ paddingTop: '100px', paddingBottom: '40px' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 flex-shrink-0">
            <img src={displayAvatar} alt="صورة الحساب" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white/40 text-xs mb-1">الملف الشخصي</div>
            <div className="text-white text-2xl font-black">
              {authProfile?.full_name?.trim() || session?.user.email}
            </div>
            <div className="text-white/40 text-sm mt-0.5">{session?.user.email}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-8 py-8">
        {loading ? (
          <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-navy/8 p-6 md:p-8 space-y-5">

            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b border-navy/8">
              <div
                className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-navy/10 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={displayAvatar} alt="الصورة الشخصية" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-2xl">📷</span>
                </div>
              </div>
              <span className="text-xs text-navy/40">
                {avatarFile ? avatarFile.name : 'اضغط على الصورة لتغييرها'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-navy/60 mb-2">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-bold text-navy/60 mb-2">
                نبذة شخصية
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50 resize-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-navy/60 mb-2">
                رقم الجوال <span className="text-navy/35 text-xs">(اختياري)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-bold text-navy/60 mb-2">
                القسم / الكلية <span className="text-navy/35 text-xs">(اختياري)</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
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

            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm"
              >
                ✅ تم حفظ التغييرات بنجاح
              </motion.div>
            )}

            <div className="flex gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-navy text-white font-black py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </motion.button>
              <button
                onClick={() => nav(authProfile ? getHomePathForRole(authProfile.role) : '/')}
                className="px-5 py-3 border border-navy/15 text-navy/60 font-bold rounded-xl text-sm hover:border-navy/30 hover:text-navy transition-colors"
              >
                رجوع
              </button>
            </div>

            {/* Password section */}
            <div className="border-t border-navy/8 pt-6 mt-2 space-y-4">
              <div>
                <h3 className="text-base font-black text-navy mb-1">تغيير كلمة المرور</h3>
                <p className="text-navy/40 text-xs">اتركها فارغة إذا لا تريد تغييرها</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-navy/60 mb-2">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-navy/60 mb-2">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  className="w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 bg-cream/50"
                />
              </div>

              {passwordError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"
                >
                  ⚠️ {passwordError}
                </motion.div>
              )}

              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm"
                >
                  ✅ تم تغيير كلمة المرور بنجاح
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword}
                className="w-full bg-gold text-navy font-black py-3 rounded-xl text-sm disabled:opacity-40"
              >
                {savingPassword ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
              </motion.button>
            </div>
          </div>
        )}
      </div>

      <Footer containerClassName="max-w-2xl" className="py-6 px-8" />
    </div>
  );
}
