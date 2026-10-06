"use client";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FormField, MutationError, SelectInput } from "@/components/data/form-fields";
import { Modal } from "@/components/data/modal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useCurrentUser } from "@/hooks/use-current-user";

import { describeApiError } from "@/lib/api-errors";

import { invalidateAfter } from "@/lib/query-invalidation";
import { useAuthStore } from "@/stores/auth.store";

import type { SalonPhoto } from "@/types/models";
import { categoryForPhoto, PHOTO_CATEGORIES, photoCategoryMetadata, type PhotoCategory } from "../lib/salon-photo-categories";

import { SALON_PHOTO_MIME_TYPES, salonPhotosService, validateSalonPhoto, type SalonPhotoMetadata } from "../services/salon-photos.service";

type QueueItem = {
  id: string;
  file: File;
  status: "queued" | "uploading" | "saved" | "failed";
  progress: number;
  error?: string;
};

export function UploadPhotosDialog({
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

export function EditPhotoDialog({
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

