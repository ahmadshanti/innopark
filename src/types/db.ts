// Types that mirror the SQL schema in
// supabase/migrations/20260525000000_init_projects_workflow.sql
// Keep this file in sync whenever the schema changes.

export type ProjectType   = 'individual' | 'team';
export type ProjectStatus = 'pending' | 'approved' | 'rejected';
export type UserRole      = 'admin' | 'judge';
export type UserStatus    = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  phone: string | null;
  department: string | null;
  bio: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  project_number: number;
  project_name: string;
  project_type: ProjectType;
  applicant_name: string;
  mobile: string;
  email: string;
  department: string | null;
  description: string | null;
  status: ProjectStatus;
  rejected_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  position: number;
}

export interface Dimension {
  id: string;
  key: string;
  name_ar: string;
  weight: number;
  position: number;
  is_active: boolean;
}

export interface Criterion {
  id: string;
  dimension_id: string;
  name_ar: string;
  position: number;
  is_active: boolean;
}

export interface ProjectReview {
  id: string;
  project_id: string;
  judge_id: string;
  final_score: number | null;
  classification: string | null;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectReviewScore {
  id: string;
  review_id: string;
  criterion_id: string;
  score: 1 | 2 | 3 | 4 | 5;
}

// View
export interface JudgeProject {
  id: string;
  project_number: number;
  project_name: string;
  project_type: ProjectType;
  applicant_name: string;
  department: string | null;
  description: string | null;
  created_at: string;
  reviewed_by_me: boolean;
}

// --- RPC payloads ----------------------------------------------------

export interface SubmitProjectMemberInput {
  full_name: string;
  email?: string;
  role?: string;
}

export interface SubmitProjectInput {
  p_project_name:   string;
  p_project_type:   ProjectType;
  p_applicant_name: string;
  p_mobile:         string;
  p_email:          string;            // must end with @najah.edu
  p_department?:    string | null;
  p_description?:   string | null;
  p_members?:       SubmitProjectMemberInput[];
}

export interface SubmitProjectResult {
  id: string;
  project_number: number;
}

export interface UpsertReviewScoreInput {
  criterion_id: string;
  score: 1 | 2 | 3 | 4 | 5;
}

export interface UpsertReviewInput {
  p_project_id: string;
  p_scores:     UpsertReviewScoreInput[];
  p_final?:     number | null;
  p_class?:     string | null;
  p_notes?:     string | null;
  p_submit?:    boolean;
}
