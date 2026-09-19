'use client';

import React, { useRef, useState } from 'react';
import { Camera, Mail, Phone, Calendar, MapPin, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import type { ProfileUser } from '../../types/profile.types';

type Props = {
  profile?: ProfileUser;
  onPhotoUploaded?: (url: string) => void;
};

export function AdminProfileOverviewCard({ profile, onPhotoUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.profilePhoto || null);

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Rohit Sharma';
  const roleLabel = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? 'Admin' : profile?.roleLabel || 'Admin';
  const email = profile?.email || 'rohit@starrkuts.com';
  const phone = profile?.phone || '+91 98765 43210';

  const formatJoinDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Jan 12, 2024';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Jan 12, 2024';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPhotoPreview(result);
      if (onPhotoUploaded) onPhotoUploaded(result);
      toast.success('Profile picture updated');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center rounded-2xl border border-stone-200/90 bg-white p-7 text-center shadow-xs dark:border-stone-800 dark:bg-stone-900">
      {/* Avatar Container with Camera Badge */}
      <div className="relative mb-4 mt-2">
        <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-stone-100 bg-[#E2E8F0] shadow-inner dark:border-stone-800 dark:bg-stone-800 flex items-center justify-center">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            /* Custom styled avatar vector matching the screenshot silhouette */
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full translate-y-1"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="50" fill="#E2E8F0" />
              {/* Head */}
              <circle cx="50" cy="40" r="18" fill="#F1C27D" />
              {/* Hair */}
              <path
                d="M32 38C32 26 40 20 50 20C60 20 68 26 68 38C68 39 66 32 50 32C34 32 32 39 32 38Z"
                fill="#1E293B"
              />
              {/* Shoulders / Shirt */}
              <path
                d="M20 90C20 70 34 64 50 64C66 64 80 70 80 90Z"
                fill="#1E4E6E"
              />
            </svg>
          )}
        </div>

        {/* Camera overlay button matching Figma screenshot */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload photo"
          className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-white bg-white text-amber-500 shadow-sm transition-transform hover:scale-105 dark:border-stone-900 dark:bg-stone-800"
        >
          <Camera className="h-3.5 w-3.5 text-amber-500 stroke-[2.2]" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* User Name & Role */}
      <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
        {fullName}
      </h2>
      <p className="mt-0.5 text-xs font-semibold text-amber-500">
        {roleLabel}
      </p>

      {/* Contact & Meta details list */}
      <div className="mt-7 w-full space-y-4 text-left text-xs">
        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <Mail className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span className="truncate">{email}</span>
        </div>

        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <Phone className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span>{phone}</span>
        </div>

        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <Calendar className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span>Joined on {formatJoinDate(profile?.createdAt)}</span>
        </div>

        <div className="flex items-center gap-3.5 text-stone-600 dark:text-stone-300">
          <MapPin className="h-4 w-4 shrink-0 text-stone-400 stroke-[1.8]" />
          <span>Bangalore, Karnataka, India</span>
        </div>
      </div>

      {/* Edit Profile Picture outline button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="mt-8 w-full border-amber-500/90 py-2.5 text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
        Edit Profile Picture
      </Button>
    </div>
  );
}
