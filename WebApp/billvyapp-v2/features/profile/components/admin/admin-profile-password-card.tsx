'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

export function AdminProfilePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    }, 800);
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <h3 className="text-base font-bold text-stone-900 dark:text-white">
        Change Password
      </h3>

      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Current Password */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Current Password
            </Label>
            <div className="relative mt-1.5">
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-10 rounded-xl border-stone-200 bg-white pr-10 text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              New Password
            </Label>
            <div className="relative mt-1.5">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-10 rounded-xl border-stone-200 bg-white pr-10 text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Confirm Password
            </Label>
            <div className="relative mt-1.5">
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-10 rounded-xl border-stone-200 bg-white pr-10 text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Update Password button */}
        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-stone-900 shadow-none hover:bg-amber-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </div>
  );
}
