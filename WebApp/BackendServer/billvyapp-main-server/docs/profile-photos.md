# User profile photos

Profile photos use `MediaFile` for the uploader, provider, object key, original
filename, MIME type, actual byte size and creation time. The nullable
`User.profilePhotoMediaFileId` identifies the current photo; `User.updatedAt`
records replacement/removal time. `User.profilePhoto` remains the display URL
used by auth, user and customer API responses. No metadata is duplicated into a
new media table, and legacy URLs remain readable until replaced or removed.

## API contract (all five authenticated roles)

1. `POST /api/auth/me/profile-photo/upload-url` with
   `{ "fileName": "avatar.png", "mimeType": "image/png", "fileSize": 2048 }`.
   Returns `{ "mediaId": "uuid", "uploadUrl": "/auth/me/profile-photo/uploads/uuid", "uploadMethod": "PUT", "expiresInSeconds": 900 }`.
2. `PUT /api/auth/me/profile-photo/uploads/:mediaId` with the raw file bytes,
   bearer access token and the declared image Content-Type. Resolve the returned
   path against the same API base URL as other requests (which includes `/api`).
   This server upload path stays identical for local, S3 and Cloudinary.
3. `POST /api/auth/me/profile-photo/confirm` with `{ "mediaId": "uuid" }`.
   Returns `{ "profilePhoto": "display-url" }` and atomically replaces any prior
   photo. Confirmation requires a successfully validated upload. Never submit
   a storage key, provider, user ID or external URL.
4. `GET /api/auth/me/profile-photo` returns `{ "profilePhoto": "display-url-or-null" }`.
5. `DELETE /api/auth/me/profile-photo` returns `{ "profilePhoto": null }`.

The upload ID is bound to the current JWT user. Uploads expire after 15 minutes
and cannot be replayed or finalized by another user, including Super Admin.
Profile management is accessible while franchise subscriptions are gated, like
the existing `/auth/me` endpoint. Auth/session and role guards continue to run.
The old user/customer write DTOs no longer accept arbitrary `profilePhoto` URLs;
read responses continue to expose `profilePhoto`.

Only JPEG, PNG, WebP and AVIF are accepted, up to 5 MiB. Declared MIME/size and
actual file signatures/size are checked before provider upload. Image type
inspection uses magic bytes, not a complete image decoder. No SVG or documents
are accepted. Failed uploads do not replace the current photo.

## Storage

`PROFILE_PHOTO_STORAGE_PROVIDER` optionally selects `local`, `s3` or `cloudinary`;
it defaults to `STORAGE_PROVIDER`. Use `cloudinary` for temporary hosted avatars.
It reuses `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
Private document storage remains selected by `STORAGE_PROVIDER`; salon storage
remains selected by `SALON_IMAGE_STORAGE_PROVIDER`.

Cloudinary's shared adapter produces `f_auto,q_auto` square face crops at 256
(avatar) and 512 (profile) pixels; current profile responses use 512 pixels.
Cloudinary signing and HTTP requests stay inside that adapter. Local/S3 use
the existing storage providers and a signed `/api/media/avatars/:mediaId` display
URL that streams current attached image bytes without revealing object keys.
This avatar-only endpoint permits cross-origin image embedding; private document
response policies are unchanged. Switching to Cloudinary affects new uploads,
not existing local photos. Restart the backend and replace an existing photo to
store it in Cloudinary.
Set `APP_URL` to the externally reachable API origin. `STORAGE_SIGNING_SECRET`
falls back to `JWT_ACCESS_SECRET`, matching existing local media configuration.
Changing that signing secret invalidates previously stored local/S3 avatar
capabilities; refresh their display URLs when rotating it.

Each row persists its provider, so replacing a photo after changing provider
configuration uses the new provider while old-object cleanup uses the original
one. Maintain old provider credentials during migration. Existing salon imports
are compatibility exports of the shared Cloudinary adapter/contracts, retaining
their upload and delivery behavior.

The generic private media APIs cannot expose, upload or delete profile-photo
records, and bill attachment APIs reject them. Replaced/deleted photo metadata
is retired before object cleanup. If remote cleanup fails, retired metadata is
retained for a later cleanup job. Expired/unconfirmed upload rows and their
objects also need periodic cleanup; no background cleanup scheduler was added.

## Web and mobile

The shared web editor is wired into the existing Super Admin, Admin, Manager,
Staff and Customer profile screens. The header avatar updates after confirmation
and removal. It uses the existing Axios auth/refresh flow, scoped query cache,
buttons, notifications and initials/icon fallback.

Photo selection now opens a circular avatar preview with drag repositioning,
zoom, horizontal/vertical controls, quarter-turn rotation and reset. The browser
exports the same preview transform to a 512px PNG before using the unchanged
authenticated upload flow. Cancelling makes no API changes; failed saves retain
the adjustments for retry. Champagne loading rings, preparation/saving states
and image fade-in respect reduced-motion preferences. Confirmed URLs update the
current user's scoped cache immediately; no optimistic success is shown.

No React Native app is present in this repository. A future mobile screen should
use the five API calls above through its existing authenticated API client,
render `profilePhoto` with its standard Image component, and use its default
avatar when null. Send raw bytes, not multipart data, to the PUT endpoint.
Invalidate `/auth/me` and current-user profile caches after confirm/delete.
The mobile layer requires no provider credentials or provider branching.

## Migration and manual verification

Changed source files (relative to their respective application roots):

- Backend: `prisma/schema.prisma`, the migration below, and regenerated
  `src/generated/prisma` output.
- Backend photo API: `src/media/profile-photo.dto.ts`,
  `profile-image-validation.ts`, `profile-photos.service.ts`,
  `profile-photos.controller.ts`, `profile-photos.service.spec.ts`.
- Shared storage: `src/media/object-storage.service.ts`, `media.module.ts`,
  `media.service.ts`, `media.service.spec.ts`, `storage/storage.types.ts`,
  `storage/local-filesystem-storage.provider.ts`, `storage/s3-storage.provider.ts`,
  `storage/cloudinary-image.provider.ts`, `storage/image-storage.types.ts`,
  `storage/image-storage.spec.ts`.
- Salon compatibility exports:
  `src/salon-photos/storage/cloudinary-salon-image.provider.ts`,
  `src/salon-photos/storage/salon-image-storage.types.ts`.
- Backend configuration/URL-write isolation: `src/config/configuration.ts`,
  `src/config/env.validation.ts`, `.env.example`,
  `src/users/dto/create-user.dto.ts`, `src/users/users.service.ts`,
  `src/customers/dto/create-customer.dto.ts`, `src/customers/customers.service.ts`,
  `src/customers/customers.controller.ts`, `src/bills/bill-documents.service.ts`.
- Web: `features/profile/services/profile-photo.service.ts`,
  `profile-photo.service.test.ts`, `features/profile/hooks/use-profile-photo.ts`,
  `features/profile/components/profile-photo-editor.tsx`,
  `features/profile/components/profile-photo-crop-dialog.tsx`,
  `features/profile/lib/profile-photo-crop.ts`, `profile-photo-crop.test.ts`,
  `profile-summary-card.tsx`, `admin/admin-profile-overview-card.tsx`,
  `features/profile/index.ts`, `features/customer-dashboard/components/profile-view.tsx`,
  `components/layout/user-menu/user-menu.tsx`, `types/user.types.ts`, `services/session.ts`.
- This integration document: `docs/profile-photos.md`.

Verification: backend build and the full backend suite passed (47 suites,
501 tests); web tests passed (8 files, 38 tests). Changed web files passed lint.
The three pre-existing web type errors were resolved in a subsequent build repair:
the missing `BusinessPlanTone` import, the shared dashboard card's conflicting
HTML `title` attribute type, and the subscription view's logout handler.
The web production build, including TypeScript checking, now passes; all three
repair files also passed lint.
New backend photo/storage files passed lint. A broader check also reports four
existing lint errors in unchanged portions of `users.service.ts` and
`s3-storage.provider.ts`; those unrelated sections were preserved.

The migration `20261001010000_add_user_profile_photo_media` adds only the nullable
User-to-MediaFile foreign key and unique index. It preserves all users and media.
It was created and the Prisma client regenerated, but the database migration was
not applied by this task. Apply reviewed pending migrations using the deployment
procedure before starting this version of the API.

Manual smoke tests still needed:

- Configure the provider and upload a real photo through each role's web profile.
- Refresh/login again, replace/remove the photo, and check the header and profile.
- With Cloudinary, inspect delivered image size/format and verify old-object cleanup.
- With local/S3, verify signed display URLs, bucket privacy and replacement cleanup.
- Exercise actual MySQL transactions for simultaneous replacements and cross-user
  upload IDs; confirm auth and bill-document downloads still behave normally.
- Add the native picker/preview UI and run React Native checks when its repository
  becomes available.
