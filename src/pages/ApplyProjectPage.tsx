import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';
import type { ProjectType, SubmitProjectMemberInput, SubmitProjectResult } from '../types/db';

interface TeamMember {
  full_name: string;
  email: string;
  role: string;
}

const emptyMember = (): TeamMember => ({ full_name: '', email: '', role: '' });

const EMAIL_RE = /^[^@\s]+@(stu\.)?najah\.edu$/i;
const MOBILE_RE = /^[0-9+\-\s]{7,}$/;

export default function ApplyProjectPage() {
  const nav = useNavigate();

  const [type, setType] = useState<ProjectType>('individual');
  const [projectName, setProjectName] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([emptyMember()]);

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SubmitProjectResult | null>(null);

  function updateMember(i: number, patch: Partial<TeamMember>) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }
  function addMember()     { setMembers(prev => [...prev, emptyMember()]); }
  function removeMember(i: number) {
    setMembers(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!projectName.trim())   errs.push('اسم المشروع مطلوب');
    if (!applicantName.trim()) errs.push('اسم مقدم الطلب مطلوب');
    if (!MOBILE_RE.test(mobile.trim())) errs.push('رقم الجوال غير صحيح');
    if (!EMAIL_RE.test(email.trim())) errs.push('البريد الإلكتروني يجب أن ينتهي بـ @najah.edu أو @stu.najah.edu');

    if (type === 'team') {
      const filled = members.filter(m => m.full_name.trim());
      if (filled.length === 0) errs.push('أضف عضواً واحداً على الأقل لفريق المشروع');
      filled.forEach((m, i) => {
        if (m.email.trim() && !/^\S+@\S+\.\S+$/.test(m.email.trim())) {
          errs.push(`بريد العضو ${i + 1} غير صحيح`);
        }
      });
    }
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    setSubmitting(true);
    const payloadMembers: SubmitProjectMemberInput[] = type === 'team'
      ? members
          .filter(m => m.full_name.trim())
          .map(m => ({
            full_name: m.full_name.trim(),
            email: m.email.trim() || undefined,
            role:  m.role.trim()  || undefined,
          }))
      : [];

    const { data, error } = await supabase.rpc('submit_project', {
      p_project_name:   projectName.trim(),
      p_project_type:   type,
      p_applicant_name: applicantName.trim(),
      p_mobile:         mobile.trim(),
      p_email:          email.trim().toLowerCase(),
      p_department:     department.trim() || null,
      p_description:    description.trim() || null,
      p_members:        payloadMembers,
    });

    setSubmitting(false);

    if (error) {
      setErrors([
        error.message.includes('najah')
          ? 'البريد الإلكتروني يجب أن ينتهي بـ @najah.edu أو @stu.najah.edu'
          : 'تعذّر إرسال الطلب. حاول مرة أخرى.',
      ]);
      return;
    }
    setSuccess(data as SubmitProjectResult);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-12" style={{ marginTop: '80px' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl w-full bg-white rounded-2xl border border-navy/8 p-8 md:p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 14 }}
              className="w-16 h-16 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-6"
            >
              <span className="text-3xl text-gold">✓</span>
            </motion.div>
            <h1 className="text-3xl font-black text-navy mb-3">تم استلام طلبك</h1>
            <p className="text-navy/55 leading-relaxed mb-6">
              شكراً لتقديم مشروعك. طلبك الآن قيد المراجعة من فريق الإدارة، وسيتم إعلامك عبر البريد الإلكتروني بعد اعتماده.
            </p>
            <div className="inline-flex items-center gap-3 bg-navy/5 rounded-xl px-5 py-3 mb-8">
              <span className="text-xs text-navy/50">رقم الطلب</span>
              <span className="font-grotesk font-black text-navy text-lg">#{success.project_number}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => nav('/')}
                className="bg-navy text-white font-bold px-6 py-3 rounded-xl"
              >
                العودة للرئيسية
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <form onSubmit={onSubmit} className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 py-10" style={{ marginTop: '80px' }}>
        <div className="mb-8">
          <span className="inline-block bg-gold text-navy text-xs font-bold tracking-[3px] uppercase px-4 py-2 rounded mb-4">
            تقديم مشروع
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-navy mb-2">قدّم مشروعك للتقييم</h1>
          <p className="text-navy/55">عبّئ النموذج التالي وسيراجع فريق الإدارة طلبك قبل تحويله للمحكّمين.</p>
        </div>

        <div className="bg-white rounded-2xl border border-navy/8 p-6 md:p-8 space-y-6">

          {/* نوع المشروع */}
          <div>
            <label className="block text-sm font-bold text-navy/70 mb-3">نوع المشروع *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['individual', 'team'] as ProjectType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    type === t
                      ? 'border-navy bg-navy text-white'
                      : 'border-navy/15 bg-cream/40 text-navy/60 hover:border-navy/40'
                  }`}
                >
                  {t === 'individual' ? 'فردي' : 'فريق'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="اسم المشروع *">
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="أدخل اسم مشروعك"
                className={inputClass}
              />
            </Field>
            <Field label={type === 'team' ? 'اسم قائد الفريق *' : 'اسم مقدم الطلب *'}>
              <input
                value={applicantName}
                onChange={e => setApplicantName(e.target.value)}
                placeholder="الاسم الكامل"
                className={inputClass}
              />
            </Field>
            <Field label="رقم الجوال *">
              <input
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="مثال: 0599123456"
                inputMode="tel"
                className={inputClass}
                dir="ltr"
              />
            </Field>
            <Field label="البريد الجامعي *">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@najah.edu أو example@stu.najah.edu"
                type="email"
                className={inputClass}
                dir="ltr"
              />
            </Field>
            <Field label="الكلية / القسم">
              <input
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="اختياري"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="وصف مختصر للمشروع">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="اكتب وصفاً مختصراً لفكرة المشروع (اختياري)"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </Field>

          {/* فريق المشروع */}
          <AnimatePresence initial={false}>
            {type === 'team' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-navy/8">
                  <div className="flex items-center justify-between mb-4 mt-5">
                    <div>
                      <div className="text-sm font-bold text-navy">أعضاء الفريق</div>
                      <div className="text-xs text-navy/50">أضف باقي الأعضاء (بدون قائد الفريق)</div>
                    </div>
                    <button
                      type="button"
                      onClick={addMember}
                      className="text-xs font-bold text-navy bg-gold/20 hover:bg-gold/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + إضافة عضو
                    </button>
                  </div>

                  <div className="space-y-3">
                    {members.map((m, i) => (
                      <div key={i} className="bg-cream/50 border border-navy/8 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                        <input
                          value={m.full_name}
                          onChange={e => updateMember(i, { full_name: e.target.value })}
                          placeholder="الاسم الكامل *"
                          className={`${inputClass} md:col-span-5`}
                        />
                        <input
                          value={m.email}
                          onChange={e => updateMember(i, { email: e.target.value })}
                          placeholder="البريد (اختياري)"
                          type="email"
                          dir="ltr"
                          className={`${inputClass} md:col-span-4`}
                        />
                        <input
                          value={m.role}
                          onChange={e => updateMember(i, { role: e.target.value })}
                          placeholder="الدور"
                          className={`${inputClass} md:col-span-2`}
                        />
                        <button
                          type="button"
                          onClick={() => removeMember(i)}
                          disabled={members.length === 1}
                          className="md:col-span-1 h-[42px] rounded-lg text-navy/40 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-navy/40 transition-colors text-lg"
                          aria-label="حذف"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4 space-y-1"
          >
            {errors.map((e, i) => (
              <div key={i} className="text-red-700 text-sm flex items-center gap-2">⚠️ {e}</div>
            ))}
          </motion.div>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => nav('/')}
            className="text-navy/50 hover:text-navy text-sm font-medium"
          >
            → العودة للرئيسية
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={submitting}
            className="bg-gold hover:bg-gold-dark text-navy font-black px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 min-h-[44px]"
          >
            {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب ←'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'w-full border border-navy/15 rounded-xl px-4 py-3 text-navy text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all bg-cream/50 placeholder:text-navy/25';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-navy/70 mb-2">{label}</label>
      {children}
    </div>
  );
}
