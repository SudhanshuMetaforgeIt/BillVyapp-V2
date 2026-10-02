import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api-client";
import {
  salonPhotosService,
  validateSalonPhoto,
  SALON_PHOTO_MAX_BYTES,
} from "./salon-photos.service";

vi.mock("@/services/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("Manager salon photos API", () => {
  beforeEach(() => vi.resetAllMocks());
  it("uploads raw images only to the authenticated backend, never the provider", async () => {
    vi.mocked(api.post).mockResolvedValue({ id: "photo" });
    const file = { name: "interior.png", type: "image/png", size: 20 } as File;
    await salonPhotosService.upload("assigned-salon", file, {
      photoType: "INTERIOR",
      isPrimary: false,
      displayOrder: 3,
    });
    expect(api.post).toHaveBeenCalledWith(
      "/salons/assigned-salon/photos/upload",
      file,
      expect.objectContaining({
        headers: { "Content-Type": "image/png" },
        params: expect.objectContaining({
          fileName: "interior.png",
          mimeType: "image/png",
          photoType: "INTERIOR",
          isPrimary: "false",
          displayOrder: 3,
        }),
      }),
    );
  });
  it("passes the existing photo ID to replacement without sending provider keys", async () => {
    const file = { name: "cover.png", type: "image/png", size: 20 } as File;
    await salonPhotosService.upload(
      "s1",
      file,
      { isPrimary: true },
      undefined,
      "old-photo",
    );
    expect(api.post).toHaveBeenCalledWith(
      "/salons/s1/photos/upload",
      file,
      expect.objectContaining({
        params: expect.objectContaining({
          replaceId: "old-photo",
          isPrimary: "true",
        }),
      }),
    );
  });
  it("reuses list, update and delete endpoints for cover, category and persistent order", async () => {
    await salonPhotosService.list("s1");
    await salonPhotosService.update("s1", "p1", { isPrimary: true });
    await salonPhotosService.update("s1", "p1", {
      photoType: "SERVICE_AREA",
      displayOrder: 2,
    });
    await salonPhotosService.remove("s1", "p1");
    expect(api.get).toHaveBeenCalledWith("/salons/s1/photos");
    expect(api.patch).toHaveBeenCalledWith("/salons/s1/photos/p1", {
      isPrimary: true,
    });
    expect(api.patch).toHaveBeenCalledWith("/salons/s1/photos/p1", {
      photoType: "SERVICE_AREA",
      displayOrder: 2,
    });
    expect(api.delete).toHaveBeenCalledWith("/salons/s1/photos/p1");
  });
  it.each([
    { name: "file.pdf", type: "application/pdf", size: 20 },
    { name: "large.png", type: "image/png", size: SALON_PHOTO_MAX_BYTES + 1 },
    { name: "empty.png", type: "image/png", size: 0 },
  ])("rejects invalid selection $name before requesting an upload", (file) => {
    expect(() => validateSalonPhoto(file)).toThrow();
    expect(() => salonPhotosService.upload("s1", file as File, {})).toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });
});
