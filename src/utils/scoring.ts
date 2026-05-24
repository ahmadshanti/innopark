import type { EvaluationData, EvaluationResult, DimensionResult, Submission } from '../types';
import { DIMENSIONS } from '../types';
import { supabase } from '../lib/supabase';

export function calculateResults(data: EvaluationData): EvaluationResult {
  const dimKeys = ['technology', 'market', 'businessModel', 'teamCapabilities', 'impact'] as const;

  const dimensions: DimensionResult[] = dimKeys.map((key) => {
    const dim = DIMENSIONS[key];
    const scores = data[key];
    const criteriaScores = dim.criteria.map((nameAr) => ({
      nameAr,
      score: scores[nameAr] ?? 0,
    }));
    const avgScore = criteriaScores.reduce((s, c) => s + c.score, 0) / criteriaScores.length;
    const weightedScore = (avgScore / 5) * dim.weight;
    return {
      nameAr: dim.nameAr,
      key,
      weight: dim.weight,
      avgScore: Math.round(avgScore * 10) / 10,
      weightedScore: Math.round(weightedScore * 10) / 10,
      criteria: criteriaScores,
    };
  });

  const finalScore = Math.round(dimensions.reduce((s, d) => s + d.weightedScore, 0) * 10) / 10;
  const { classification, classificationEn, decision } = classify(finalScore);
  const { strengths, weaknesses, recommendations } = analyze(dimensions);

  return { finalScore, classification, classificationEn, decision, dimensions, strengths, weaknesses, recommendations };
}

function classify(score: number) {
  if (score < 40) return {
    classification: 'غير جاهز',
    classificationEn: 'Not Ready',
    decision: 'رفض أو توجيه — المشروع يحتاج إلى تطوير جوهري قبل الدخول في أي برنامج دعم',
  };
  if (score < 60) return {
    classification: 'مبكر جداً',
    classificationEn: 'Pre-Incubation',
    decision: 'برنامج ما قبل الاحتضان — المشروع بحاجة لتأهيل وتطوير الفكرة وإثبات المفهوم',
  };
  if (score < 75) return {
    classification: 'جاهز للاحتضان',
    classificationEn: 'Early Incubation',
    decision: 'احتضان مبكر — المشروع مؤهل للدخول في برنامج الاحتضان ويحتاج دعماً في التطوير',
  };
  if (score < 85) return {
    classification: 'متقدم',
    classificationEn: 'Late Incubation',
    decision: 'احتضان متقدم — المشروع في مرحلة متقدمة ويحتاج دعماً في التسويق والتوسع',
  };
  return {
    classification: 'عالي النضج',
    classificationEn: 'Acceleration',
    decision: 'تسريع ونقل للسوق — المشروع جاهز للتسريع والانتقال إلى السوق الفعلي',
  };
}

function analyze(dimensions: DimensionResult[]) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  dimensions.forEach((d) => {
    const pct = d.avgScore / 5;
    if (pct >= 0.7) strengths.push(`${d.nameAr}: مستوى مرتفع (${d.avgScore}/5) — يُعدّ نقطة قوة محورية للمشروع`);
    else if (pct < 0.5) weaknesses.push(`${d.nameAr}: يحتاج تطوير (${d.avgScore}/5) — مستوى دون المتوسط`);
    if (pct < 0.5) recommendations.push(`تقوية محور ${d.nameAr} من خلال العمل على المعايير ذات الدرجات المنخفضة`);
    else if (pct >= 0.7 && pct < 0.85) recommendations.push(`الحفاظ على مستوى ${d.nameAr} ومواصلة التطوير للوصول إلى التميز`);
  });

  if (recommendations.length === 0) recommendations.push('مواصلة العمل بنفس الزخم والتركيز على التوسع والنمو');
  return { strengths, weaknesses, recommendations };
}

// ── Supabase + localStorage ──────────────────────────────────────

export async function saveSubmission(submission: Submission): Promise<void> {
  // حفظ محلي دائماً
  const existing = getSubmissionsLocal();
  existing.unshift(submission);
  localStorage.setItem('innopark_submissions', JSON.stringify(existing));

  // حفظ على Supabase
  try {
    const { error } = await supabase.from('submissions').insert({
      id: submission.id,
      date: submission.date,
      project_name: submission.data.projectInfo.projectName,
      applicant_name: submission.data.projectInfo.applicantName,
      email: submission.data.projectInfo.email,
      department: submission.data.projectInfo.department,
      description: submission.data.projectInfo.description,
      final_score: submission.results.finalScore,
      classification: submission.results.classification,
      classification_en: submission.results.classificationEn,
      decision: submission.results.decision,
      data: submission.data,
      results: submission.results,
    });
    if (error) console.error('Supabase error:', error.message);
  } catch (e) {
    console.error('Supabase save failed:', e);
  }
}

export async function getSubmissions(): Promise<Submission[]> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return getSubmissionsLocal();

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      data: row.data,
      results: row.results,
    }));
  } catch {
    return getSubmissionsLocal();
  }
}

function getSubmissionsLocal(): Submission[] {
  try {
    return JSON.parse(localStorage.getItem('innopark_submissions') ?? '[]');
  } catch { return []; }
}