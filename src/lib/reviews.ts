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
  notes?: string | null;
  submit?: boolean;
}

// final_score / classification are intentionally NOT part of this surface —
// the RPC computes them server-side from p_scores × criteria × dimensions.
export async function saveReview(input: SaveReviewInput): Promise<ProjectReview> {
  const { data, error } = await supabase.rpc('upsert_review', {
    p_project_id: input.projectId,
    p_scores: input.scores,
    p_notes: input.notes ?? null,
    p_submit: input.submit ?? false,
  });
  if (error) throw new Error(error.message);
  return data as ProjectReview;
}
