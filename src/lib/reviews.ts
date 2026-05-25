import { supabase } from './supabase';
import type {
  Project,
  ProjectMember,
  ProjectReview,
  UpsertReviewScoreInput,
} from '../types/db';

export interface MyReviewWithScores extends ProjectReview {
  scores: { criterion_id: string; score: number }[];
}

export interface ProjectWithReview {
  project: Project;
  members: ProjectMember[];
  myReview: MyReviewWithScores | null;
}

// One-shot load: project, its team members, and the current judge's review
// (which RLS scopes to auth.uid()). Runs the three queries in parallel.
export async function loadProjectWithReview(projectId: string): Promise<ProjectWithReview> {
  const [pRes, mRes, rRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('project_members').select('*').eq('project_id', projectId).order('position', { ascending: true }),
    supabase
      .from('project_reviews')
      .select('*, project_review_scores(criterion_id, score)')
      .eq('project_id', projectId)
      .maybeSingle(),
  ]);

  if (pRes.error) throw new Error(pRes.error.message);
  if (rRes.error) throw new Error(rRes.error.message);
  if (!pRes.data) throw new Error('المشروع غير موجود أو غير معتمد');

  const reviewRow = rRes.data as (ProjectReview & {
    project_review_scores?: { criterion_id: string; score: number }[];
  }) | null;

  const myReview: MyReviewWithScores | null = reviewRow
    ? { ...reviewRow, scores: reviewRow.project_review_scores ?? [] }
    : null;

  return {
    project: pRes.data as Project,
    members: (mRes.data ?? []) as ProjectMember[],
    myReview,
  };
}

export interface SaveReviewInput {
  projectId: string;
  scores: UpsertReviewScoreInput[];
  finalScore: number;
  classification: string;
  notes?: string | null;
  submit?: boolean;
}

export async function saveReview(input: SaveReviewInput): Promise<ProjectReview> {
  const { data, error } = await supabase.rpc('upsert_review', {
    p_project_id: input.projectId,
    p_scores: input.scores,
    p_final: input.finalScore,
    p_class: input.classification,
    p_notes: input.notes ?? null,
    p_submit: input.submit ?? true,
  });
  if (error) throw new Error(error.message);
  return data as ProjectReview;
}
