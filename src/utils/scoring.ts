import type { EvaluationData, EvaluationResult, DimensionResult } from '../types';
import { DIMENSIONS } from '../types';
import type { DimensionView } from '../lib/criteria';

type CalcDim = Pick<DimensionView, 'key' | 'nameAr' | 'weight' | 'criteria'>;

function staticDims(): CalcDim[] {
  return Object.entries(DIMENSIONS).map(([key, d]) => ({
    key, nameAr: d.nameAr, weight: d.weight, criteria: [...d.criteria],
  }));
}

function readDimensionScores(data: EvaluationData, key: string) {
  const value = data[key];
  if (!value || typeof value !== 'object' || 'projectName' in value) return {};
  return value;
}

export function calculateResults(data: EvaluationData, dims?: CalcDim[]): EvaluationResult {
  const dimList = dims && dims.length > 0 ? dims : staticDims();

  const dimensions: DimensionResult[] = dimList.map((dim) => {
    const scores = readDimensionScores(data, dim.key);
    const criteriaScores = dim.criteria.map((nameAr) => ({
      nameAr,
      score: scores[nameAr] ?? 0,
    }));
    const avgScore = criteriaScores.length > 0
      ? criteriaScores.reduce((s, c) => s + c.score, 0) / criteriaScores.length
      : 0;
    const weightedScore = (avgScore / 5) * dim.weight;
    return {
      nameAr: dim.nameAr,
      key: dim.key,
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
