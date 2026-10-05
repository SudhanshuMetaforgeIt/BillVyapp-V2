"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Crown,
  Images,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FormField,
  MutationError,
  PageHeading,
  SelectInput,
} from "@/components/data/form-fields";
import { Modal } from "@/components/data/modal";
import {
  SectionEmptyState,
  SectionErrorState,
} from "@/components/layout/section-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { describeApiError } from "@/lib/api-errors";
import { can } from "@/lib/capabilities";
import { invalidateAfter } from "@/lib/query-invalidation";
import { useAuthStore } from "@/stores/auth.store";
import type { ApiError } from "@/types/api.types";
import type { SalonPhoto } from "@/types/models";
import {
  categoryForPhoto,
  matchesPhotoCategory,
  PHOTO_CATEGORIES,
  photoCategoryMetadata,
  photoTypeLabel,
  type PhotoCategory,
} from "../lib/salon-photo-categories";
import { getSalon } from "../services/salons.service";
import {
  SALON_PHOTO_MIME_TYPES,
  salonPhotosService,
  validateSalonPhoto,
  type SalonPhotoMetadata,
} from "../services/salon-photos.service";

type QueueItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "saved" | "failed";
  progress: number;
  error?: string;
};

function UploadPhotosDialog({
  salonId,
  startOrder,
  replacePhoto,
  onClose,
}: {
  salonId: string;
  startOrder: number;
  replacePhoto?: SalonPhoto;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const ownerId = useCurrentUser()?.id;
  const [category, setCategory] = useState<PhotoCategory>(
    replacePhoto ? categoryForPhoto(replacePhoto) : "INTERIOR",
  );
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const updateItem = (id: string, change: Partial<QueueItem>) =>
    setQueue((items) =>
      items.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );

  const upload = useMutation({
    mutationFn: async () => {
      let failures = 0;
      let saved = 0;
      const pending = queue.filter((item) => item.status !== "saved");
      for (const item of pending) {
        const current = useAuthStore.getState().user;
        if (
          current?.id !== ownerId ||
          current?.role !== "MANAGER" ||
          current.salonId !== salonId
        ) {
          throw {
            status: 403,
            message:
              "Your session or salon assignment changed. Reload this page.",
          };
        }
        updateItem(item.id, {
          status: "uploading",
          progress: 0,
          error: undefined,
        });
        try {
          const metadata = photoCategoryMetadata(category);
          // In a Cover batch, only the first queued image becomes the cover.
          const index = queue.findIndex((entry) => entry.id === item.id);
          await salonPhotosService.upload(
            salonId,
            item.file,
            {
              photoType: metadata.photoType,
              isPrimary: replacePhoto
                ? metadata.isPrimary || replacePhoto.isPrimary
                : metadata.isPrimary && index === 0,
              displayOrder:
                replacePhoto?.displayOrder ??
                Math.min(10000, startOrder + index),
            },
            (progress) => updateItem(item.id, { progress }),
            replacePhoto?.id,
          );
          updateItem(item.id, { status: "saved", progress: 100 });
          saved += 1;
          await invalidateAfter(client, "salons");
        } catch (error) {
          updateItem(item.id, {
            status: "failed",
            error: describeApiError(error).message,
          });
          failures += 1;
        }
      }
      return { saved, failures };
    },
    onSuccess: ({ saved, failures }) => {
      if (useAuthStore.getState().user?.id !== ownerId) return;
      if (saved)
        toast.success(
          `${saved} photo${saved === 1 ? "" : "s"} ${replacePhoto ? "replaced" : "uploaded"}`,
        );
      if (failures)
        toast.error(
          `${failures} photo${failures === 1 ? "" : "s"} could not be saved. Retry the failed uploads.`,
        );
      else onClose();
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });

  function choose(files: FileList | null) {
    if (!files) return;
    const valid: QueueItem[] = [];
    for (const file of Array.from(files).slice(
      0,
      replacePhoto ? 1 : undefined,
    )) {
      try {
        validateSalonPhoto(file);
        valid.push({
          id: crypto.randomUUID(),
          file,
          status: "queued",
          progress: 0,
        });
      } catch (error) {
        toast.error(`${file.name}: ${describeApiError(error).message}`);
      }
    }
    setQueue((items) => (replacePhoto ? valid : [...items, ...valid]));
    upload.reset();
  }

  return (
    <Modal
      open
      busy={upload.isPending}
      onClose={onClose}
      title={replacePhoto ? "Replace salon photo" : "Upload salon photos"}
      description={
        replacePhoto
          ? "The current photo stays in place until the replacement is saved."
          : "JPEG, PNG, WebP or AVIF · up to 10 MB per image."
      }
    >
      <div className="space-y-4">
        <FormField id="upload-photo-category" label="Photo category">
          <SelectInput
            id="upload-photo-category"
            value={category}
            disabled={upload.isPending}
            onChange={(event) =>
              setCategory(event.target.value as PhotoCategory)
            }
            options={[...PHOTO_CATEGORIES]}
          />
        </FormField>
        <p className="text-xs text-text-secondary">
          {category === "COVER"
            ? "Only the first selected image becomes the cover. Other selected images remain in the gallery."
            : category === "TEAM"
              ? "Team photos use the existing Other category and appear together with Other photos."
              : replacePhoto?.isPrimary
                ? "This photo will remain the salon cover."
                : "You can set any uploaded photo as the cover later."}
        </p>
        <input
          ref={input}
          type="file"
          multiple={!replacePhoto}
          accept={SALON_PHOTO_MIME_TYPES.join(",")}
          className="sr-only"
          aria-label="Select salon photos"
          disabled={upload.isPending}
          onChange={(event) => {
            choose(event.target.files);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-24 w-full border-dashed bg-ivory-soft"
          disabled={upload.isPending}
          onClick={() => input.current?.click()}
        >
          <Upload className="size-5 text-champagne" />
          {replacePhoto ? "Choose replacement photo" : "Choose photos"}
        </Button>
        <ul
          className="max-h-64 space-y-3 overflow-y-auto"
          aria-label="Upload queue"
        >
          {queue.map((item) => (
            <li key={item.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {(item.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                {item.status === "saved" ? (
                  <Check
                    className="size-4 shrink-0 text-emerald"
                    aria-label="Saved"
                  />
                ) : (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${item.file.name} from upload queue`}
                    disabled={upload.isPending}
                    onClick={() =>
                      setQueue((items) =>
                        items.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              {item.status === "uploading" ? (
                <div className="mt-2 space-y-1.5">
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      style={{ width: `${item.progress}%` }}
                      className="h-full rounded-full bg-champagne transition-[width] duration-300 motion-reduce:transition-none"
                    />
                  </div>
                  <p
                    className="flex items-center gap-1.5 text-xs text-text-secondary"
                    role="status"
                  >
                    <LoaderCircle className="size-3 motion-safe:animate-spin" />
                    {item.progress === 100
                      ? "Processing and saving…"
                      : `Uploading ${item.progress}%`}
                  </p>
                </div>
              ) : null}
              {item.error ? (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {item.error}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <MutationError error={upload.error} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={upload.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              upload.isPending || !queue.some((item) => item.status !== "saved")
            }
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? (
              <LoaderCircle className="size-4 motion-safe:animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {upload.isPending
              ? "Saving photos…"
              : queue.some((item) => item.status === "failed")
                ? "Retry failed uploads"
                : replacePhoto
                  ? "Replace photo"
                  : "Upload photos"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EditPhotoDialog({
  photo,
  onClose,
  onSave,
  busy,
  error,
  reorder,
}: {
  photo: SalonPhoto;
  onClose: () => void;
  onSave: (metadata: SalonPhotoMetadata) => void;
  busy: boolean;
  error: unknown;
  reorder: boolean;
}) {
  const [category, setCategory] = useState<PhotoCategory>(
    categoryForPhoto(photo),
  );
  const [order, setOrder] = useState(String(photo.displayOrder));
  const validOrder =
    order.trim() !== "" &&
    Number.isInteger(Number(order)) &&
    Number(order) >= 0 &&
    Number(order) <= 10000;
  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title={reorder ? "Reorder photo" : "Change photo category"}
      description={photo.fileName}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (validOrder)
            onSave({
              photoType: photoCategoryMetadata(category).photoType,
              isPrimary:
                photoCategoryMetadata(category).isPrimary || photo.isPrimary,
              displayOrder: Number(order),
            });
        }}
      >
        <FormField id="edit-photo-category" label="Category">
          <SelectInput
            id="edit-photo-category"
            value={category}
            options={[...PHOTO_CATEGORIES]}
            disabled={busy}
            onChange={(event) =>
              setCategory(event.target.value as PhotoCategory)
            }
          />
        </FormField>
        {category === "TEAM" ? (
          <p className="text-xs text-text-secondary">
            Team is stored as Other; these categories share a filter.
          </p>
        ) : null}
        <FormField
          id="photo-display-order"
          label="Display order"
          hint="Lower values appear earlier. The cover always appears first; equal values sort by upload date."
        >
          <Input
            id="photo-display-order"
            type="number"
            min={0}
            max={10000}
            step={1}
            value={order}
            autoFocus={reorder}
            disabled={busy}
            onChange={(event) => setOrder(event.target.value)}
            required
          />
        </FormField>
        {!validOrder ? (
          <p role="alert" className="text-xs text-danger">
            Enter a whole number from 0 to 10000.
          </p>
        ) : null}
        <MutationError error={error} />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !validOrder}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PhotoPreview({ photo }: { photo: SalonPhoto }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 900 });
  return (
    <div className="relative overflow-hidden bg-ivory-soft">
      {photo.fileUrl && !failed ? (
        <Image
          src={photo.fileUrl}
          alt={`${photoTypeLabel(photo.photoType)} salon photo: ${photo.fileName}`}
          width={dimensions.width}
          height={dimensions.height}
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={`block h-auto w-full transition-opacity duration-500 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth && image.naturalHeight) {
              setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
            }
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-text-secondary">
          <Images className="size-8" />
          <span className="text-xs">Preview unavailable</span>
        </div>
      )}
      {photo.fileUrl && !failed && !loaded ? (
        <Skeleton className="absolute inset-0 size-full rounded-none" />
      ) : null}
      {photo.isPrimary ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-charcoal/90 px-2.5 py-1 text-xs font-medium text-champagne">
          <Crown className="size-3" />
          Cover
        </span>
      ) : null}
    </div>
  );
}

function SalonPhotosGallery({ salonId }: { salonId: string }) {
  const client = useQueryClient();
  const [filter, setFilter] = useState<PhotoCategory | "ALL">("ALL");
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState<SalonPhoto | null>(null);
  const [editing, setEditing] = useState<{
    photo: SalonPhoto;
    reorder: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState<SalonPhoto | null>(null);
  const salon = useScopedQuery(
    ["salons", "detail", salonId],
    () => getSalon(salonId),
    { capability: "salons.read", placeholderData: undefined },
  );
  const photos = useScopedQuery(
    ["salons", salonId, "photos"],
    () => salonPhotosService.list(salonId),
    { capability: "salonPhotos.read", placeholderData: undefined },
  );
  const refresh = () => invalidateAfter(client, "salons");
  const update = useMutation<
    SalonPhoto,
    ApiError,
    { id: string; metadata: SalonPhotoMetadata }
  >({
    mutationFn: ({ id, metadata }) =>
      salonPhotosService.update(salonId, id, metadata),
    onSuccess: async () => {
      await refresh();
      setEditing(null);
      toast.success("Salon photo updated");
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => salonPhotosService.remove(salonId, id),
    onSuccess: async () => {
      await refresh();
      setDeleting(null);
      toast.success("Salon photo deleted");
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });
  const busy = update.isPending || remove.isPending;
  const refreshing = photos.isFetching || salon.isFetching;
  const data = photos.data ?? [];
  const visible = data.filter((photo) => matchesPhotoCategory(photo, filter));
  const loading = photos.isLoading || salon.isLoading;
  const failed = photos.error || salon.error;

  return (
    <div className="space-y-5">
      <PageHeading
        title="Salon Photos"
        description="Your salon's first impression, beautifully organized."
        actions={
          <Button
            type="button"
            className="cursor-pointer"
            disabled={busy || loading || !!failed}
            onClick={() => setUploading(true)}
          >
            <Upload className="size-4" />
            Upload Photos
          </Button>
        }
      />
      {salon.data ? (
        <div className="app-surface-card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-semibold">
              {salon.data.name}{" "}
              <span className="ml-1 text-xs font-normal text-text-secondary">
                {salon.data.code}
              </span>
            </p>
            <p className="text-sm text-text-secondary">
              {[salon.data.addressLine1, salon.data.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <span className="text-sm text-text-secondary">
            {data.length} photo{data.length === 1 ? "" : "s"} · Assigned salon
            only
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectInput
          aria-label="Filter salon photos by category"
          className="w-full sm:w-64"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as PhotoCategory | "ALL")
          }
          options={[{ value: "ALL", label: "All photos" }, ...PHOTO_CATEGORIES]}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-w-28"
          disabled={busy || refreshing}
          aria-busy={refreshing}
          aria-live="polite"
          onClick={() => {
            void photos.refetch();
            void salon.refetch();
          }}
        >
          <RefreshCw
            aria-hidden
            className={`size-3.5 ${refreshing ? "text-champagne motion-safe:animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {filter === "TEAM" || filter === "OTHER" ? (
        <p className="text-xs text-text-secondary">
          Team photos use the existing Other category. Both filters show the
          same photos.
        </p>
      ) : null}
      {!loading &&
      !failed &&
      data.length > 0 &&
      !data.some((photo) => photo.isPrimary) ? (
        <p className="rounded-xl border border-champagne/30 bg-champagne-light p-3 text-sm text-text">
          No cover photo yet. Choose “Set as Cover” on any image.
        </p>
      ) : null}
      {loading ? (
        <div
          className="grid grid-cols-1 gap-4 panel-md:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading salon photos"
          role="status"
        >
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : failed ? (
        <SectionErrorState
          message={describeApiError(failed).message}
          onRetry={() => {
            void photos.refetch();
            void salon.refetch();
          }}
        />
      ) : !visible.length ? (
        <div className="app-surface-card">
          <SectionEmptyState
            title={
              data.length
                ? "No photos in this category"
                : "Your gallery starts here"
            }
            message={
              data.length
                ? "Choose another category or add a new photo."
                : "Upload your salon interior, exterior, services or team. Then choose a cover."
            }
          />
        </div>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {visible.map((photo) => (
            <article
              key={photo.id}
              className="app-surface-card mb-4 inline-block w-full break-inside-avoid overflow-hidden align-top"
            >
              <PhotoPreview
                key={`${photo.id}:${photo.fileUrl}`}
                photo={photo}
              />
              <div className="space-y-3 p-4">
                <div>
                  <p
                    className="truncate text-sm font-semibold"
                    title={photo.fileName}
                  >
                    {photo.fileName}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {photoTypeLabel(photo.photoType)} · Order{" "}
                    {photo.displayOrder}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!photo.isPrimary ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        update.mutate({
                          id: photo.id,
                          metadata: { isPrimary: true },
                        })
                      }
                    >
                      <Crown className="size-3.5" />
                      Set as Cover
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      update.reset();
                      setEditing({ photo, reorder: false });
                    }}
                  >
                    Category
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      update.reset();
                      setEditing({ photo, reorder: true });
                    }}
                  >
                    Reorder
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => setReplacing(photo)}
                  >
                    <Pencil className="size-3.5" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    className="text-danger"
                    onClick={() => {
                      remove.reset();
                      setDeleting(photo);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {busy ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-text-secondary"
        >
          <LoaderCircle className="size-4 text-champagne motion-safe:animate-spin" />
          Saving gallery changes…
        </p>
      ) : null}
      {uploading || replacing ? (
        <UploadPhotosDialog
          salonId={salonId}
          startOrder={Math.min(
            10000,
            Math.max(-1, ...data.map((photo) => photo.displayOrder)) + 1,
          )}
          replacePhoto={replacing ?? undefined}
          onClose={() => {
            setUploading(false);
            setReplacing(null);
          }}
        />
      ) : null}
      {editing ? (
        <EditPhotoDialog
          key={editing.photo.id}
          photo={editing.photo}
          reorder={editing.reorder}
          busy={update.isPending}
          error={update.error}
          onClose={() => setEditing(null)}
          onSave={(metadata) =>
            update.mutate({ id: editing.photo.id, metadata })
          }
        />
      ) : null}
      {deleting ? (
        <Modal
          open
          title="Delete salon photo?"
          description={deleting.fileName}
          busy={remove.isPending}
          onClose={() => setDeleting(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This photo will be removed from your gallery and customer-facing
              salon pages.
              {deleting.isPrimary
                ? " It is the current cover; choose another cover after deleting it."
                : ""}
            </p>
            <MutationError error={remove.error} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={remove.isPending}
                onClick={() => setDeleting(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleting.id)}
              >
                {remove.isPending ? "Deleting…" : "Delete photo"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function ManagerSalonPhotosView() {
  const user = useCurrentUser();
  if (!user) return <Skeleton className="h-64 rounded-xl" />;
  if (user.role !== "MANAGER" || !can(user, "salonPhotos.write"))
    return <SectionErrorState message="This page is for salon managers." />;
  if (!user.salonId)
    return (
      <SectionEmptyState
        title="No salon assigned"
        message="Ask your administrator to assign your account to a salon before managing photos."
      />
    );
  return (
    <SalonPhotosGallery
      key={`${user.id}:${user.salonId}`}
      salonId={user.salonId}
    />
  );
}
