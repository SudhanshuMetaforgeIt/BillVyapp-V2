'use client';

import React from 'react';
import { Mail, Phone, Globe, Clock, Copy, ExternalLink, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminReachUsCard() {
  const [copiedItem, setCopiedItem] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <div>
        <h3 className="text-base font-bold text-stone-900 dark:text-white">
          Other Ways to Reach Us
        </h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          You can also contact us through any of the following channels.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {/* Email Support */}
        <div className="flex items-center justify-between rounded-xl border border-stone-200/80 p-4 transition-colors hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/40">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400">
              <Mail className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                Email Support
              </h4>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                support@billvyapp.com
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard('support@billvyapp.com', 'Email address')}
            title="Copy email"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            {copiedItem === 'Email address' ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Phone Support */}
        <div className="flex items-center justify-between rounded-xl border border-stone-200/80 p-4 transition-colors hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/40">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400">
              <Phone className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                Phone Support
              </h4>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                +91 98765 43210
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard('+919876543210', 'Phone number')}
            title="Copy phone"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            {copiedItem === 'Phone number' ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Help Center */}
        <div className="flex items-center justify-between rounded-xl border border-stone-200/80 p-4 transition-colors hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/40">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400">
              <Globe className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                Help Center
              </h4>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                Visit our help center for more resources.
              </p>
            </div>
          </div>

          <a
            href="https://billvyapp.com/help"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Help Center"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Business Hours */}
        <div className="flex items-center justify-between rounded-xl border border-stone-200/80 p-4 transition-colors hover:bg-stone-50/50 dark:border-stone-800 dark:hover:bg-stone-800/40">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#D97706] dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                Business Hours
              </h4>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                Mon - Sat: 9:00 AM - 8:00 PM
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
