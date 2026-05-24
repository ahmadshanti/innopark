import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

type Tab = 'judges' | 'projects';

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  'غير جاهز':       { bg: '#FCEBEB', text: '#A32D2D' },
  'مبكر جداً':      { bg: '#FAEEDA', text: '#854F0B' },
  'جاهز للاحتضان': { bg: '#E6F1FB', text: '#185FA5' },
  'متقدم':          { bg: '#E1F5EE', text: '#0F6E56' },
  'عالي النضج':     { bg: '#EEEDFE', text: '#534AB7' },
};

export default function AdminPage() {
  const nav = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('judges');

  // Judges
  const [judges, setJudges] = useState<any[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [evalCounts, setEvalCounts] = useState<Record<string, number>>({});
  const [showAddJudge, setShowAddJudge] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Judge details modal
  const [selectedJudge, setSelectedJudge] = useState<any>(null);
  const [judgeSubmissions, setJudgeSubmissions] = useState<any[]>([]);
  const [judgeSubsLoading, setJudgeSubsLoading] = useState(false);

  // Projects
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || data.session.user?.email !== 'admin@innopark.ps') {
        nav('/login', { replace: true });
        return;
      }
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (tab === 'judges') loadJudges();
    if (tab === 'projects') loadProjects();
  }, [tab, authChecked]);

  async function loadJudges() {
    setJudgesLoading(true);
    const [{ data: judgesData }, { data: subsData }] = await Promise.all([
      supabase.from('judges').select('*').order('created_at', { ascending: false }),
      supabase.from('submissions').select('judge_id'),
    ]);
    if (judgesData) setJudges(judgesData);
    if (subsData) {
      const counts: Record<string, number> = {};
      subsData.forEach((s: any) => { if (s.judge_id) counts[s.judge_id] = (counts[s.judge_id] || 0) + 1; });
      setEvalCounts(counts);
    }
    setJudgesLoading(false);
  }

  async function loadJudgeSubmissions(judgeId: string) {
    setJudgeSubsLoading(true);
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('judge_id', judgeId)
      .order('created_at', { ascending: false });
    if (data) setJudgeSubmissions(data);
    setJudgeSubsLoading(false);
  }

  async function loadProjects() {
    setProjectsLoading(true);
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach((sub: any) => {
        const num = sub.project_number || 'غير محدد';
        if (!grouped[num]) grouped[num] = [];
        grouped[num].push(sub);
      });
      const result = Object.entries(grouped).map(([num, subs]) => {
        const avgScore = subs.reduce((a: number, s: any) => a + (s.final_score || 0), 0) / subs.length;
        return {
          projectNumber: num,
          projectName: subs[0]?.project_name,
          judges: subs.map((s: any) => ({ judgeName: s.judge_name || 'حكّم', score: s.final_score, classification: s.classification })),
          avgScore,
          avgClassification: getClassificationFromScore(avgScore),
        };
      });
      setProjects(result);
    }
    setProjectsLoading(false);
  }

  function getClassificationFromScore(score: number): string {
    if (score < 40) return 'غير جاهز';
    if (score < 60) return 'مبكر جداً';
    if (score < 75) return 'جاهز للاحتضان';
    if (score < 85) return 'متقدم';
    return 'عالي النضج';
  }

  async function updateJudgeStatus(id: string, status: string) {
    await supabase.from('judges').update({ status }).eq('id', id);
    loadJudges();
  }

  async function handleDeleteJudge(judgeId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الحكّم؟')) return;
    await supabase.from('judges').delete().eq('id', judgeId);
    loadJudges();
  }

  async function handleAddJudge() {
    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setAddError('يرجى إدخال جميع الحقول'); return;
    }
    setAddError(''); setAddLoading(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (!adminSession) throw new Error('جلسة المشرف غير موجودة');

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: newEmail.trim(), password: newPassword.trim(),
      });
      if (signupError) throw new Error(signupError.message.includes('already') ? 'البريد الإلكتروني مسجل مسبقاً' : signupError.message);
      if (!signupData.user) throw new Error('فشل إنشاء المستخدم');

      const judgeId = signupData.user.id;

      await supabase.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      await new Promise(r => setTimeout(r, 500));

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) await supabase.auth.signInWithPassword({ email: 'admin@innopark.ps', password: 'Innopark@2026' });

      const { error: insertError } = await supabase.from('judges').insert({
        id: judgeId, full_name: newFullName.trim(), email: newEmail.trim(), status: 'approved',
      });
      if (insertError) throw new Error(`خطأ في الإضافة: ${insertError.message}`);

      setAddSuccess('تم إضافة الحكّم بنجاح ✅');
      setNewFullName(''); setNewEmail(''); setNewPassword('');
      setTimeout(() => { setAddSuccess(''); setShowAddJudge(false); }, 2000);
      loadJudges();
    } catch (err: any) {
      setAddError(err.message || 'حدث خطأ أثناء الإضافة');
    }
    setAddLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut(); nav('/');
  }

  if (!authChecked) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-navy/40 text-sm">جارٍ التحقق...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '100px', paddingBottom: '32px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-white/40 text-sm mb-1">INNOPARK — لوحة التحكم</div>
              <h1 className="text-2xl md:text-3xl font-black text-white">إدارة النظام</h1>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-red-400 text-sm transition-colors flex items-center gap-1">
              🚪 خروج
            </button>
          </div>
          <div className="flex gap-2">
            {(['judges', 'projects'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-gold text-navy' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}>
                {t === 'judges' ? '⚖️ الحكّام' : '🏆 المشاريع'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8">

        {/* Judges Tab */}
        {tab === 'judges' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-navy">إدارة الحكّام</h2>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setShowAddJudge(true); setAddError(''); setAddSuccess(''); }}
                className="bg-navy text-white font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2">
                + إضافة حكّم
              </motion.button>
            </div>

            <AnimatePresence>
              {showAddJudge && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-navy/8 p-6 mb-6">
                  <h3 className="font-black text-navy mb-4">إضافة حكّم جديد</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">الاسم الكامل *</label>
                      <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)}
                        placeholder="اسم الحكّم"
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-navy text-sm focus:outline-none focus:border-navy bg-cream/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">البريد الإلكتروني *</label>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                        placeholder="judge@example.com"
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-navy text-sm focus:outline-none focus:border-navy bg-cream/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">كلمة المرور *</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-navy text-sm focus:outline-none focus:border-navy bg-cream/50" />
                    </div>
                  </div>
                  {addError && <div className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2">⚠️ {addError}</div>}
                  {addSuccess && <div className="text-green-600 text-sm mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2">{addSuccess}</div>}
                  <div className="flex gap-3">
                    <button onClick={handleAddJudge} disabled={addLoading}
                      className="bg-navy text-white font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-60">
                      {addLoading ? 'جارٍ الإضافة...' : 'إضافة'}
                    </button>
                    <button onClick={() => setShowAddJudge(false)}
                      className="text-navy/50 hover:text-navy text-sm px-4 py-2.5 border border-navy/15 rounded-xl">
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {judgesLoading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : judges.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
                <div className="text-5xl mb-4">👤</div>
                <div className="text-navy/40">لا يوجد حكّام مسجلون بعد</div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
                <div className="hidden md:grid grid-cols-6 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider">
                  <div className="col-span-2">الحكّم</div>
                  <div>تاريخ التسجيل</div>
                  <div>التقييمات</div>
                  <div>الحالة</div>
                  <div>إجراءات</div>
                </div>
                <div className="divide-y divide-navy/5">
                  {judges.map((judge: any, i: number) => (
                    <motion.div key={judge.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="px-4 md:px-6 py-4 md:grid md:grid-cols-6 md:items-center space-y-3 md:space-y-0 cursor-pointer hover:bg-cream transition-colors"
                      onClick={() => { setSelectedJudge(judge); loadJudgeSubmissions(judge.id); }}>
                      <div className="md:col-span-2">
                        <div className="font-bold text-navy text-sm">{judge.full_name}</div>
                        <div className="text-xs text-navy/40 mt-0.5">{judge.email}</div>
                      </div>
                      <div className="text-xs text-navy/40">{new Date(judge.created_at).toLocaleDateString('ar-SA')}</div>
                      <div className="text-sm font-bold text-navy" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                        {evalCounts[judge.id] || 0}
                      </div>
                      <div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          judge.status === 'approved' ? 'bg-green-100 text-green-700' :
                          judge.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {judge.status === 'approved' ? '✅ مقبول' : judge.status === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة'}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                        {judge.status !== 'approved' && (
                          <button onClick={() => updateJudgeStatus(judge.id, 'approved')}
                            className="text-xs bg-green-600 text-white font-bold px-3 py-1 rounded-lg hover:bg-green-700">قبول</button>
                        )}
                        {judge.status !== 'rejected' && (
                          <button onClick={() => updateJudgeStatus(judge.id, 'rejected')}
                            className="text-xs bg-red-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-red-600">رفض</button>
                        )}
                        <button onClick={() => handleDeleteJudge(judge.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-bold border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors">
                          🗑️ حذف
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {tab === 'projects' && (
          <div>
            <h2 className="text-xl font-black text-navy mb-6">نتائج المشاريع — مجمّعة برقم المشروع</h2>
            {projectsLoading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
                <div className="text-5xl mb-4">🏆</div>
                <div className="text-navy/40">لا توجد نتائج مشاريع بعد</div>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((proj: any, i: number) => {
                  const avgC = LEVEL_COLORS[proj.avgClassification] ?? { bg: '#f1f5f9', text: '#64748b' };
                  return (
                    <motion.div key={proj.projectNumber} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }} className="bg-white rounded-2xl border border-navy/8 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                            <span className="text-gold font-black text-sm" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{proj.projectNumber}</span>
                          </div>
                          <div>
                            <div className="font-black text-navy text-lg">{proj.projectName}</div>
                            <div className="text-navy/40 text-xs mt-0.5">{proj.judges.length} حكّام قيّموا هذا المشروع</div>
                            <span className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                              style={{ background: avgC.bg, color: avgC.text }}>{proj.avgClassification}</span>
                          </div>
                        </div>
                        <div className="text-center bg-navy rounded-xl p-3 flex-shrink-0">
                          <div className="text-2xl font-black text-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{proj.avgScore.toFixed(1)}</div>
                          <div className="text-white/40 text-xs">متوسط</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {proj.judges.map((j: any, ji: number) => {
                          const c = LEVEL_COLORS[j.classification] ?? { bg: '#f1f5f9', text: '#64748b' };
                          return (
                            <div key={ji} className="bg-cream rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <div className="text-xs font-bold text-navy">{j.judgeName}</div>
                                <span className="inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: c.bg, color: c.text }}>{j.classification}</span>
                              </div>
                              <div className="text-xl font-black text-navy" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{j.score}</div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Judge Details Modal */}
      <AnimatePresence>
        {selectedJudge && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedJudge(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="bg-navy p-6 rounded-t-2xl flex items-center justify-between">
                <div>
                  <div className="text-white/40 text-xs mb-1">تفاصيل الحكّم</div>
                  <div className="text-white text-xl font-black">{selectedJudge.full_name}</div>
                  <div className="text-white/50 text-sm mt-0.5">{selectedJudge.email}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-3xl font-black text-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{judgeSubmissions.length}</div>
                  <div className="text-white/40 text-xs">تقييم</div>
                </div>
              </div>
              <div className="p-6">
                <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">تقييمات هذا الحكّم</div>
                {judgeSubsLoading ? (
                  <div className="text-center py-8 text-navy/40">جارٍ التحميل...</div>
                ) : judgeSubmissions.length === 0 ? (
                  <div className="text-center py-8 text-navy/40">لا توجد تقييمات بعد</div>
                ) : (
                  <div className="space-y-3">
                    {judgeSubmissions.map((sub: any, i: number) => {
                      const c = LEVEL_COLORS[sub.classification] ?? { bg: '#f1f5f9', text: '#64748b' };
                      return (
                        <div key={i} className="bg-cream rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                                <span className="text-gold text-xs font-black">{sub.project_number || '—'}</span>
                              </div>
                              <div>
                                <div className="font-bold text-navy text-sm">{sub.project_name}</div>
                                <div className="text-xs text-navy/40">{sub.date}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>
                                {sub.classification}
                              </span>
                              <div className="text-2xl font-black text-navy" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{sub.final_score}</div>
                            </div>
                          </div>
                          {sub.results?.dimensions && (
                            <div className="grid grid-cols-5 gap-1">
                              {sub.results.dimensions.map((d: any, di: number) => (
                                <div key={di} className="bg-white rounded-lg p-2 text-center">
                                  <div className="text-xs text-navy/40 mb-0.5 truncate">{d.nameAr}</div>
                                  <div className="text-sm font-black text-navy">{d.avgScore}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setSelectedJudge(null)}
                  className="w-full mt-4 bg-navy text-white font-bold py-3 rounded-xl text-sm">إغلاق</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-[#0f1e47] py-6 px-8 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="INNOPARK" width={36} height={36} style={{ objectFit: 'contain' }} />
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