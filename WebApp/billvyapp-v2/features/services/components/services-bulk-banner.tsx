'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Info, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';


type ServicesBulkBannerProps = {
  onUploadClick?: () => void;
  uploading?: boolean;
};

export function ServicesBulkBanner({
  onUploadClick,
  uploading = false,
}: ServicesBulkBannerProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-50/40 p-4 transition sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Info className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-text sm:text-base">Bulk Upload Services</h3>
            <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
              Upload services for one shop at a time. Pick the shop, then upload a CSV that
              matches the sample template exactly.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-surface text-text hover:bg-champagne-light/30"
            onClick={async () => { const { downloadServicesTemplate } = await import('./admin/services-template-export'); downloadServicesTemplate(); }}
          >
            <Download className="size-4 text-text-secondary" />
            Download Template
          </Button>

          {onUploadClick ? (
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-brand-orange text-white hover:bg-brand-orange-dark"
              disabled={uploading}
              onClick={onUploadClick}
            >
              <UploadCloud className={`size-4 ${uploading ? 'animate-bounce' : ''}`} />
              {uploading ? 'Uploading…' : 'Upload CSV'}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-surface text-text hover:bg-champagne-light/30"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            <Info className="size-4 text-text-secondary" />
            View Instructions
            {showInstructions ? (
              <ChevronUp className="size-3.5 text-text-muted" />
            ) : (
              <ChevronDown className="size-3.5 text-text-muted" />
            )}
          </Button>
        </div>
      </div>

      {showInstructions ? (
        <div className="mt-4 border-t border-amber-500/20 pt-3 text-xs text-text-secondary space-y-1">
          <p className="font-semibold text-text">Instructions for bulk CSV upload:</p>
          <ul className="list-inside list-disc space-y-0.5 text-text-secondary">
            <li>Select the target shop/branch before uploading.</li>
            <li>
              Headers must match exactly (in order): Service Name, Category, Price, Duration
              (Minutes), Description.
            </li>
            <li>Price should be numeric without currency symbols (e.g. 500).</li>
            <li>Duration should be whole minutes (e.g. 30, 45, 60).</li>
            <li>Missing categories for that shop are created automatically.</li>
            <li>
              If the sheet does not match the template, you will be asked to re-verify and
              re-upload.
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
