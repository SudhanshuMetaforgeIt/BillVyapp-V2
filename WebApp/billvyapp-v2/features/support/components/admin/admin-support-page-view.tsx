'use client';

import React, { useRef, useState } from 'react';
import { useAdminSupport } from '../../hooks/use-admin-support';
import { AdminSupportTopics } from './admin-support-topics';
import { AdminContactForm } from './admin-contact-form';
import { AdminReachUsCard } from './admin-reach-us-card';
import { AdminRecentTicketsCard } from './admin-recent-tickets-card';

export function AdminSupportPageView() {
  const { tickets, createTicket } = useAdminSupport();
  const formRef = useRef<HTMLDivElement>(null);
  const [defaultSubject, setDefaultSubject] = useState('');

  const handleSelectContact = () => {
    setDefaultSubject('General Assistance Request');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectReportIssue = () => {
    setDefaultSubject('Bug / Issue Report: ');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
          Support
        </h1>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          We&apos;re here to help! Get the support you need.
        </p>
      </div>

      {/* Top Topic Cards */}
      <AdminSupportTopics
        onSelectContact={handleSelectContact}
        onSelectReportIssue={handleSelectReportIssue}
      />

      {/* Middle Grid: Contact Support Form & Other Ways to Reach Us */}
      <div ref={formRef} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AdminContactForm
            onSubmit={createTicket}
            defaultSubject={defaultSubject}
          />
        </div>
        <div className="lg:col-span-5">
          <AdminReachUsCard />
        </div>
      </div>

      {/* Bottom: Recent Support Tickets */}
      <AdminRecentTicketsCard tickets={tickets} />
    </div>
  );
}
