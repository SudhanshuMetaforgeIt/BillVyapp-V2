import { api } from '@/services/api-client';

export const PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export type ProfilePhoto = { profilePhoto: string | null };
type Upload = { mediaId: string; uploadUrl: string; uploadMethod: 'PUT'; expiresInSeconds: number };

export function validateProfilePhoto(file: Pick<File, 'type' | 'size'>): void {
  if (!PROFILE_PHOTO_MIME_TYPES.includes(file.type) || file.size < 1 || file.size > PROFILE_PHOTO_MAX_BYTES) {
    throw { status: 400, message: 'Select a JPEG, PNG, WebP or AVIF image no larger than 5 MB.' };
  }
}

export const profilePhotoService = {
  get: () => api.get<ProfilePhoto>('/auth/me/profile-photo'),
  remove: () => api.delete<ProfilePhoto>('/auth/me/profile-photo'),
  async upload(file: File): Promise<ProfilePhoto> {
    validateProfilePhoto(file);
    const upload = await api.post<Upload>('/auth/me/profile-photo/upload-url', {
      fileName: file.name, mimeType: file.type, fileSize: file.size,
    });
    // The upload uses the same authenticated API client for every provider.
    await api.put(upload.uploadUrl, file, { headers: { 'Content-Type': file.type } });
    return api.post<ProfilePhoto>('/auth/me/profile-photo/confirm', { mediaId: upload.mediaId });
  },
};
