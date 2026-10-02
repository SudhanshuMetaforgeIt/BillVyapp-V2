import type { SalonPhoto, SalonPhotoType } from "@/types/models";

// UI labels map onto the existing enum. Team is not a separate persisted type.
export const PHOTO_CATEGORIES = [
  { value: "COVER", label: "Cover", photoType: "FRONT" },
  { value: "INTERIOR", label: "Interior", photoType: "INTERIOR" },
  { value: "EXTERIOR", label: "Exterior", photoType: "FRONT" },
  { value: "SERVICE", label: "Service", photoType: "SERVICE_AREA" },
  { value: "TEAM", label: "Team (stored as Other)", photoType: "OTHER" },
  { value: "OTHER", label: "Other", photoType: "OTHER" },
  { value: "RECEPTION", label: "Reception", photoType: "RECEPTION" },
  { value: "WAITING_AREA", label: "Waiting area", photoType: "WAITING_AREA" },
] as const satisfies readonly {
  value: string;
  label: string;
  photoType: SalonPhotoType;
}[];
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]["value"];

export function photoCategoryMetadata(category: PhotoCategory) {
  const option = PHOTO_CATEGORIES.find((item) => item.value === category)!;
  return { photoType: option.photoType, isPrimary: category === "COVER" };
}
export function categoryForPhoto(
  photo: Pick<SalonPhoto, "photoType">,
): PhotoCategory {
  return (
    PHOTO_CATEGORIES.find(
      (item) =>
        item.value !== "COVER" &&
        item.value !== "TEAM" &&
        item.photoType === photo.photoType,
    )?.value ?? "OTHER"
  );
}
export function photoTypeLabel(type: SalonPhotoType): string {
  return type === "OTHER"
    ? "Other / Team"
    : (PHOTO_CATEGORIES.find(
        (item) => item.value !== "COVER" && item.photoType === type,
      )?.label ?? type);
}
export function matchesPhotoCategory(
  photo: SalonPhoto,
  category: PhotoCategory | "ALL",
) {
  if (category === "ALL") return true;
  if (category === "COVER") return photo.isPrimary;
  return photo.photoType === photoCategoryMetadata(category).photoType;
}
