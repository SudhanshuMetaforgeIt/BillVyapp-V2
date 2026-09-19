'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  Mail,
  ShieldAlert,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onSelectContact: () => void;
  onSelectReportIssue: () => void;
};

export function AdminSupportTopics({ onSelectContact, onSelectReportIssue }: Props) {
  const [activeModal, setActiveModal] = useState<'faqs' | 'guides' | null>(null);

  return (
    <>
      <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-white">
            How can we help you?
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Choose a topic to find the best solution for your issue.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. FAQs */}
          <button
            type="button"
            onClick={() => setActiveModal('faqs')}
            className="group flex items-start justify-between rounded-xl border border-stone-200/80 p-4 text-left transition-all hover:border-amber-400/80 hover:shadow-xs dark:border-stone-800 dark:hover:border-amber-500/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <HelpCircle className="h-5 w-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                  FAQs
                </h3>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-normal">
                  Find answers to commonly asked questions.
                </p>
              </div>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:text-amber-500" />
          </button>

          {/* 2. User Guides */}
          <button
            type="button"
            onClick={() => setActiveModal('guides')}
            className="group flex items-start justify-between rounded-xl border border-stone-200/80 p-4 text-left transition-all hover:border-amber-400/80 hover:shadow-xs dark:border-stone-800 dark:hover:border-amber-500/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <BookOpen className="h-5 w-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                  User Guides
                </h3>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-normal">
                  Step-by-step guides to help you use BillVyApp.
                </p>
              </div>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:text-amber-500" />
          </button>

          {/* 3. Contact Support */}
          <button
            type="button"
            onClick={onSelectContact}
            className="group flex items-start justify-between rounded-xl border border-stone-200/80 p-4 text-left transition-all hover:border-amber-400/80 hover:shadow-xs dark:border-stone-800 dark:hover:border-amber-500/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Mail className="h-5 w-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                  Contact Support
                </h3>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-normal">
                  Get in touch with our support team for assistance.
                </p>
              </div>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:text-amber-500" />
          </button>

          {/* 4. Report an Issue */}
          <button
            type="button"
            onClick={onSelectReportIssue}
            className="group flex items-start justify-between rounded-xl border border-stone-200/80 p-4 text-left transition-all hover:border-amber-400/80 hover:shadow-xs dark:border-stone-800 dark:hover:border-amber-500/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 transition-colors group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
                  Report an Issue
                </h3>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 leading-normal">
                  Let us know if you're facing any problems.
                </p>
              </div>
            </div>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:text-amber-500" />
          </button>
        </div>
      </div>

      {/* FAQs Modal */}
      {activeModal === 'faqs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                Frequently Asked Questions
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
                <p className="font-bold text-stone-900 dark:text-white">How do I generate an invoice for a customer?</p>
                <p className="mt-1 text-stone-500 dark:text-stone-400">Navigate to the Bills page from the sidebar and click "+ Create Bill". Choose customer, add services, and select payment mode.</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
                <p className="font-bold text-stone-900 dark:text-white">How do I add a new branch to my franchise?</p>
                <p className="mt-1 text-stone-500 dark:text-stone-400">Go to "My Businesses" in the sidebar and click "+ Add Branch". Fill in branch details and click Save.</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
                <p className="font-bold text-stone-900 dark:text-white">Where do I configure tax rates (GST)?</p>
                <p className="mt-1 text-stone-500 dark:text-stone-400">Visit "Settings" &gt; "Billing & Taxes" to configure standard GST slabs (5%, 12%, 18%, 28%) and invoice formats.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setActiveModal(null)} size="sm" className="bg-amber-500 text-stone-900 font-bold hover:bg-amber-600 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* User Guides Modal */}
      {activeModal === 'guides' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-800 dark:bg-stone-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
              <h3 className="font-bold text-base text-stone-900 dark:text-white">
                BillVyApp Quick Start Guides
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
                <div>
                  <p className="font-bold text-stone-900 dark:text-white">Getting Started with Billing & POS</p>
                  <p className="text-stone-500">Learn thermal printing, split payments, and receipt SMS.</p>
                </div>
                <ExternalLink className="h-4 w-4 text-stone-400" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
                <div>
                  <p className="font-bold text-stone-900 dark:text-white">Managing Staff Commissions & Attendance</p>
                  <p className="text-stone-500">Set stylist commission percentages and daily check-ins.</p>
                </div>
                <ExternalLink className="h-4 w-4 text-stone-400" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-3.5 dark:border-stone-800 dark:bg-stone-800/40">
                <div>
                  <p className="font-bold text-stone-900 dark:text-white">Marketing Campaigns & WhatsApp Promos</p>
                  <p className="text-stone-500">Create discount coupons and send automated festive wishes.</p>
                </div>
                <ExternalLink className="h-4 w-4 text-stone-400" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setActiveModal(null)} size="sm" className="bg-amber-500 text-stone-900 font-bold hover:bg-amber-600 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
