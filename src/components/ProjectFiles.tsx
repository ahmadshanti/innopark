import { useEffect, useState } from 'react';
import type { ProjectFile } from '../types/db';
import {
  createFileDownloadUrl,
  createFilePreviewUrl,
  fileIcon,
  formatFileSize,
  isImageFile,
  loadProjectFiles,
} from '../lib/project-files';

interface Props {
  projectId: string;
  emptyText?: string;
}

type BusyAction = 'preview' | 'download' | null;

export default function ProjectFiles({ projectId, emptyText = 'لا توجد ملفات مرفقة' }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<{ id: string; action: BusyAction } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setThumbs({});
    loadProjectFiles(projectId)
      .then(async rows => {
        if (cancelled) return;
        setFiles(rows);
        const imageRows = rows.filter(r => isImageFile(r.mime_type, r.file_name));
        const entries = await Promise.all(
          imageRows.map(async r => {
            try {
              const url = await createFilePreviewUrl(r.file_path);
              return [r.id, url] as const;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const e of entries) if (e) map[e[0]] = e[1];
        setThumbs(map);
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'تعذّر تحميل الملفات'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function preview(file: ProjectFile) {
    setBusy({ id: file.id, action: 'preview' });
    try {
      const url = await createFilePreviewUrl(file.file_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر فتح الملف');
    } finally {
      setBusy(null);
    }
  }

  async function download(file: ProjectFile) {
    setBusy({ id: file.id, action: 'download' });
    try {
      const url = await createFileDownloadUrl(file.file_path, file.file_name);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تنزيل الملف');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="text-xs text-navy/40">جارٍ تحميل الملفات...</div>;
  }
  if (error) {
    return <div className="text-xs text-red-700">⚠️ {error}</div>;
  }
  if (files.length === 0) {
    return <div className="text-xs text-navy/40">{emptyText}</div>;
  }

  return (
    <div>
      <div className="text-[11px] text-navy/40 mb-2">{files.length} ملف مرفق</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {files.map(file => {
          const thumb = thumbs[file.id];
          const isPreviewing = busy?.id === file.id && busy.action === 'preview';
          const isDownloading = busy?.id === file.id && busy.action === 'download';
          return (
            <div
              key={file.id}
              className="group bg-white border border-navy/10 hover:border-navy/30 hover:shadow-sm rounded-xl p-3 flex items-center gap-3 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-cream flex items-center justify-center flex-shrink-0 overflow-hidden">
                {thumb ? (
                  <img src={thumb} alt={file.file_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{fileIcon(file.mime_type, file.file_name)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-navy truncate" title={file.file_name}>
                  {file.file_name}
                </div>
                <div className="text-[11px] text-navy/40 mt-0.5">{formatFileSize(file.file_size)}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => preview(file)}
                  disabled={isPreviewing || isDownloading}
                  title="معاينة"
                  className="w-8 h-8 rounded-lg text-navy/50 hover:text-navy hover:bg-navy/5 disabled:opacity-40 transition-colors flex items-center justify-center text-sm"
                >
                  {isPreviewing ? '...' : '👁️'}
                </button>
                <button
                  type="button"
                  onClick={() => download(file)}
                  disabled={isPreviewing || isDownloading}
                  title="تنزيل"
                  className="w-8 h-8 rounded-lg text-navy/60 hover:text-white hover:bg-navy disabled:opacity-40 transition-colors flex items-center justify-center text-sm"
                >
                  {isDownloading ? '...' : '⬇️'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
