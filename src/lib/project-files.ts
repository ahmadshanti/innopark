import { supabase } from './supabase';
import type { ProjectFile } from '../types/db';

const BUCKET = 'project-files';

export async function loadProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectFile[];
}

export async function createFilePreviewUrl(path: string): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'تعذّر إنشاء رابط المعاينة');
  }
  return data.signedUrl;
}

export async function createFileDownloadUrl(path: string, fileName: string): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 10, { download: fileName });
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'تعذّر إنشاء رابط التنزيل');
  }
  return data.signedUrl;
}

export function isImageFile(mime: string | null, name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return (mime?.startsWith('image/') ?? false) || /^(png|jpe?g|webp|gif)$/.test(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function fileIcon(mime: string | null, name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime?.startsWith('image/') || /^(png|jpe?g|webp|gif)$/.test(ext)) return '🖼️';
  if (mime === 'application/pdf' || ext === 'pdf') return '📄';
  if (mime?.includes('word') || /^docx?$/.test(ext)) return '📝';
  if (mime?.includes('zip') || ext === 'zip') return '🗜️';
  return '📎';
}
