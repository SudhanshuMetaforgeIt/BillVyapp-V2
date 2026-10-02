import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/services/api-client';
import { profilePhotoService, validateProfilePhoto, PROFILE_PHOTO_MAX_BYTES } from './profile-photo.service';

vi.mock('@/services/api-client', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

describe('Profile photo API client', () => {
  beforeEach(() => vi.resetAllMocks());

  it('uploads through the authenticated API and confirms only an opaque media id', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ mediaId: 'opaque-id', uploadUrl: '/auth/me/profile-photo/uploads/opaque-id', uploadMethod: 'PUT' }).mockResolvedValueOnce({ profilePhoto: 'https://example.com/avatar' });
    vi.mocked(api.put).mockResolvedValue({ uploaded: true });
    const file = { name: 'avatar.png', type: 'image/png', size: 20 } as File;
    expect(await profilePhotoService.upload(file)).toEqual({ profilePhoto: 'https://example.com/avatar' });
    expect(api.put).toHaveBeenCalledWith('/auth/me/profile-photo/uploads/opaque-id', file, { headers: { 'Content-Type': 'image/png' } });
    expect(api.post).toHaveBeenLastCalledWith('/auth/me/profile-photo/confirm', { mediaId: 'opaque-id' });
  });

  it('rejects unsupported or oversized files before calling the API', () => {
    expect(() => validateProfilePhoto({ type: 'application/pdf', size: 20 })).toThrow();
    expect(() => validateProfilePhoto({ type: 'image/png', size: PROFILE_PHOTO_MAX_BYTES + 1 })).toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('retrieves and removes the current user photo without accepting a user id', async () => {
    vi.mocked(api.get).mockResolvedValue({ profilePhoto: null });
    vi.mocked(api.delete).mockResolvedValue({ profilePhoto: null });
    expect(await profilePhotoService.get()).toEqual({ profilePhoto: null });
    expect(await profilePhotoService.remove()).toEqual({ profilePhoto: null });
    expect(api.delete).toHaveBeenCalledWith('/auth/me/profile-photo');
  });
});
