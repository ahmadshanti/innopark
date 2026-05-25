import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/use-auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProjectFiles from '../components/ProjectFiles';
import CriteriaAdmin from './CriteriaAdmin';
import type { Profile, Project, ProjectMember, ProjectStatus, UserStatus } from '../types/db';

type Tab = 'applications' | 'judges' | 'projects' | 'criteria';
type AppRow = Project & { project_members: ProjectMember[] };
type StatusFilter = 'all' | ProjectStatus;
type UserStatusFilter = 'all' | UserStatus;

interface ReviewRow {
  id: string;
  project_id: string;
  judge_id: string;
  final_score: number | null;
  classification: string | null;
  submitted_at: string | null;
}

interface JudgeReviewItem {
  id: string;
  projectNumber: number | null;
  projectName: string;
  submittedAt: string;
  finalScore: number | null;
  classification: string | null;
}

interface ProjectSummary {
  projectId: string;
  projectNumber: number | null;
  projectName: string;
  reviews: {
    judgeId: string;
    judgeName: string;
    score: number;
    classification: string;
  }[];
  avgScore: number;
  avgClassification: string;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  'غير جاهز': { bg: '#FCEBEB', text: '#A32D2D' },
  'مبكر جداً': { bg: '#FAEEDA', text: '#854F0B' },
  'جاهز للاحتضان': { bg: '#E6F1FB', text: '#185FA5' },
  متقدم: { bg: '#E1F5EE', text: '#0F6E56' },
  'عالي النضج': { bg: '#EEEDFE', text: '#534AB7' },
};

export default function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('applications');

  const [apps, setApps] = useState<AppRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState('');
  const [appsFilter, setAppsFilter] = useState<StatusFilter>('pending');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [judges, setJudges] = useState<Profile[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [judgesError, setJudgesError] = useState('');
  const [judgeEvalCounts, setJudgeEvalCounts] = useState<Record<string, number>>({});
  const [roleActingId, setRoleActingId] = useState<string | null>(null);
  const [visibilityActingId, setVisibilityActingId] = useState<string | null>(null);
  const [usersFilter, setUsersFilter] = useState<UserStatusFilter>('pending');
  const [statusActingId, setStatusActingId] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Profile['role']>('judge');
  const [selectedJudge, setSelectedJudge] = useState<Profile | null>(null);
  const [judgeReviews, setJudgeReviews] = useState<JudgeReviewItem[]>([]);
  const [judgeReviewsLoading, setJudgeReviewsLoading] = useState(false);
  const [judgeReviewsError, setJudgeReviewsError] = useState('');

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');

  useEffect(() => {
    if (tab === 'applications') loadApplications();
    else if (tab === 'judges') loadUsers();
    else if (tab === 'projects') loadProjects();
    // The loaders are stable closures over component state setters; we only
    // want to re-trigger when the active tab changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadApplications() {
    setAppsLoading(true);
    setAppsError('');
    const { data, error } = await supabase
      .from('projects')
      .select('*, project_members(*)')
      .order('created_at', { ascending: false });

    if (error) {
      setAppsError(error.message || 'تعذّر تحميل الطلبات');
      setApps([]);
    } else {
      setApps((data ?? []) as AppRow[]);
    }
    setAppsLoading(false);
  }

  async function handleSetStatus(id: string, status: ProjectStatus) {
    let reason: string | null = null;
    if (status === 'rejected') {
      const input = window.prompt('سبب الرفض (اختياري):', '');
      if (input === null) return;
      reason = input.trim() === '' ? null : input.trim();
    }

    setActingId(id);
    setAppsError('');

    const callRpc = (force: boolean) =>
      supabase.rpc('set_project_status', {
        p_project_id: id,
        p_status: status,
        p_reason: reason,
        p_force: force,
      });

    let { error } = await callRpc(false);

    // Server raises 42501 when the admin tries to undo an already-judged
    // project — ask for explicit confirmation, then replay with p_force=true.
    if (error && /submitted review/i.test(error.message)) {
      const confirmed = window.confirm(
        'هذا المشروع لديه تقييمات مُسلَّمة. متابعة التغيير ستُبقي التقييمات الحالية ولكنها لن تكون مرئية للحكّام حتى تعيد الموافقة. هل تريد المتابعة؟',
      );
      if (!confirmed) {
        setActingId(null);
        return;
      }
      ({ error } = await callRpc(true));
    }

    setActingId(null);

    if (error) {
      setAppsError(error.message || 'تعذّر تحديث حالة الطلب');
      return;
    }

    await loadApplications();
  }

  const appsCounts = useMemo(() => {
    const counts = { all: apps.length, pending: 0, approved: 0, rejected: 0 };
    for (const app of apps) counts[app.status] += 1;
    return counts;
  }, [apps]);

  const filteredApps = useMemo(
    () => (appsFilter === 'all' ? apps : apps.filter((app) => app.status === appsFilter)),
    [apps, appsFilter],
  );

  async function loadUsers() {
    setJudgesLoading(true);
    setJudgesError('');

    const [profilesRes, reviewsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'judge'])
        .order('status', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('project_reviews')
        .select('judge_id, submitted_at'),
    ]);

    if (profilesRes.error) {
      setJudgesError(profilesRes.error.message || 'تعذّر تحميل المستخدمين');
      setJudges([]);
      setJudgeEvalCounts({});
      setJudgesLoading(false);
      return;
    }

    if (reviewsRes.error) {
      setJudgesError(reviewsRes.error.message || 'تعذّر تحميل نشاط المستخدمين');
    }

    const counts: Record<string, number> = {};
    for (const review of reviewsRes.data ?? []) {
      if (!review.submitted_at) continue;
      counts[review.judge_id] = (counts[review.judge_id] || 0) + 1;
    }

    setJudges((profilesRes.data ?? []) as Profile[]);
    setJudgeEvalCounts(counts);
    setJudgesLoading(false);
  }

  async function loadJudgeReviews(judge: Profile) {
    setSelectedJudge(judge);
    setJudgeReviewsLoading(true);
    setJudgeReviewsError('');

    if (judge.role === 'admin') {
      setJudgeReviews([]);
      setJudgeReviewsLoading(false);
      return;
    }

    const reviewsRes = await supabase
      .from('project_reviews')
      .select('id, project_id, judge_id, final_score, classification, submitted_at')
      .eq('judge_id', judge.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });

    if (reviewsRes.error) {
      setJudgeReviews([]);
      setJudgeReviewsError(reviewsRes.error.message || 'تعذّر تحميل تقييمات الحكّم');
      setJudgeReviewsLoading(false);
      return;
    }

    const reviews = (reviewsRes.data ?? []) as ReviewRow[];
    const projectIds = [...new Set(reviews.map((review) => review.project_id))];

    const projectsRes = projectIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('projects')
          .select('id, project_number, project_name')
          .in('id', projectIds);

    if (projectsRes.error) {
      setJudgeReviews([]);
      setJudgeReviewsError(projectsRes.error.message || 'تعذّر تحميل بيانات المشاريع');
      setJudgeReviewsLoading(false);
      return;
    }

    const projectMap = new Map(
      ((projectsRes.data ?? []) as Pick<Project, 'id' | 'project_number' | 'project_name'>[])
        .map((project) => [project.id, project]),
    );

    setJudgeReviews(
      reviews.map((review) => {
        const project = projectMap.get(review.project_id);
        return {
          id: review.id,
          projectNumber: project?.project_number ?? null,
          projectName: project?.project_name ?? 'مشروع غير متاح',
          submittedAt: review.submitted_at ?? '',
          finalScore: review.final_score,
          classification: review.classification,
        };
      }),
    );
    setJudgeReviewsLoading(false);
  }

  async function loadProjects() {
    setProjectsLoading(true);
    setProjectsError('');

    const reviewsRes = await supabase
      .from('project_reviews')
      .select('id, project_id, judge_id, final_score, classification, submitted_at')
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });

    if (reviewsRes.error) {
      setProjectsError(reviewsRes.error.message || 'تعذّر تحميل نتائج المشاريع');
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    const reviews = (reviewsRes.data ?? []) as ReviewRow[];
    const projectIds = [...new Set(reviews.map((review) => review.project_id))];
    const judgeIds = [...new Set(reviews.map((review) => review.judge_id))];

    const [projectsRes, profilesRes] = await Promise.all([
      projectIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from('projects')
            .select('id, project_number, project_name')
            .in('id', projectIds),
      judgeIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', judgeIds),
    ]);

    if (projectsRes.error) {
      setProjectsError(projectsRes.error.message || 'تعذّر تحميل بيانات المشاريع');
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    if (profilesRes.error) {
      setProjectsError(profilesRes.error.message || 'تعذّر تحميل بيانات الحكّام');
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    const projectMap = new Map(
      ((projectsRes.data ?? []) as Pick<Project, 'id' | 'project_number' | 'project_name'>[])
        .map((project) => [project.id, project]),
    );
    const judgeNameMap = new Map(
      ((profilesRes.data ?? []) as Pick<Profile, 'id' | 'full_name'>[])
        .map((profile) => [profile.id, profile.full_name?.trim() || 'حكّم']),
    );

    const grouped = new Map<string, ProjectSummary>();
    for (const review of reviews) {
      const project = projectMap.get(review.project_id);
      const score = review.final_score ?? 0;
      const classification = review.classification || getClassificationFromScore(score);

      if (!grouped.has(review.project_id)) {
        grouped.set(review.project_id, {
          projectId: review.project_id,
          projectNumber: project?.project_number ?? null,
          projectName: project?.project_name ?? 'مشروع غير متاح',
          reviews: [],
          avgScore: 0,
          avgClassification: 'غير جاهز',
        });
      }

      grouped.get(review.project_id)?.reviews.push({
        judgeId: review.judge_id,
        judgeName: judgeNameMap.get(review.judge_id) || 'حكّم',
        score,
        classification,
      });
    }

    const summaries = [...grouped.values()]
      .map((summary) => {
        const avgScore =
          summary.reviews.reduce((total, review) => total + review.score, 0) / summary.reviews.length;
        return {
          ...summary,
          avgScore,
          avgClassification: getClassificationFromScore(avgScore),
        };
      })
      .sort((a, b) => (b.projectNumber ?? 0) - (a.projectNumber ?? 0));

    setProjects(summaries);
    setProjectsLoading(false);
  }

  function getClassificationFromScore(score: number): string {
    if (score < 40) return 'غير جاهز';
    if (score < 60) return 'مبكر جداً';
    if (score < 75) return 'جاهز للاحتضان';
    if (score < 85) return 'متقدم';
    return 'عالي النضج';
  }

  async function toggleVisibility(target: Profile) {
    setVisibilityActingId(target.id);
    const { error } = await supabase
      .from('profiles')
      .update({ visible_on_page: !target.visible_on_page })
      .eq('id', target.id);
    setVisibilityActingId(null);
    if (error) {
      setJudgesError(error.message || 'تعذّر تحديث الظهور');
      return;
    }
    await loadUsers();
  }

  async function updateUserStatus(target: Profile, status: UserStatus) {
    if (target.id === profile?.id) {
      setJudgesError('لا يمكنك تعديل حالة حسابك الحالي');
      return;
    }

    setStatusActingId(target.id);
    setJudgesError('');

    const { error } = await supabase.rpc('set_user_status', {
      p_user_id: target.id,
      p_status: status,
    });

    setStatusActingId(null);

    if (error) {
      setJudgesError(error.message || 'تعذّر تحديث حالة المستخدم');
      return;
    }

    await loadUsers();
  }

  const usersCounts = useMemo(() => {
    const counts = { all: judges.length, pending: 0, approved: 0, rejected: 0 };
    for (const judge of judges) counts[judge.status] += 1;
    return counts;
  }, [judges]);

  const filteredJudges = useMemo(
    () => (usersFilter === 'all' ? judges : judges.filter((judge) => judge.status === usersFilter)),
    [judges, usersFilter],
  );

  async function updateUserRole(target: Profile, role: Profile['role']) {
    if (target.id === profile?.id && role !== target.role) {
      setJudgesError('لا يمكنك تعديل دور حسابك الحالي من هذه الصفحة');
      return;
    }

    const confirmed = window.confirm(
      role === 'admin'
        ? `هل تريد ترقية ${target.full_name?.trim() || 'هذا المستخدم'} إلى أدمن؟`
        : `هل تريد إرجاع ${target.full_name?.trim() || 'هذا المستخدم'} إلى حكم؟`,
    );
    if (!confirmed) return;

    setRoleActingId(target.id);
    setJudgesError('');

    // Route through the SECURITY DEFINER RPC so the change is auditable and
    // the user's `status` is not silently rewritten — a rejected user must be
    // re-approved deliberately from the moderation buttons.
    const { error } = await supabase.rpc('admin_set_user_role', {
      p_user_id: target.id,
      p_role: role,
    });

    setRoleActingId(null);

    if (error) {
      setJudgesError(error.message || 'تعذّر تحديث دور المستخدم');
      return;
    }

    if (selectedJudge?.id === target.id) {
      setSelectedJudge({ ...selectedJudge, role });
      if (role === 'admin') setJudgeReviews([]);
    }

    await loadUsers();
  }

  async function createUserFromAdmin() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setJudgesError('الاسم والبريد وكلمة المرور مطلوبة');
      return;
    }
    if (newUserPassword.trim().length < 8) {
      setJudgesError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setCreatingUser(true);
    setJudgesError('');

    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        fullName: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword.trim(),
        role: newUserRole,
      },
    });

    setCreatingUser(false);

    if (error) {
      setJudgesError(error.message || 'تعذّر إنشاء المستخدم');
      return;
    }
    if (data?.error) {
      setJudgesError(data.error);
      return;
    }

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('judge');
    setShowAddUser(false);
    await loadUsers();
  }


  function renderRolePill(role: Profile['role']) {
    return role === 'admin' ? (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gold/20 text-gold-dark">
        Admin
      </span>
    ) : (
      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-navy/8 text-navy/70">
        Judge
      </span>
    );
  }

  function renderStatusPill(status: UserStatus) {
    if (status === 'approved') {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✅ مفعّل</span>;
    }
    if (status === 'rejected') {
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ مرفوض</span>;
    }
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⏳ قيد المراجعة</span>;
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />

      <div
        className="bg-navy px-4 md:px-8 flex-shrink-0"
        style={{ paddingTop: '100px', paddingBottom: '32px' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-white/40 text-sm mb-1">INNOPARK — لوحة التحكم</div>
              <h1 className="text-2xl md:text-3xl font-black text-white">إدارة النظام</h1>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['applications', 'judges', 'projects', 'criteria'] as Tab[]).map((currentTab) => (
              <button
                key={currentTab}
                onClick={() => setTab(currentTab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  tab === currentTab ? 'bg-gold text-navy' : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                {currentTab === 'applications'
                  ? '📥 الطلبات الجديدة'
                  : currentTab === 'judges'
                    ? '👥 المستخدمون'
                    : currentTab === 'projects'
                      ? '🏆 المشاريع'
                      : '🎯 معايير التقييم'}
                {currentTab === 'applications' && appsCounts.pending > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      tab === currentTab ? 'bg-navy text-gold' : 'bg-gold text-navy'
                    }`}
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    {appsCounts.pending}
                  </span>
                )}
                {currentTab === 'judges' && usersCounts.pending > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      tab === currentTab ? 'bg-navy text-gold' : 'bg-gold text-navy'
                    }`}
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    {usersCounts.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
        {tab === 'applications' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-black text-navy">طلبات المشاريع</h2>
                <p className="text-navy/40 text-xs mt-1">
                  الموافقة على المشاريع تجعلها متاحة للحكّام للتقييم
                </p>
              </div>
              <button
                onClick={loadApplications}
                disabled={appsLoading}
                className="text-xs font-bold text-navy/60 hover:text-navy border border-navy/15 hover:border-navy/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {appsLoading ? 'جارٍ التحديث...' : '↻ تحديث'}
              </button>
            </div>

            <div className="flex gap-2 mb-5 flex-wrap">
              {(
                [
                  { k: 'pending', label: 'قيد المراجعة', count: appsCounts.pending },
                  { k: 'approved', label: 'مقبولة', count: appsCounts.approved },
                  { k: 'rejected', label: 'مرفوضة', count: appsCounts.rejected },
                  { k: 'all', label: 'الكل', count: appsCounts.all },
                ] as { k: StatusFilter; label: string; count: number }[]
              ).map((filter) => (
                <button
                  key={filter.k}
                  onClick={() => setAppsFilter(filter.k)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 ${
                    appsFilter === filter.k
                      ? 'bg-navy text-white'
                      : 'bg-white text-navy/60 border border-navy/10 hover:border-navy/30'
                  }`}
                >
                  {filter.label}
                  <span
                    className={`text-[10px] font-black px-1.5 rounded-full ${
                      appsFilter === filter.k ? 'bg-gold text-navy' : 'bg-navy/8 text-navy/60'
                    }`}
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            {appsError && (
              <div className="text-red-700 text-sm mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ⚠️ {appsError}
              </div>
            )}

            {appsLoading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
                <div className="text-5xl mb-4">📭</div>
                <div className="text-navy/40">
                  {apps.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد طلبات في هذا التصنيف'}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider">
                  <div className="col-span-1">رقم</div>
                  <div className="col-span-4">المشروع</div>
                  <div className="col-span-2">النوع</div>
                  <div className="col-span-2">التاريخ</div>
                  <div className="col-span-1">الحالة</div>
                  <div className="col-span-2 text-left">إجراءات</div>
                </div>
                <div className="divide-y divide-navy/5">
                  {filteredApps.map((project, index) => {
                    const expanded = expandedAppId === project.id;
                    const acting = actingId === project.id;
                    const statusPill =
                      project.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : project.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700';
                    const statusLabel =
                      project.status === 'approved'
                        ? '✅ مقبول'
                        : project.status === 'rejected'
                          ? '❌ مرفوض'
                          : '⏳ قيد المراجعة';

                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.03, 0.3) }}
                      >
                        <div
                          onClick={() => setExpandedAppId(expanded ? null : project.id)}
                          className="px-4 md:px-6 py-4 md:grid md:grid-cols-12 md:items-center md:gap-3 space-y-2 md:space-y-0 cursor-pointer hover:bg-cream transition-colors"
                        >
                          <div className="md:col-span-1">
                            <div className="inline-flex md:flex items-center gap-2">
                              <span
                                className="text-navy font-black text-sm bg-navy/5 px-2 py-1 rounded-lg"
                                style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                #{project.project_number}
                              </span>
                            </div>
                          </div>
                          <div className="md:col-span-4">
                            <div className="font-bold text-navy text-sm">{project.project_name}</div>
                            <div className="text-xs text-navy/40 mt-0.5">{project.applicant_name}</div>
                          </div>
                          <div className="md:col-span-2">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                project.project_type === 'team'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-navy/5 text-navy/70'
                              }`}
                            >
                              {project.project_type === 'team' ? '👥 فريق' : '👤 فردي'}
                            </span>
                          </div>
                          <div className="md:col-span-2 text-xs text-navy/50">
                            {new Date(project.created_at).toLocaleDateString('ar-SA')}
                          </div>
                          <div className="md:col-span-1">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusPill}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <div
                            className="md:col-span-2 flex gap-2 flex-wrap md:justify-end"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {project.status !== 'approved' && (
                              <button
                                onClick={() => handleSetStatus(project.id, 'approved')}
                                disabled={acting}
                                className="text-xs bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                              >
                                {acting ? '...' : 'قبول'}
                              </button>
                            )}
                            {project.status !== 'rejected' && (
                              <button
                                onClick={() => handleSetStatus(project.id, 'rejected')}
                                disabled={acting}
                                className="text-xs bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
                              >
                                {acting ? '...' : 'رفض'}
                              </button>
                            )}
                            {project.status !== 'pending' && (
                              <button
                                onClick={() => handleSetStatus(project.id, 'pending')}
                                disabled={acting}
                                className="text-xs text-navy/60 hover:text-navy font-bold border border-navy/15 hover:border-navy/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                تعليق
                              </button>
                            )}
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-cream/60 border-t border-navy/5"
                            >
                              <div className="px-4 md:px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                                    البريد الإلكتروني
                                  </div>
                                  <div className="text-sm text-navy break-all">{project.email}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                                    رقم الجوال
                                  </div>
                                  <div
                                    className="text-sm text-navy text-right"
                                    dir="ltr"
                                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                                  >
                                    {project.mobile}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                                    القسم / الكلية
                                  </div>
                                  <div className="text-sm text-navy">{project.department || '—'}</div>
                                </div>
                                {project.description && (
                                  <div className="md:col-span-3">
                                    <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                                      وصف المشروع
                                    </div>
                                    <div className="text-sm text-navy/80 leading-relaxed whitespace-pre-wrap">
                                      {project.description}
                                    </div>
                                  </div>
                                )}
                                {project.project_type === 'team' && project.project_members?.length > 0 && (
                                  <div className="md:col-span-3">
                                    <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-2">
                                      أعضاء الفريق
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {[...project.project_members]
                                        .sort((left, right) => left.position - right.position)
                                        .map((member) => (
                                          <div
                                            key={member.id}
                                            className="bg-white rounded-lg px-3 py-2 border border-navy/5 flex items-center justify-between gap-2"
                                          >
                                            <div className="min-w-0">
                                              <div className="text-sm font-bold text-navy truncate">
                                                {member.full_name}
                                              </div>
                                              {(member.email || member.role) && (
                                                <div className="text-xs text-navy/40 truncate">
                                                  {member.role}
                                                  {member.role && member.email ? ' · ' : ''}
                                                  {member.email}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                                <div className="md:col-span-3">
                                  <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-2">
                                    الملفات المرفقة
                                  </div>
                                  <ProjectFiles projectId={project.id} />
                                </div>
                                {project.status === 'rejected' && project.rejected_reason && (
                                  <div className="md:col-span-3">
                                    <div className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-1">
                                      سبب الرفض
                                    </div>
                                    <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                      {project.rejected_reason}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'judges' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-black text-navy">إدارة المستخدمين</h2>
                <p className="text-navy/40 text-xs mt-1">
                  كل مستخدم جديد يبدأ كـ `judge`، ويمكن للأدمن ترقيته إلى `admin`
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddUser((current) => !current);
                    setJudgesError('');
                  }}
                  className="text-xs bg-navy text-white font-bold px-3 py-1.5 rounded-lg hover:bg-navy/90"
                >
                  + مستخدم جديد
                </button>
                <button
                  onClick={loadUsers}
                  disabled={judgesLoading}
                  className="text-xs font-bold text-navy/60 hover:text-navy border border-navy/15 hover:border-navy/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {judgesLoading ? 'جارٍ التحديث...' : '↻ تحديث'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-navy/8 p-5 mb-6">
              <div className="font-bold text-navy mb-2">ملاحظة تشغيلية</div>
              <div className="text-sm text-navy/60 leading-relaxed">
                المستخدمون يسجّلون من صفحة <code className="text-navy">/signup</code> وتظهر طلباتهم في
                تبويب «قيد المراجعة» بانتظار قبولك أو رفضك. يمكنك أيضًا إنشاء مستخدم مفعّل مباشرة من
                «+ مستخدم جديد».
              </div>
            </div>

            <div className="flex gap-2 mb-5 flex-wrap">
              {(
                [
                  { k: 'pending', label: 'قيد المراجعة', count: usersCounts.pending },
                  { k: 'approved', label: 'مفعّلون', count: usersCounts.approved },
                  { k: 'rejected', label: 'مرفوضون', count: usersCounts.rejected },
                  { k: 'all', label: 'الكل', count: usersCounts.all },
                ] as { k: UserStatusFilter; label: string; count: number }[]
              ).map((filter) => (
                <button
                  key={filter.k}
                  onClick={() => setUsersFilter(filter.k)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-2 ${
                    usersFilter === filter.k
                      ? 'bg-navy text-white'
                      : 'bg-white text-navy/60 border border-navy/10 hover:border-navy/30'
                  }`}
                >
                  {filter.label}
                  <span
                    className={`text-[10px] font-black px-1.5 rounded-full ${
                      usersFilter === filter.k ? 'bg-gold text-navy' : 'bg-navy/8 text-navy/60'
                    }`}
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence>
              {showAddUser && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-navy/8 p-5 mb-6"
                >
                  <div className="font-black text-navy mb-4">إنشاء مستخدم جديد</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-navy/50 mb-2">الاسم الكامل</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(event) => setNewUserName(event.target.value)}
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-sm text-navy bg-cream/50 focus:outline-none focus:border-navy"
                        placeholder="مثال: أحمد شنتي"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">الدور</label>
                      <select
                        value={newUserRole}
                        onChange={(event) => setNewUserRole(event.target.value as Profile['role'])}
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-sm text-navy bg-cream/50 focus:outline-none focus:border-navy"
                      >
                        <option value="judge">Judge</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy/50 mb-2">كلمة المرور</label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={(event) => setNewUserPassword(event.target.value)}
                        className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-sm text-navy bg-cream/50 focus:outline-none focus:border-navy"
                        placeholder="8 أحرف على الأقل"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-navy/50 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(event) => setNewUserEmail(event.target.value)}
                      className="w-full border border-navy/15 rounded-xl px-4 py-2.5 text-sm text-navy bg-cream/50 focus:outline-none focus:border-navy"
                      placeholder="user@example.com"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={createUserFromAdmin}
                      disabled={creatingUser}
                      className="text-sm bg-gold text-navy font-bold px-4 py-2 rounded-lg hover:bg-gold-dark disabled:opacity-50"
                    >
                      {creatingUser ? 'جارٍ الإنشاء...' : 'إنشاء المستخدم'}
                    </button>
                    <button
                      onClick={() => setShowAddUser(false)}
                      className="text-sm border border-navy/15 text-navy/60 font-bold px-4 py-2 rounded-lg hover:border-navy/30 hover:text-navy"
                    >
                      إلغاء
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {judgesError && (
              <div className="text-red-700 text-sm mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ⚠️ {judgesError}
              </div>
            )}

            {judgesLoading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : filteredJudges.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
                <div className="text-5xl mb-4">👤</div>
                <div className="text-navy/40">
                  {judges.length === 0 ? 'لا يوجد مستخدمون مسجلون بعد' : 'لا يوجد مستخدمون في هذا التصنيف'}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-navy/8 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-navy/3 border-b border-navy/8 text-xs font-bold text-navy/40 uppercase tracking-wider">
                  <div className="col-span-3">المستخدم</div>
                  <div>تاريخ التسجيل</div>
                  <div>الدور / الحالة</div>
                  <div>التقييمات</div>
                  <div className="col-span-3">الإجراءات</div>
                  <div className="col-span-2">التفاصيل</div>
                </div>
                <div className="divide-y divide-navy/5">
                  {filteredJudges.map((judge, index) => (
                    <motion.div
                      key={judge.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(index * 0.04, 0.25) }}
                      className="px-4 md:px-6 py-4 md:grid md:grid-cols-12 md:items-center md:gap-3 space-y-3 md:space-y-0 cursor-pointer hover:bg-cream transition-colors"
                      onClick={() => loadJudgeReviews(judge)}
                    >
                      <div className="md:col-span-3">
                        <div className="font-bold text-navy text-sm">
                          {judge.full_name?.trim() || (judge.role === 'admin' ? 'أدمن بدون اسم' : 'حكّم بدون اسم')}
                        </div>
                        <div className="text-xs text-navy/40 mt-0.5">
                          المعرّف: {judge.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className="text-xs text-navy/40">
                        {new Date(judge.created_at).toLocaleDateString('ar-SA')}
                      </div>
                      <div className="flex flex-col gap-1 items-start">
                        {renderRolePill(judge.role)}
                        {renderStatusPill(judge.status)}
                      </div>
                      <div
                        className="text-sm font-bold text-navy"
                        style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                      >
                        {judgeEvalCounts[judge.id] || 0}
                      </div>
                      <div
                        className="md:col-span-3 flex gap-2 flex-wrap"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {judge.id !== profile?.id && judge.status !== 'approved' && (
                          <button
                            onClick={() => updateUserStatus(judge, 'approved')}
                            disabled={statusActingId === judge.id}
                            className="text-xs bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {statusActingId === judge.id ? '...' : 'قبول'}
                          </button>
                        )}
                        {judge.id !== profile?.id && judge.status !== 'rejected' && (
                          <button
                            onClick={() => updateUserStatus(judge, 'rejected')}
                            disabled={statusActingId === judge.id}
                            className="text-xs bg-red-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            {statusActingId === judge.id ? '...' : 'رفض'}
                          </button>
                        )}
                        {judge.status === 'approved' && judge.role === 'judge' && (
                          <button
                            onClick={() => updateUserRole(judge, 'admin')}
                            disabled={roleActingId === judge.id}
                            className="text-xs bg-gold text-navy font-bold px-3 py-1.5 rounded-lg hover:bg-gold-dark disabled:opacity-50"
                          >
                            {roleActingId === judge.id ? '...' : 'جعله أدمن'}
                          </button>
                        )}
                        {judge.status === 'approved' && judge.role === 'admin' && judge.id !== profile?.id && (
                          <button
                            onClick={() => updateUserRole(judge, 'judge')}
                            disabled={roleActingId === judge.id}
                            className="text-xs border border-navy/15 text-navy/70 font-bold px-3 py-1.5 rounded-lg hover:border-navy/30 hover:text-navy disabled:opacity-50"
                          >
                            {roleActingId === judge.id ? '...' : 'إرجاعه حكم'}
                          </button>
                        )}
                        {judge.role === 'judge' && judge.status === 'approved' && (
                          <button
                            onClick={() => toggleVisibility(judge)}
                            disabled={visibilityActingId === judge.id}
                            title={judge.visible_on_page ? 'إخفاء من صفحة الحكّام' : 'إظهار في صفحة الحكّام'}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              judge.visible_on_page
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'bg-navy/10 text-navy/50 hover:bg-navy/20'
                            }`}
                          >
                            {visibilityActingId === judge.id ? '...' : judge.visible_on_page ? '● ظاهر' : '○ مخفي'}
                          </button>
                        )}
                        {judge.id === profile?.id && (
                          <span className="text-xs font-bold text-navy/35 px-1 py-1.5">
                            حسابك الحالي
                          </span>
                        )}
                      </div>
                      <div className="md:col-span-2 text-xs text-navy/40">
                        {judge.role === 'admin' ? 'إدارة النظام' : 'اضغط لعرض التقييمات'}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'criteria' && <CriteriaAdmin />}

        {tab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-black text-navy">نتائج المشاريع</h2>
                <p className="text-navy/40 text-xs mt-1">
                  تجميع تقييمات `project_reviews` المعتمدة حسب المشروع
                </p>
              </div>
              <button
                onClick={loadProjects}
                disabled={projectsLoading}
                className="text-xs font-bold text-navy/60 hover:text-navy border border-navy/15 hover:border-navy/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {projectsLoading ? 'جارٍ التحديث...' : '↻ تحديث'}
              </button>
            </div>

            {projectsError && (
              <div className="text-red-700 text-sm mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                ⚠️ {projectsError}
              </div>
            )}

            {projectsLoading ? (
              <div className="text-center py-20 text-navy/40">جارٍ التحميل...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-navy/8">
                <div className="text-5xl mb-4">🏆</div>
                <div className="text-navy/40">لا توجد نتائج مشاريع بعد</div>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project, index) => {
                  const avgColor = LEVEL_COLORS[project.avgClassification] ?? {
                    bg: '#f1f5f9',
                    text: '#64748b',
                  };

                  return (
                    <motion.div
                      key={project.projectId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.06, 0.3) }}
                      className="bg-white rounded-2xl border border-navy/8 p-6"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                            <span
                              className="text-gold font-black text-sm"
                              style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                            >
                              {project.projectNumber ?? '—'}
                            </span>
                          </div>
                          <div>
                            <div className="font-black text-navy text-lg">{project.projectName}</div>
                            <div className="text-navy/40 text-xs mt-0.5">
                              {project.reviews.length} حكّام قيّموا هذا المشروع
                            </div>
                            <span
                              className="inline-block mt-1 text-xs font-bold px-2.5 py-0.5 rounded-full"
                              style={{ background: avgColor.bg, color: avgColor.text }}
                            >
                              {project.avgClassification}
                            </span>
                          </div>
                        </div>
                        <div className="text-center bg-navy rounded-xl p-3 flex-shrink-0">
                          <div
                            className="text-2xl font-black text-gold"
                            style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                          >
                            {project.avgScore.toFixed(1)}
                          </div>
                          <div className="text-white/40 text-xs">متوسط</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {project.reviews.map((review) => {
                          const color = LEVEL_COLORS[review.classification] ?? {
                            bg: '#f1f5f9',
                            text: '#64748b',
                          };

                          return (
                            <div
                              key={`${project.projectId}-${review.judgeId}`}
                              className="bg-cream rounded-xl p-3 flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-bold text-navy">{review.judgeName}</div>
                                <span
                                  className="inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: color.bg, color: color.text }}
                                >
                                  {review.classification}
                                </span>
                              </div>
                              <div
                                className="text-xl font-black text-navy"
                                style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                {review.score.toFixed(1)}
                              </div>
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

      <AnimatePresence>
        {selectedJudge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedJudge(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="bg-navy p-6 rounded-t-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-white/40 text-xs mb-1">تفاصيل المستخدم</div>
                  <div className="text-white text-xl font-black">
                    {selectedJudge.full_name?.trim() || (selectedJudge.role === 'admin' ? 'أدمن بدون اسم' : 'حكّم بدون اسم')}
                  </div>
                  <div className="text-white/50 text-sm mt-0.5">
                    {selectedJudge.role === 'admin' ? 'هذا الحساب يملك صلاحية الإدارة' : 'هذا الحساب يملك صلاحية التقييم'}
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div
                    className="text-3xl font-black text-gold"
                    style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                  >
                    {judgeEvalCounts[selectedJudge.id] || 0}
                  </div>
                  <div className="text-white/40 text-xs">تقييم</div>
                </div>
              </div>
              <div className="p-6">
                {(selectedJudge.bio || selectedJudge.phone || selectedJudge.department) && (
                  <div className="bg-cream rounded-xl p-4 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedJudge.phone && (
                      <div>
                        <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                          رقم الجوال
                        </div>
                        <div className="text-sm text-navy" dir="ltr" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                          {selectedJudge.phone}
                        </div>
                      </div>
                    )}
                    {selectedJudge.department && (
                      <div>
                        <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                          القسم / الكلية
                        </div>
                        <div className="text-sm text-navy">{selectedJudge.department}</div>
                      </div>
                    )}
                    {selectedJudge.bio && (
                      <div className="md:col-span-2">
                        <div className="text-[10px] font-bold text-navy/40 uppercase tracking-widest mb-1">
                          نبذة / سبب الانضمام
                        </div>
                        <div className="text-sm text-navy/80 leading-relaxed whitespace-pre-wrap">
                          {selectedJudge.bio}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs font-bold text-navy/40 uppercase tracking-widest mb-4">
                  {selectedJudge.role === 'admin' ? 'صلاحيات الحساب' : 'تقييمات هذا الحكّم'}
                </div>
                {judgeReviewsLoading ? (
                  <div className="text-center py-8 text-navy/40">جارٍ التحميل...</div>
                ) : judgeReviewsError ? (
                  <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    ⚠️ {judgeReviewsError}
                  </div>
                ) : selectedJudge.role === 'admin' ? (
                  <div className="bg-cream rounded-xl p-4 text-sm text-navy/60 leading-relaxed">
                    هذا الحساب يستطيع إدارة المعايير واعتماد المشاريع وترقية المستخدمين بين `judge`
                    و`admin`. لا توجد له لوحة تقييم مشاريع.
                  </div>
                ) : judgeReviews.length === 0 ? (
                  <div className="text-center py-8 text-navy/40">لا توجد تقييمات بعد</div>
                ) : (
                  <div className="space-y-3">
                    {judgeReviews.map((review) => {
                      const color = LEVEL_COLORS[review.classification || 'غير جاهز'] ?? {
                        bg: '#f1f5f9',
                        text: '#64748b',
                      };

                      return (
                        <div key={review.id} className="bg-cream rounded-xl p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                                <span className="text-gold text-xs font-black">
                                  {review.projectNumber ?? '—'}
                                </span>
                              </div>
                              <div>
                                <div className="font-bold text-navy text-sm">{review.projectName}</div>
                                <div className="text-xs text-navy/40">
                                  {review.submittedAt
                                    ? new Date(review.submittedAt).toLocaleDateString('ar-SA')
                                    : '—'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: color.bg, color: color.text }}
                              >
                                {review.classification || '—'}
                              </span>
                              <div
                                className="text-2xl font-black text-navy"
                                style={{ fontFamily: "'Space Grotesk',sans-serif" }}
                              >
                                {review.finalScore?.toFixed(1) ?? '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={() => setSelectedJudge(null)}
                  className="w-full mt-4 bg-navy text-white font-bold py-3 rounded-xl text-sm"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer containerClassName="max-w-6xl" className="py-6 px-8" />
    </div>
  );
}
