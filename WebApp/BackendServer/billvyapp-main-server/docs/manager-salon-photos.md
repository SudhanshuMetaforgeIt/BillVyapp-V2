# Manager Salon Photos

## Scope and architecture

The manager-only sidebar entry **Salon Photos** opens
`/dashboard/manager/salon-photos` inside the existing ManagerShell, AppShell,
role guard and subscription gate. The page takes the salon ID only from the
authenticated user, not a salon picker, query parameter or editable field.
Scoped queries isolate user, role, franchise and salon caches. An account or
assignment change unmounts the gallery; queued uploads stop before sending
another file with a changed identity.

This feature reuses SalonPhoto, SalonPhotosController, SalonPhotosService,
SalonImageStorageService and the existing Cloudinary adapter. No Prisma schema,
migration, new photo table, cover field, media integration or UI library was
added. User profile-photo implementation and private MediaFile/bill/document
storage are not changed. The shared image adapter contract now explicitly
includes the already implemented server-side `uploadObject` operation.

## API

Reused under `/api/salons/:salonId/photos`:

- `GET /` lists every saved photo, ordered by primary descending, displayOrder
  ascending and createdAt ascending. Responses omit provider and object keys.
- `PATCH /:id` changes category, displayOrder or isPrimary. Storage keys cannot
  be modified through this endpoint.
- `DELETE /:id` removes the metadata and attempts public object cleanup. Deleting
  the cover leaves no cover, matching the original behavior; the UI prompts the
  manager to choose another. No gallery photo is automatically removed/promoted.
- Existing `POST /upload-url` and `POST /` confirmation remain available for
  compatible clients; the new manager UI does not use direct provider uploads.

Added to the **same** controller/service:

- `POST /upload`: raw JPEG/PNG/WebP/AVIF bytes, authenticated through the existing
  API client. Query metadata: `fileName`, `mimeType`, optional `photoType`,
  `displayOrder`, `isPrimary` (`"true"`/`"false"`), and `replaceId` (UUID).
  Returns the existing provider-neutral SalonPhoto response. The backend owns
  object keys, credentials, upload signing, provider verification and URLs.
  Content-Type must match declared MIME; verified provider MIME must match too.
  Empty files and streamed bodies exceeding 10 MiB are rejected. The provider
  verifies that bytes decode to an image before metadata is persisted.

Replacement validates the photo ID within the authorized salon, uploads and
verifies a new object, then updates the same photo ID in a transaction. Omitted
category/order/primary values retain the current values under the transaction
lock. Old object cleanup occurs only after committing the replacement. Failed
uploads leave the original record intact. The web replaces one image at a time;
multi-image uploads are a sequential queue using the same endpoint per file.

All photo writes now allow SUPER_ADMIN, ADMIN and MANAGER. Staff/customer writes
remain denied. The service enforces the same write roles as the controller and
calls the existing ScopeService before any read/write/provider operation:

- Manager: assigned salon only; missing assignments and other salons are denied.
- Admin: salon must belong to the caller's database-resolved franchise.
- Super Admin: existing unrestricted scope, unchanged.
- Customer reads retain the existing active-salon visibility behavior.

Primary changes, replacement and deletion lock the salon row before mutating
photos, serializing concurrent changes without a database redesign. Setting a
cover clears other primary flags and updates their optimized gallery URLs.
Only isPrimary controls cover status. Persisted display order is changed through
PATCH; the cover always stays first and ties use creation date.

## Categories

The database enum remains FRONT, INTERIOR, RECEPTION, SERVICE_AREA, WAITING_AREA,
OTHER. The shared frontend API type mirrors this enum; UI labels are mappings,
not a new database enum.

| UI choice | Persisted photoType | Primary behavior |
| --- | --- | --- |
| Cover | FRONT for a new upload | Sets isPrimary; only the first batch item is cover |
| Interior | INTERIOR | Does not newly set primary |
| Exterior | FRONT | Does not newly set primary |
| Service | SERVICE_AREA | Does not newly set primary |
| Team | OTHER | Explicitly labeled “stored as Other” |
| Other | OTHER | Shares Team's filter |
| Reception | RECEPTION | Existing value preserved |
| Waiting area | WAITING_AREA | Existing value preserved |

Any category can be made cover through Set as Cover without changing its type.
Changing a current cover's category or replacing it retains its primary flag.
Team cannot be distinguished from Other after refresh with the current schema;
the UI explains that both filters show the same photos rather than inventing
ephemeral metadata. A separate persistent Team category would need an explicit
future schema decision and is outside this implementation.

## UX and customer impact

The responsive gallery includes salon identity, category filter, image previews,
cover badges, saved order, category/reorder/cover/replace/delete actions, loading
skeletons, preview fallback, empty/error/retry states, and no-cover guidance.
The existing themed selects, buttons, Modal, toasts and dashboard cards are reused.
Deletion requires confirmation. Upload progress is real browser-to-backend byte
progress; at 100% it says “Processing and saving” until verification/persistence
finish. Successful files are not retried; failed entries keep their errors and
can be retried. Display/upload animations respect reduced motion.

All images use optimized URLs returned by the backend; frontend code never
constructs Cloudinary URLs or receives credentials/provider keys.
Portrait and landscape images keep their original aspect ratio: gallery previews
use natural image dimensions in normal flow (responsive width, automatic height),
and gallery cards use responsive masonry columns, so shorter cards stack without
waiting for a taller neighbor. Persisted photo order remains the DOM/reading order
(top-to-bottom within each column, then left-to-right); the cover remains first.
Salon delivery variants
use `c_limit` bounds (cover: 1600×1600; gallery: 1200×1200), not forced crops.
Both manager photo responses and customer salon responses resolve current
delivery URLs on read, so existing cropped delivery URLs are corrected without
rewriting metadata or requiring re-upload. Originals and profile-avatar crop
transformations remain unchanged; internal keys are stripped before responses.
Mutations
invalidate existing salon/dashboard query domains. Existing `/salons` and
`/salons/:id` customer responses already select ordered public photos from this
same model, so the next discovery/detail request reflects manager changes.
No customer mobile contract or native mobile code is modified.

Configuration remains the existing `SALON_IMAGE_STORAGE_PROVIDER=cloudinary` and
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` environment
variables. There are no new environment variables. A future public S3 image
adapter must implement the same storage contract, including server upload and
optimized/public delivery; salon logic and this UI need no provider-specific
branching. Private document configuration remains independent.

## Files changed

Paths below are relative to the respective application roots.

Backend (`WebApp/BackendServer/billvyapp-main-server`):

- `src/salon-photos/salon-photos.controller.ts`
- `src/salon-photos/salon-photos.service.ts`
- `src/salon-photos/salon-photos.service.spec.ts`
- `src/salon-photos/salon-image-storage.service.ts`
- `src/salon-photos/salon-image-storage.service.spec.ts`
- `src/salon-photos/dto/upload-salon-photo.dto.ts`
- `src/salon-photos/dto/upload-salon-photo.dto.spec.ts`
- `src/media/storage/image-storage.types.ts`
- `src/salons/salons.service.spec.ts` (customer contract regression test only)
- `src/salons/salons.service.ts`, `src/salons/salons.module.ts` (current public image delivery URLs)
- `src/salon-photos/salon-photos.module.ts` (shared storage facade export)
- `src/media/storage/cloudinary-image.provider.ts`, `image-storage.spec.ts` (aspect-ratio-preserving salon variants)
- `docs/manager-salon-photos.md`

Web (`WebApp/billvyapp-v2`):

- `app/dashboard/manager/salon-photos/page.tsx`
- `constants/routes.ts`
- `constants/navigation/manager.ts`
- `constants/navigation.test.ts`
- `lib/capabilities.ts`
- `lib/capabilities.test.ts`
- `features/dashboard/components/manager-shell.tsx`
- `types/models.ts`
- `features/salons/components/salon-photos-view.tsx`
- `features/salons/services/salon-photos.service.ts`
- `features/salons/services/salon-photos.service.test.ts`
- `features/salons/lib/salon-photo-categories.ts`
- `features/salons/lib/salon-photo-categories.test.ts`

## Verification and remaining work

Automated checks cover manager navigation and permissions; category mapping;
provider-neutral uploads/replacement; file validation; real ScopeService denial
for cross-salon list/grant/confirm/upload/update/delete; unassigned managers;
cross-franchise admin denial; cover locking/demotion; metadata/order persistence;
replacement identity and cleanup; delete behavior; and the ordered public photo
selection in customer discovery/detail. Existing profile/private-media tests are
also included in the full backend and web suites.

The full backend suite passed (50 suites, 549 tests); the web suite passed
(11 files, 63 tests). Builds pass for backend and web. Relevant runtime/new-file lint and all changed
web-file lint pass. Broader lint still reports pre-existing formatting in three
unchanged salon DTOs and pre-existing Jest matcher/mock typing warnings in the
two older service test files; those unrelated sections are left unchanged.

Live browser/Cloudinary smoke tests still needed (not performed with a real
manager session during implementation):

1. Restart/reload backend and web as needed; sign in as an assigned manager.
2. Open Salon Photos; confirm salon identity and all existing photos.
3. Upload multiple Interior/Exterior/Service/Team/Other photos and verify queue
   progress, failure retry, optimized image delivery and Cloudinary assets.
4. Set a different cover, refresh, and verify there is exactly one primary.
5. Replace that cover; confirm its ID/category/order persist and old asset cleanup.
6. Save distinct display orders, refresh, and check customer discovery/detail
   API ordering and cover match the manager gallery.
7. Cancel a delete, then confirm a delete; check removal after refresh. Delete
   the cover and choose a replacement from the remaining gallery.
8. Tamper another salon/photo ID in authenticated requests and confirm rejection.
9. Smoke-test profile-photo upload and private bill/document download separately.

As with the existing direct-upload architecture, a provider object may be orphaned
if a later database commit fails or provider cleanup is unavailable. A periodic
public-image orphan cleanup process remains future work; private files are not
involved. No live records were uploaded/deleted for automated verification.
No Git commands were run.
