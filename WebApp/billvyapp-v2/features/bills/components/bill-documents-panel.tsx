'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Paperclip, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import toast from 'react-hot-toast';

import { QueryErrorState } from '@/components/data/query-error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import { describeApiError } from '@/lib/api-errors';
import { can } from '@/lib/capabilities';
import { formatDateTime } from '@/lib/format';
import { invalidateAfter } from '@/lib/query-invalidation';
import type { ApiError } from '@/types/api.types';
import type { BillDocument } from '@/types/models';
import {
  deleteBillDocument,
  getBillDocumentDownloadUrl,
  listBillDocuments,
  uploadBillDocument,
} from '../services/bill-documents.service';

const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BillDocumentsPanel({ billId, salonId }: { billId: string; salonId: string }) {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const canWrite = can(user, 'billDocuments.write');
  // Customers can only download media they uploaded (media scope), so staff
  // uploads are listed but not downloadable for them.
  const canDownload = can(user, 'media.write');

  const docs = useScopedQuery(['bill-documents', billId], () => listBillDocuments(billId), {
    capability: 'billDocuments.read',
  });

  const upload = useMutation<BillDocument, ApiError, File>({
    mutationFn: (file) => uploadBillDocument({ billId, salonId, file }),
    onSuccess: (doc) => {
      toast.success(`${doc.fileName} attached`);
      void invalidateAfter(queryClient, 'bill-documents');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  const remove = useMutation<void, ApiError, BillDocument>({
    mutationFn: (doc) => deleteBillDocument(billId, doc.id),
    onSuccess: () => {
      toast.success('Document removed');
      void invalidateAfter(queryClient, 'bill-documents');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  const download = useMutation<void, ApiError, BillDocument>({
    mutationFn: async (doc) => {
      const link = await getBillDocumentDownloadUrl(billId, doc);
      window.open(link.downloadUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  return (
    <section aria-labelledby={`docs-${billId}`} className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 id={`docs-${billId}`} className="text-xs font-bold text-text">
          Documents
        </h4>
        {canWrite ? (
          <>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept="application/pdf,image/*"
              aria-label="Attach document"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (file.size > MAX_BYTES) {
                  toast.error('Files must be 10 MB or smaller.');
                  return;
                }
                upload.mutate(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Paperclip className="size-3.5" /> {upload.isPending ? 'Uploading…' : 'Attach'}
            </Button>
          </>
        ) : null}
      </div>

      {docs.isLoading ? (
        <Skeleton className="h-10 w-full rounded-lg" />
      ) : docs.isError && !docs.data ? (
        <QueryErrorState error={docs.error} onRetry={() => void docs.refetch()} className="py-4" />
      ) : (docs.data?.data ?? []).length === 0 ? (
        <p className="text-xs text-text-secondary">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {docs.data?.data.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-text-secondary" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-text">{doc.fileName}</p>
                  <p className="text-[11px] text-text-secondary">
                    {formatSize(doc.fileSize)} · {formatDateTime(doc.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {canDownload ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Download ${doc.fileName}`}
                    disabled={download.isPending && download.variables?.id === doc.id}
                    onClick={() => download.mutate(doc)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                ) : null}
                {canWrite ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${doc.fileName}`}
                    disabled={remove.isPending && remove.variables?.id === doc.id}
                    onClick={() => {
                      if (window.confirm(`Remove ${doc.fileName}?`)) remove.mutate(doc);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!canDownload && (docs.data?.data ?? []).length > 0 ? (
        <p className="text-[11px] text-text-secondary">
          Ask the salon for a copy of these documents.
        </p>
      ) : null}
    </section>
  );
}
