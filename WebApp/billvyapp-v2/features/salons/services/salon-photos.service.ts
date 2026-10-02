import { api } from "@/services/api-client";
import type { SalonPhoto, SalonPhotoType } from "@/types/models";

export const SALON_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const SALON_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export type SalonPhotoMetadata = {
  photoType?: SalonPhotoType;
  isPrimary?: boolean;
  displayOrder?: number;
};

export function validateSalonPhoto(file: Pick<File, "name" | "type" | "size">) {
  if (
    !SALON_PHOTO_MIME_TYPES.includes(file.type) ||
    file.size < 1 ||
    file.size > SALON_PHOTO_MAX_BYTES ||
    !file.name.trim() ||
    file.name.length > 255
  ) {
    throw {
      status: 400,
      message:
        "Select a JPEG, PNG, WebP or AVIF image up to 10 MB with a filename under 256 characters.",
    };
  }
}
const path = (salonId: string) => `/salons/${salonId}/photos`;

export const salonPhotosService = {
  list: (salonId: string) => api.get<SalonPhoto[]>(path(salonId)),
  update: (salonId: string, id: string, metadata: SalonPhotoMetadata) =>
    api.patch<SalonPhoto>(`${path(salonId)}/${id}`, metadata),
  remove: (salonId: string, id: string) =>
    api.delete<{ id: string; deleted: boolean }>(`${path(salonId)}/${id}`),
  upload(
    salonId: string,
    file: File,
    metadata: SalonPhotoMetadata,
    onProgress?: (percent: number) => void,
    replaceId?: string,
  ) {
    validateSalonPhoto(file);
    return api.post<SalonPhoto>(`${path(salonId)}/upload`, file, {
      headers: { "Content-Type": file.type },
      params: {
        fileName: file.name,
        mimeType: file.type,
        ...metadata,
        ...(metadata.isPrimary === undefined
          ? {}
          : { isPrimary: String(metadata.isPrimary) }),
        replaceId,
      },
      timeout: 90_000,
      onUploadProgress: (event) => {
        if (event.total)
          onProgress?.(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          );
      },
    });
  },
};
