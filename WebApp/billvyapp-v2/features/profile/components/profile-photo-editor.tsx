'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, LoaderCircle, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { describeApiError } from '@/lib/api-errors';
import { useProfilePhoto } from '../hooks/use-profile-photo';
import { PROFILE_PHOTO_MIME_TYPES, validateProfilePhoto } from '../services/profile-photo.service';
import { ProfilePhotoCropDialog } from './profile-photo-crop-dialog';

export function ProfilePhotoEditor({ name = 'Your profile', initials }: { name?: string; initials?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<File | null>(null);
  const photo = useProfilePhoto();
  const url = photo.data?.profilePhoto ?? null;
  const busy = photo.mutation.isPending;
  const loadingImage = !!url && url !== loadedUrl && url !== failedUrl;
  const loading = photo.isLoading || busy || loadingImage;
  const disabled = busy || photo.isLoading || photo.isError || !!draft;

  return (
    <div className="flex flex-col items-center gap-3" aria-busy={loading}>
      <div className="relative rounded-full p-1.5">
        <div aria-hidden className={cn('pointer-events-none absolute inset-0 rounded-full border border-champagne/25 transition-shadow duration-500 motion-reduce:transition-none', loading && 'shadow-[0_0_24px_rgba(196,164,108,0.25)]')} />
        {loading ? <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-transparent border-t-champagne border-r-champagne/40 motion-safe:animate-spin motion-safe:[animation-duration:1.4s]" /> : null}
        <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-ivory-soft text-2xl font-semibold text-champagne ring-1 ring-border">
          {url && url !== failedUrl ? (
            <Image key={url} src={url} alt={`${name} profile photo`} width={112} height={112} className={cn('size-full object-cover transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none', url === loadedUrl ? 'scale-100 opacity-100' : 'scale-105 opacity-0')} unoptimized onLoad={() => setLoadedUrl(url)} onError={() => setFailedUrl(url)} />
          ) : initials ? <span aria-hidden>{initials}</span> : <UserRound className="size-10" aria-label="Default avatar" />}
          {loading ? <div aria-hidden className="absolute inset-0 flex items-center justify-center bg-ivory/65 backdrop-blur-sm"><LoaderCircle className="size-6 text-champagne motion-safe:animate-spin" /></div> : null}
        </div>
        <Button type="button" size="icon-sm" disabled={disabled} onClick={() => input.current?.click()} className="absolute right-1 bottom-1 rounded-full shadow-md ring-2 ring-surface" aria-label="Change profile photo">
          <Camera className="size-3.5" />
        </Button>
      </div>
      <input ref={input} type="file" accept={PROFILE_PHOTO_MIME_TYPES.join(',')} className="sr-only" aria-label="Select profile image" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) {
          try { validateProfilePhoto(file); setDraft(file); }
          catch (error) { toast.error(describeApiError(error).message); }
        }
      }} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
          {busy ? 'Saving…' : url ? 'Replace photo' : 'Upload photo'}
        </Button>
        {url ? <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => photo.mutation.mutate(null)}>Remove</Button> : null}
      </div>
      <p className="min-h-4 text-xs text-text-secondary" role="status" aria-live="polite">{busy ? 'Saving your photo…' : photo.isLoading || loadingImage ? 'Loading your photo…' : 'JPEG, PNG, WebP or AVIF · up to 5 MB'}</p>
      {url === failedUrl && url ? <p role="alert" className="text-xs text-danger">Photo could not load. Refresh the page or replace it.</p> : null}
      {photo.isError ? <Button type="button" variant="ghost" size="sm" onClick={() => void photo.refetch()}>Retry loading photo</Button> : null}
      {draft ? <ProfilePhotoCropDialog file={draft} busy={busy} onClose={() => setDraft(null)} onSave={async (file) => {
        await photo.mutation.mutateAsync(file);
        setDraft(null);
      }} /> : null}
    </div>
  );
}
