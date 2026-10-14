'use client';

import { LoaderCircle, UploadCloud } from 'lucide-react';

type UploadProgressProps = {
  fileName?: string;
  progress?: number | null;
  message?: string;
};

/** Transfer percentages are real; processing stays animated until the request finishes. */
export function UploadProgress({ fileName, progress, message }: UploadProgressProps) {
  const percent = typeof progress === 'number' && Number.isFinite(progress)
    ? Math.min(100, Math.max(0, Math.round(progress))) : null;
  const transferring = percent !== null && percent < 100;
  const label = message ?? (percent === 100 ? 'Processing and saving…' : 'Uploading…');
  return (
    <div className="space-y-3 rounded-xl border border-champagne/30 bg-champagne-light/40 p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" aria-busy="true">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-champagne">
          <UploadCloud className="size-4 motion-safe:animate-pulse" />
          <LoaderCircle className="absolute inset-0 size-9 motion-safe:animate-spin motion-safe:[animation-duration:1.5s]" strokeWidth={1} />
        </span>
        <div className="min-w-0 flex-1">
          <p role="status" aria-live="polite" className="text-xs font-semibold text-text">{label}</p>
          {fileName ? <p title={fileName} className="mt-0.5 truncate text-xs text-text-secondary">{fileName}</p> : null}
        </div>
        {transferring ? <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-champagne">{percent}%</span> : null}
      </div>
      <div role="progressbar" aria-label={fileName ? `Upload progress for ${fileName}` : 'Upload progress'}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={transferring ? percent : undefined}
        aria-valuetext={transferring ? `${percent}% uploaded` : label}
        className="h-1.5 overflow-hidden rounded-full bg-champagne/15">
        <div style={{ width: transferring ? `${percent}%` : '100%' }}
          className={`h-full rounded-full bg-champagne motion-safe:transition-[width] motion-safe:duration-300 ${transferring ? '' : 'motion-safe:animate-pulse'}`} />
      </div>
    </div>
  );
}
