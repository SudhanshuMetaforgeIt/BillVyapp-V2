'use client';

import { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, LoaderCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UploadProgress } from '@/components/ui/upload-progress';
import { FormField, MutationError } from '@/components/data/form-fields';
import { useScopedQuery } from '@/hooks/use-scoped-query';
import type { ApiError } from '@/types/api.types';
import { invalidatePaths } from '@/lib/query-invalidation';
import { BILL_ACCEPT, getBillDownload, listPurchaseBills, uploadPurchaseBill, validateBill, type BillOwner, type PurchaseBill } from '../services/purchase-bills.service';

export function BillFileInput({ file, onChange, disabled, uploading, progress }: { file: File | null; onChange: (file: File | null) => void; disabled?: boolean; uploading?: boolean; progress?: number | null }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <FormField id={inputId} label="Upload bill (PDF or image, optional)">
      <Input ref={inputRef} id={inputId} type="file" accept={BILL_ACCEPT} disabled={disabled} onChange={(event) => {
        const selected = event.target.files?.[0] ?? null;
        try { if (selected) validateBill(selected); onChange(selected); }
        catch (error) { toast.error((error as ApiError).message); event.target.value = ''; onChange(null); }
      }} />
      <p className="mt-1 text-xs text-text-secondary">{file ? file.name : 'PDF, JPEG, PNG, WebP or AVIF. Maximum 10 MB.'}</p>
      {uploading ? <div className="mt-3"><UploadProgress fileName={file?.name} progress={progress} /></div> : null}
      {file ? <button type="button" disabled={disabled} className="mt-1 text-xs text-champagne underline" onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ''; }}>Remove selected file</button> : null}
    </FormField>
  );
}

export function PurchaseBills({ type, id, salonId, canUpload = true }: { type: BillOwner; id: string; salonId: string; canUpload?: boolean }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const queryKey = ['purchase-bills', type, id, salonId];
  const bills = useScopedQuery(queryKey, () => listPurchaseBills(type, id, salonId), { enabled: Boolean(salonId), capability: 'inventory.adjust' });
  const upload = useMutation<PurchaseBill, ApiError, File>({
    onMutate: () => { setProgress(null); },
    mutationFn: (selected) => uploadPurchaseBill(type, id, selected, salonId, setProgress),
    onSuccess: () => { setFile(null); toast.success('Bill saved'); void invalidatePaths(queryClient, [['purchase-bills']]); },
  });
  const download = useMutation<{ downloadUrl: string }, ApiError, string>({ mutationFn: getBillDownload,
    onSuccess: ({ downloadUrl }) => { const link = document.createElement('a'); link.href = downloadUrl; link.rel = 'noopener noreferrer'; link.target = '_blank'; link.click(); },
  });
  return (
    <section className="mt-4 space-y-3 rounded-xl border border-border bg-ivory/40 p-4" aria-label="Purchase bills">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-champagne" /> Purchase bills</h3>
      {type === 'vendor' ? <p className="text-xs text-text-secondary">Vendor uploads and bills from this salon’s purchases.</p> : null}
      {bills.isLoading ? <p role="status" className="text-xs">Loading bills…</p> : null}
      {bills.isError ? <div className="text-xs text-danger">Could not load bills. <button type="button" onClick={() => void bills.refetch()} className="underline">Retry</button></div> : null}
      {bills.data?.length === 0 ? <p className="text-xs text-text-secondary">No bills uploaded yet.</p> : null}
      <ul className="space-y-2">{bills.data?.map((bill) => <li key={bill.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface p-2 text-xs"><span className="min-w-0 break-words">{bill.originalFileName}<span className="ml-2 text-text-secondary">{Math.ceil(bill.fileSize / 1024)} KB</span></span><Button type="button" variant="ghost" size="sm" disabled={download.isPending} onClick={() => download.mutate(bill.id)} aria-label={`Download ${bill.originalFileName}`}><Download className="size-4" /></Button></li>)}</ul>
      {canUpload && salonId ? <div className="space-y-2"><BillFileInput key={upload.isSuccess && !file ? 'empty' : 'selected'} file={file} onChange={setFile} disabled={upload.isPending} uploading={upload.isPending} progress={progress} /><Button type="button" size="sm" disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)}>{upload.isPending ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : null}{upload.isPending ? 'Uploading…' : 'Save bill'}</Button></div> : null}
      {!salonId ? <p className="text-xs text-text-secondary">Select a salon to manage this vendor’s bills.</p> : null}
      <MutationError error={upload.error ?? download.error} />
    </section>
  );
}
