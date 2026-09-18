'use client';

import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import type { ContactSupportPayload } from '../../types/admin-support.types';

type Props = {
  onSubmit: (payload: ContactSupportPayload) => void;
  defaultSubject?: string;
};

export function AdminContactForm({ onSubmit, defaultSubject = '' }: Props) {
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : 'Rohit Sharma'
  );
  const [email, setEmail] = useState(user?.email || 'rohit@starrkuts.com');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultSubject) {
      setSubject(defaultSubject);
    }
  }, [defaultSubject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields before sending');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit({
        fullName: fullName.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <div>
        <h3 className="text-base font-bold text-stone-900 dark:text-white">
          Contact Support
        </h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Fill out the form and our team will get back to you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
        {/* Full Name */}
        <div>
          <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Full Name
          </Label>
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none placeholder:text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
          />
        </div>

        {/* Email Address */}
        <div>
          <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Email Address
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none placeholder:text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
          />
        </div>

        {/* Subject */}
        <div>
          <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Subject
          </Label>
          <Input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject"
            className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none placeholder:text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
          />
        </div>

        {/* Message */}
        <div>
          <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Message
          </Label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-amber-500 dark:border-stone-800 dark:bg-stone-900 dark:text-white"
          />
        </div>

        {/* Send Button */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-900 shadow-none hover:bg-amber-600 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5 stroke-[2.2]" />
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </form>
    </div>
  );
}
