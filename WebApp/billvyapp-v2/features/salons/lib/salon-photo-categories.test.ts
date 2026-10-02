import { describe, expect, it } from "vitest";
import type { SalonPhoto } from "@/types/models";
import {
  categoryForPhoto,
  matchesPhotoCategory,
  photoCategoryMetadata,
} from "./salon-photo-categories";

describe("Existing salon photo category mapping", () => {
  it.each([
    ["INTERIOR", "INTERIOR"],
    ["EXTERIOR", "FRONT"],
    ["SERVICE", "SERVICE_AREA"],
    ["TEAM", "OTHER"],
    ["OTHER", "OTHER"],
    ["RECEPTION", "RECEPTION"],
    ["WAITING_AREA", "WAITING_AREA"],
  ] as const)("maps %s to the existing %s value", (category, photoType) => {
    expect(photoCategoryMetadata(category)).toEqual({
      photoType,
      isPrimary: false,
    });
  });
  it("uses isPrimary for Cover and never creates a COVER database type", () => {
    expect(photoCategoryMetadata("COVER")).toEqual({
      photoType: "FRONT",
      isPrimary: true,
    });
    expect(
      matchesPhotoCategory(
        { photoType: "INTERIOR", isPrimary: true } as SalonPhoto,
        "COVER",
      ),
    ).toBe(true);
    expect(
      matchesPhotoCategory(
        { photoType: "FRONT", isPrimary: false } as SalonPhoto,
        "COVER",
      ),
    ).toBe(false);
  });
  it("preserves existing categories and honestly groups Team with Other", () => {
    const photo = { photoType: "OTHER", isPrimary: false } as SalonPhoto;
    expect(categoryForPhoto(photo)).toBe("OTHER");
    expect(matchesPhotoCategory(photo, "TEAM")).toBe(true);
    expect(matchesPhotoCategory(photo, "OTHER")).toBe(true);
    expect(categoryForPhoto({ photoType: "WAITING_AREA" })).toBe(
      "WAITING_AREA",
    );
    expect(matchesPhotoCategory(photo, "ALL")).toBe(true);
  });
});
