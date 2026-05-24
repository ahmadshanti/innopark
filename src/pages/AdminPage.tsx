import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Submission } from '../types';
import { getSubmissions } from '../utils/scoring';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface AdminPageProps {
  onBack: () => void;
  onLogout: () => void;
}

type Tab = 'submissions' | 'users';

const CLASSIFICATIONS = ['الكل', 'غير جاهز', 'مبكر جداً', 'جاهز للاحتضان', 'متقدم', 'عالي النضج'];

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  'غير جاهز':       { bg: '#FCEBEB', text: '#A32D2D' },
  'مبكر جداً':      { bg: '#FAEEDA', text: '#854F0B' },
  'جاهز للاحتضان': { bg: '#E6F1FB', text: '#185FA5' },
  'متقدم':          { bg: '#E1F5EE', text: '#0F6E56' },
  'عالي النضج':     { bg: '#EEEDFE', text: '#534AB7' },
};

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminPage({ onBack, onLogout }: AdminPageProps) {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('submissions');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('الكل');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    getSubmissions().then(data => { setSubmissions(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab]);

  async function loadUsers() {
    setUsersLoading(true);
    const { data, error } = await supabase.auth.admin.listUsers();
    if (!error && data) setUsers(data.users as AdminUser[]);
    setUsersLoading(false);
  }

  async function handleAddUser() {
    if (!newEmail || !newPassword) { setAddError('يرجى إدخال البريد وكلمة المرور'); return; }
    setAddError(''); setAddLoading(true);
    const { error } = await supabase.auth.admin.createUser({
      email: newEmail,
      password: newPassword,
      email_confirm: true,
    });
    if (error) {
      setAddError(error.message);
    } else {
      setAddSuccess('تم إضافة المستخدم بنجاح ✅');
      setNewEmail(''); setNewPassword('');
      setTimeout(() => { setAddSuccess(''); setShowAddUser(false); }, 2000);
      loadUsers();
    }
    setAddLoading(false);
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    await supabase.auth.admin.deleteUser(id);
    loadUsers();
  }

  const filtered = useMemo(() => {
    return submissions.filter(s => {
      if (!s.data?.projectInfo || !s.results) return false;
      const matchSearch = (s.data.projectInfo.projectName ?? '').includes(search) ||
                         (s.data.projectInfo.applicantName ?? '').includes(search);
      const matchFilter = filter === 'الكل' || s.results.classification === filter;
      return matchSearch && matchFilter;
    });
  }, [submissions, search, filter]);

  function exportCSV() {
    const rows = [
      ['اسم المشروع', 'مقدم الطلب', 'الجهة', 'الدرجة', 'التصنيف', 'التاريخ'],
      ...submissions.map(s => [
        s.data.projectInfo.projectName,
        s.data.projectInfo.applicantName,
        s.data.projectInfo.department,
        s.results.finalScore,
        s.results.classification,
        s.date,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقارير_INNOPARK.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = useMemo(() => {
    const valid = submissions.filter(s => s.results?.finalScore != null);
    const total = submissions.length;
    const avg = valid.length > 0 ? (valid.reduce((s, sub) => s + sub.results.finalScore, 0) / valid.length).toFixed(1) : '0';
    const ready = valid.filter(s => s.results.finalScore >= 60).length;
    return { total, avg, ready };
  }, [submissions]);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar onStartEval={() => nav('/evaluation')} onAdminClick={() => {}} />

      {/* Header */}
      <div className="bg-navy px-4 md:px-8 flex-shrink-0" style={{ paddingTop: '80px', paddingBottom: '32px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-white/40 text-sm mb-1">INNOPARK — لوحة التحكم</div>
              <h1 className="text-3xl font-black text-white">إدارة النظام</h1>
            </div>
            <div className="flex items-center gap-3">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={exportCSV}
                className="bg-gold text-navy font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2"
              >
                📥 تصدير CSV
              </motion.button>
              <button onClick={onLogout} className="text-white/40 hover:text-red-400 text-sm transition-colors flex items-center gap-1">
                🚪 خروج
              </button>
              <button onClick={onBack} className="text-white/50 hover:text-white text-sm transition-colors">
                → الرئيسية
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            {[
              { label: 'إجمالي التقييمات', val: stats.total, icon: '📋' },
              { label: 'متوسط الدرجات', val: stats.avg, icon: '📊' },
              { label: 'جاهز للاحتضان فأعلى', val: stats.ready, icon: '✅' },
            ].map((s, i) => (
              <div key={i} className="bg-white/8 rounded-xl p-4 flex items-center gap-4">
                <div className="text-2xl">{s.icon}</div>
                <div>
                  <div className="text-2xl font-black text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{s.val}</div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('submissions')}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'submissions' ? 'bg-gold text-navy' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}
            >
              📋 التقييمات
            </button>
          
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-6 md:py-8">

        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 mb-6">
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 بحث باسم المشروع أو مقدم الطلب..."
                className="flex-1 min-w-[200px] border border-navy/15 rounded-xl px-4 py-2.5 text-navy text-sm focus:outline-none focus:border-navy bg-white"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {CLASSIFICATIONS.map(c => (
                  <button key={c} onClick={() => setFilter(c)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${filter === c ? 'bg-navy text-white' : 'bg-navy/6 text-navy/50 hover:bg-navy/10'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📭</div>
                <div className="text-navy/40">{submissions.length === 0 ? 'لا توجد تقييمات بعد' : 'لا توجد نتائج مطابقة'}</div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
                <div className="overflow-x-auto">
                <div className="grid grid-cols-6 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider min-w-[600px]">
                  <div className="col-span-2">المشروع</div>
                  <div>الجهة</div>
                  <div>الدرجة</div>
                  <div>التصنيف</div>
                  <div>التاريخ</div>
                </div>
                <div className="divide-y divide-navy/5 min-w-[600px]">
                  {filtered.map((sub, i) => {
                    const c = LEVEL_COLORS[sub.results.classification] ?? { bg: '#f1f5f9', text: '#64748b' };
                    return (
                      <motion.div key={sub.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelected(sub)}
                        className="grid grid-cols-6 px-6 py-4 hover:bg-cream cursor-pointer transition-colors items-center"
                      >
                        <div className="col-span-2">
                          <div className="font-bold text-navy text-sm">{sub.data.projectInfo.projectName}</div>
                          <div className="text-xs text-navy/40 mt-0.5">{sub.data.projectInfo.applicantName}</div>
                        </div>
                        <div className="text-sm text-navy/60">{sub.data.projectInfo.department}</div>
                        <div className="font-black text-navy text-lg" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{sub.results.finalScore}</div>
                        <div><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>{sub.results.classification}</span></div>
                        <div className="text-xs text-navy/40">{sub.date}</div>
                      </motion.div>
                    );
                  })}
                </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-navy">المستخدمون المشرفون</h2>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setShowAddUser(true); setAddError(''); setAddSuccess(''); }}
                className="bg-navy text-white font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2"
              >
                + إضافة مستخدم
              </motion.button>
            </div>

            {/* Add user form */}
            <AnimatePresence>
              {showAddUser && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-navy/8 p-6 mb-6"
                >
                  <h3 className="font-black text-navy mb-4">إضافة مستخدم جديد</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">البريد الإلكتروني</label>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                        placeholder="user@innopark.ps"
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-navy text-sm focus:outline-none focus:border-navy bg-cream/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">كلمة المرور</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-navy text-sm focus:outline-none focus:border-navy bg-cream/50"
                      />
                    </div>
                  </div>
                  {addError && <div className="text-red-600 text-sm mb-3">⚠️ {addError}</div>}
                  {addSuccess && <div className="text-green-600 text-sm mb-3">{addSuccess}</div>}
                  <div className="flex gap-3">
                    <button onClick={handleAddUser} disabled={addLoading}
                      className="bg-navy text-white font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-60"
                    >
                      {addLoading ? 'جارٍ الإضافة...' : 'إضافة'}
                    </button>
                    <button onClick={() => setShowAddUser(false)}
                      className="text-navy/50 hover:text-navy text-sm px-4 py-2.5 border border-navy/15 rounded-xl"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {usersLoading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : (
              <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
                <div className="grid grid-cols-4 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider">
                  <div className="col-span-2">البريد الإلكتروني</div>
                  <div>تاريخ الإنشاء</div>
                  <div>إجراءات</div>
                </div>
                <div className="divide-y divide-navy/5">
                  {users.map((user, i) => (
                    <motion.div key={user.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="grid grid-cols-4 px-6 py-4 items-center"
                    >
                      <div className="col-span-2">
                        <div className="font-bold text-navy text-sm">{user.email}</div>
                        <div className="text-xs text-navy/30 mt-0.5">ID: {user.id.slice(0, 8)}...</div>
                      </div>
                      <div className="text-xs text-navy/40">
                        {new Date(user.created_at).toLocaleDateString('ar-SA')}
                      </div>
                      <div>
                        <button onClick={() => handleDeleteUser(user.id)}
                          className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg"
                        >
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
      </div>

      {/* Submission Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelected(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="bg-navy p-6 rounded-t-2xl flex items-start justify-between">
                <div>
                  <div className="text-white/40 text-xs mb-1">تفاصيل المشروع</div>
                  <div className="text-white text-xl font-black">{selected.data.projectInfo.projectName}</div>
                  <div className="text-white/50 text-sm mt-1">{selected.data.projectInfo.applicantName} — {selected.data.projectInfo.department}</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-gold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{selected.results.finalScore}</div>
                  <div className="text-white/40 text-xs">/ 100</div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {(() => {
                  const c = LEVEL_COLORS[selected.results.classification] ?? { bg: '#f1f5f9', text: '#64748b' };
                  return <span className="text-sm font-bold px-3 py-1.5 rounded-full" style={{ background: c.bg, color: c.text }}>{selected.results.classification} — {selected.results.classificationEn}</span>;
                })()}
                <div className="bg-cream rounded-xl p-4">
                  <div className="text-xs font-bold text-navy/40 mb-1">القرار</div>
                  <div className="text-sm text-navy">{selected.results.decision}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-3">درجات المحاور</div>
                  <div className="space-y-2">
                    {selected.results.dimensions.map(d => (
                      <div key={d.key} className="flex items-center gap-3">
                        <div className="w-32 text-xs font-medium text-navy/70">{d.nameAr}</div>
                        <div className="flex-1 h-2 bg-navy/6 rounded-full overflow-hidden">
                          <div className="h-full bg-gold rounded-full" style={{ width: `${(d.avgScore / 5) * 100}%` }} />
                        </div>
                        <div className="text-xs font-bold text-navy w-8">{d.avgScore}/5</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-full bg-navy text-white font-bold py-3 rounded-xl text-sm">إغلاق</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-[#0f1e47] py-5 px-4 md:px-8 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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