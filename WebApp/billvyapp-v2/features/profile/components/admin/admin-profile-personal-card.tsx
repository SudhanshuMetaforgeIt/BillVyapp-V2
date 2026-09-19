'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, ChevronDown, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { useUpdateProfile } from '../../hooks/use-profile';
import { splitFullName } from '../../services/profile.service';
import type { ProfileUser } from '../../types/profile.types';

type Props = {
  profile?: ProfileUser;
};

export function AdminProfilePersonalCard({ profile }: Props) {
  const updateMutation = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState('Rohit Sharma');
  const [username, setUsername] = useState('rohit.sharma');
  const [email, setEmail] = useState('rohit@starrkuts.com');
  const [designation, setDesignation] = useState('Administrator');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    if (profile) {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      if (name) setFullName(name);
      if (profile.email) setEmail(profile.email);
      if (profile.phone) setPhone(profile.phone);
      if (profile.roleLabel) setDesignation(profile.roleLabel);
      if (profile.email) {
        const userPrefix = profile.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');
        setUsername(userPrefix || 'rohit.sharma');
      }
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) {
      toast.success('Information saved successfully');
      setIsEditing(false);
      return;
    }

    const { firstName, lastName } = splitFullName(fullName);
    updateMutation.mutate(
      {
        userId: profile.id,
        firstName,
        lastName,
        email,
        phone,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(`${profile.firstName} ${profile.lastName}`.trim() || 'Rohit Sharma');
      setEmail(profile.email || 'rohit@starrkuts.com');
      setPhone(profile.phone || '+91 98765 43210');
    }
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-7 shadow-xs dark:border-stone-800 dark:bg-stone-900">
      {/* Header with Title and Edit button */}
      <div className="flex items-center justify-between pb-6">
        <h3 className="text-base font-bold text-stone-900 dark:text-white">
          Personal Information
        </h3>

        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-auto border-amber-500/90 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Edit Information
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="h-8 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-8 bg-amber-500 text-stone-900 font-semibold hover:bg-amber-600 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Form Fields Grid */}
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {/* Full Name */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Full Name
            </Label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!isEditing}
              className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white disabled:bg-stone-50/50 dark:disabled:bg-stone-800/40"
            />
          </div>

          {/* Username */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Username
            </Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!isEditing}
              className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white disabled:bg-stone-50/50 dark:disabled:bg-stone-800/40"
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
              disabled={!isEditing}
              className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white disabled:bg-stone-50/50 dark:disabled:bg-stone-800/40"
            />
          </div>

          {/* Designation (Dropdown with chevron icon) */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Designation
            </Label>
            <div className="relative mt-1.5">
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                disabled={!isEditing}
                className="h-10 w-full appearance-none rounded-xl border border-stone-200 bg-white px-3 pr-8 text-xs text-stone-900 outline-none transition-colors dark:border-stone-800 dark:bg-stone-900 dark:text-white disabled:bg-stone-50/50 dark:disabled:bg-stone-800/40"
              >
                <option value="Administrator">Administrator</option>
                <option value="Franchise Owner">Franchise Owner</option>
                <option value="Branch Manager">Branch Manager</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-stone-400" />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Phone Number
            </Label>
            <Input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
              className="mt-1.5 h-10 rounded-xl border-stone-200 bg-white text-xs text-stone-900 shadow-none dark:border-stone-800 dark:bg-stone-900 dark:text-white disabled:bg-stone-50/50 dark:disabled:bg-stone-800/40"
            />
          </div>

          {/* Language (Dropdown with chevron icon) */}
          <div>
            <Label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Language
            </Label>
            <div className="relative mt-1.5">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={!isEditing}
                className="h-10 w-full appearance-none rounded-xl border border-stone-200 bg-white px-3 pr-8 text-xs text-stone-900 outline-none transition-colors dark:border-stone-800 dark:bg-stone-900 dark:text-white disabled:bg-stone-50/50 dark:disabled:bg-stone-800/40"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Kannada">Kannada</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-stone-400" />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
