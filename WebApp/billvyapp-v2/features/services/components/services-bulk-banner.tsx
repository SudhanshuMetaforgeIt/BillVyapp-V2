'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ServicesBulkBanner() {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleDownloadTemplate = () => {
    // Generate a simple CSV template for services
    const csvContent =
      'data:text/csv;charset=utf-8,Service Name,Category,Price,Duration (Minutes),Description\nHair Cut,Hair,500,30,Standard haircut\nHair Spa,Hair,900,60,Deep conditioning hair spa\nBeard Trim,Grooming,300,20,Precision beard grooming';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'services_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-50/40 p-4 transition sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: icon & text */}
        <div className="flex items-start gap-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Info className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-text sm:text-base">Bulk Upload Services</h3>
            <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">
              Upload multiple services at once using Excel/CSV file. Download the sample template to
              get started.
            </p>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-border bg-surface text-text hover:bg-champagne-light/30"
            onClick={handleDownloadTemplate}
          >
            <Download className="size-4 text-text-secondary" />
            Download Template
          </Button>

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
            <li>Ensure the headers are: Service Name, Category, Price, Duration (Minutes).</li>
            <li>Price should be a numeric value without currency symbols (e.g. 500).</li>
            <li>Duration should be given in total minutes (e.g. 30, 45, 60).</li>
            <li>Make sure categories already exist or they will be created automatically.</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
