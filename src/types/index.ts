export interface ProjectInfo {
  projectName: string;
  applicantName: string;
  email: string;
  department: string;
  description: string;
}

export type DimensionScores = Record<string, number>;

export interface EvaluationData {
  projectInfo: ProjectInfo;
  technology: DimensionScores;
  market: DimensionScores;
  businessModel: DimensionScores;
  teamCapabilities: DimensionScores;
  impact: DimensionScores;
}

export interface DimensionResult {
  nameAr: string;
  key: string;
  weight: number;
  avgScore: number;
  weightedScore: number;
  criteria: { nameAr: string; score: number }[];
}

export interface EvaluationResult {
  finalScore: number;
  classification: string;
  classificationEn: string;
  decision: string;
  dimensions: DimensionResult[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface Submission {
  id: string;
  date: string;
  data: EvaluationData;
  results: EvaluationResult;
}

export const DIMENSIONS = {
  technology: {
    nameAr: 'التقنية',
    weight: 25,
    criteria: [
      'وضوح الفكرة التقنية',
      'مستوى الجاهزية التقنية TRL',
      'إثبات الفكرة PoC',
      'التعقيد التقني',
      'قابلية التنفيذ',
    ],
  },
  market: {
    nameAr: 'السوق',
    weight: 25,
    criteria: [
      'وضوح المشكلة',
      'فهم الزبون',
      'حجم السوق',
      'المنافسة',
      'التحقق من السوق',
    ],
  },
  businessModel: {
    nameAr: 'نموذج العمل',
    weight: 20,
    criteria: [
      'نموذج الإيرادات',
      'قابلية التوسع',
      'هيكل التكاليف',
      'القيمة المقترحة',
      'النموذج التشغيلي',
    ],
  },
  teamCapabilities: {
    nameAr: 'قدرات الفريق',
    weight: 20,
    criteria: [
      'الخبرة',
      'تكامل الفريق',
      'الالتزام',
      'القدرة على التنفيذ',
      'القيادة',
    ],
  },
  impact: {
    nameAr: 'الأثر والملاءمة الاستراتيجية',
    weight: 10,
    criteria: [
      'الأثر المجتمعي',
      'الأثر الاقتصادي',
      'الابتكار',
      'التوافق مع أولويات الجامعة',
      'الاستدامة',
    ],
  },
} as const;

export const STAR_LABELS: Record<number, string> = {
  1: 'ضعيف جداً',
  2: 'ضعيف',
  3: 'متوسط',
  4: 'جيد',
  5: 'ممتاز',
};