"use client";
import dynamic from "next/dynamic";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Images, LoaderCircle, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { MutationError, PageHeading, SelectInput } from "@/components/data/form-fields";
import { Modal } from "@/components/data/modal";
import { SectionEmptyState, SectionErrorState } from "@/components/layout/section-states";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { describeApiError } from "@/lib/api-errors";
import { can } from "@/lib/capabilities";
import { invalidateAfter } from "@/lib/query-invalidation";
import { cloudinaryImageLoader, isCloudinaryImage } from "@/lib/cloudinary-image";

import type { ApiError } from "@/types/api.types";
import type { SalonPhoto } from "@/types/models";
import { matchesPhotoCategory, PHOTO_CATEGORIES, photoTypeLabel, type PhotoCategory } from "../lib/salon-photo-categories";
import { getSalon } from "../services/salons.service";
import { salonPhotosService, type SalonPhotoMetadata } from "../services/salon-photos.service";

const UploadPhotosDialog = dynamic(() => import('./salon-photo-dialogs').then((module) => module.UploadPhotosDialog), { loading: () => <p role="status">Opening photo upload…</p> });
const EditPhotoDialog = dynamic(() => import('./salon-photo-dialogs').then((module) => module.EditPhotoDialog), { loading: () => <p role="status">Opening photo editor…</p> });

function PhotoPreview({ photo }: { photo: SalonPhoto }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-ivory-soft">
      {photo.fileUrl && !failed ? (
        <Image
          src={photo.fileUrl}
          alt={`${photoTypeLabel(photo.photoType)} salon photo: ${photo.fileName}`}
          fill
          loader={isCloudinaryImage(photo.fileUrl) ? cloudinaryImageLoader : undefined}
          unoptimized={!isCloudinaryImage(photo.fileUrl)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          className={`object-contain transition-opacity duration-500 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
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
