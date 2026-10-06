'use client';

import { SelectInput } from '@/components/data/form-fields';

import { useEffect, useId, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Store, UploadCloud, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import type { BulkServiceRow } from '../../services/admin-services.service';

const REQUIRED_HEADERS = [
  'service name',
  'category',
  'price',
  'duration (minutes)',
] as const;

const OPTIONAL_HEADERS = ['description'] as const;

import { downloadServicesTemplate } from './services-template-export';
export { SERVICES_CSV_TEMPLATE, downloadServicesTemplate } from './services-template-export';

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/^"|"$/g, '');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells.map((c) => c.replace(/^"|"$/g, ''));
}

export type CsvParseResult =
  | { ok: true; services: BulkServiceRow[] }
  | { ok: false; reason: 'template' | 'empty' | 'rows' };

export function parseAndValidateServicesCsv(text: string): CsvParseResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { ok: false, reason: 'empty' };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const requiredOk = REQUIRED_HEADERS.every((required, index) => {
    return headers[index] === required;
  });

  // Reject extra unexpected leading columns or renamed headers
  if (!requiredOk || headers.length < REQUIRED_HEADERS.length) {
    return { ok: false, reason: 'template' };
  }

  // Allow optional Description as 5th column only
  if (headers.length > REQUIRED_HEADERS.length) {
    const optional = headers.slice(REQUIRED_HEADERS.length);
    const allowed = optional.every(
      (h, i) => h === OPTIONAL_HEADERS[i] || h === '',
    );
    if (!allowed) {
      return { ok: false, reason: 'template' };
    }
  }

  const services: BulkServiceRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;
    if (cols.length < 4) {
      return { ok: false, reason: 'rows' };
    }

    const name = cols[0]?.trim() ?? '';
    const category = cols[1]?.trim() ?? '';
    const price = Number(cols[2]);
    const durationMinutes = Number.parseInt(cols[3] ?? '', 10);
    const description = cols[4]?.trim() || undefined;

    if (!name || !category) {
      return { ok: false, reason: 'rows' };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false, reason: 'rows' };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
      return { ok: false, reason: 'rows' };
    }

    services.push({ name, category, price, durationMinutes, description });
  }

  if (services.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  return { ok: true, services };
}

type BulkUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  uploading?: boolean;
  onUpload: (input: {
    salonId: string;
    services: BulkServiceRow[];
  }) => Promise<void>;
};

export function BulkUploadDialog({
  open,
  onOpenChange,
  branches,
  defaultBranchId = '',
  uploading = false,
  onUpload,
}: BulkUploadDialogProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [salonId, setSalonId] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const preferred =
      (defaultBranchId && defaultBranchId !== 'all' ? defaultBranchId : '') ||
      branches[0]?.id ||
      '';
    setSalonId(preferred);
    setFileName(null);
    setSelectedFile(null);
    setError(null);
  }, [open, defaultBranchId, branches]);

  if (!open) return null;

  const selectedBranch = branches.find((b) => b.id === salonId);

  const resetLocal = () => {
    setFileName(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (uploading) return;
    resetLocal();
    onOpenChange(false);
  };

  const handleFilePicked = (file: File | null) => {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      setFileName(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(null);
      setFileName(null);
      setError('Please upload a .csv file that matches the sample template.');
      toast.error('Please re-verify the sheet and re-upload a valid CSV template.');
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
  };

  const handleSubmit = async () => {
    if (!salonId) {
      setError('Select a shop/branch before uploading services.');
      toast.error('Select a shop first, then upload services for that shop.');
      return;
    }
    if (!selectedFile) {
      setError('Choose a CSV file to upload.');
      return;
    }

    const text = await selectedFile.text();
    const parsed = parseAndValidateServicesCsv(text);

    if (!parsed.ok) {
      resetLocal();
      if (parsed.reason === 'template') {
        const msg =
          'Uploaded sheet does not match the template. Please re-verify the headers and re-upload.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (parsed.reason === 'rows') {
        const msg =
          'Some rows are invalid. Please re-verify the sheet values and re-upload.';
        setError(msg);
        toast.error(msg);
        return;
      }
      const msg =
        'No valid service rows found. Please re-verify the sheet and re-upload.';
      setError(msg);
      toast.error(msg);
      return;
    }

    await onUpload({ salonId, services: parsed.services });
    resetLocal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !uploading) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-dialog relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        {uploading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/92 backdrop-blur-[2px]">
            <div className="relative flex size-16 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/25" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-brand-orange/15" />
              <Loader2 className="relative size-8 animate-spin text-brand-orange" />
            </div>
            <div className="px-6 text-center">
              <p className="text-sm font-semibold text-text">Uploading services…</p>
              <p className="mt-1 text-xs text-text-secondary">
                Adding services for{' '}
                <span className="font-medium text-text">
                  {selectedBranch?.name ?? 'selected shop'}
                </span>
              </p>
            </div>
            <div className="mt-1 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-brand-orange/30 via-brand-orange to-brand-orange/30" />
            </div>
          </div>
        ) : null}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-text">
              Bulk Upload for Shop
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Choose a shop first. Services in the CSV will be added only to that
              shop, so each branch can have different services.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-champagne-light"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text">
              <Store className="size-3.5" />
              Shop / Branch <span className="text-danger">*</span>
            </label>
            {branches.length > 0 ? (
              <SelectInput className="h-10 w-full text-sm font-medium disabled:opacity-60"
                required
                value={salonId}
                disabled={uploading}
                onChange={(e) => setSalonId(e.target.value)}
              >
                <option value="">Select shop</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </SelectInput>
            ) : (
              <p className="text-xs text-danger">
                No shops found. Create a branch before uploading services.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text">
              CSV file <span className="text-danger">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-ivory-soft/70 px-4 py-8 text-center transition hover:border-brand-orange/50 hover:bg-champagne-light/20 disabled:opacity-60"
            >
              {fileName ? (
                <>
                  <FileSpreadsheet className="size-8 text-brand-orange" />
                  <p className="text-sm font-semibold text-text">{fileName}</p>
                  <p className="text-xs text-text-secondary">Click to choose another file</p>
                </>
              ) : (
                <>
                  <UploadCloud className="size-8 text-text-secondary" />
                  <p className="text-sm font-semibold text-text">Choose CSV file</p>
                  <p className="text-xs text-text-secondary">
                    Must match the sample template headers exactly
                  </p>
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-ivory/50 p-3 text-[11px] text-text-secondary">
            <p className="font-semibold text-text">Required headers (exact order):</p>
            <p className="mt-1">
              Service Name, Category, Price, Duration (Minutes), Description
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={downloadServicesTemplate}
          >
            Download Template
          </Button>
          <Button type="button" variant="outline" disabled={uploading} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={uploading || branches.length === 0}
            className="bg-brand-orange text-white hover:bg-brand-orange-dark"
            onClick={() => void handleSubmit()}
          >
            {uploading ? 'Uploading…' : 'Upload Services'}
          </Button>
        </div>
      </div>
    </div>
  );
}
