export type SalonImageUpload = {
  storageKey: string;
  uploadUrl: string;
  uploadMethod: 'POST' | 'PUT';
  uploadFields?: Record<string, string>;
  expiresInSeconds: number;
};

export type StoredSalonImage = {
  storageKey: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

/**
 * Public salon-image storage boundary. It is intentionally separate from
 * ObjectStorageService, which handles private files such as bills.
 */
export interface SalonImageStorageProvider {
  readonly providerName: string;

  createUpload(params: {
    salonId: string;
    fileName: string;
  }): Promise<SalonImageUpload>;

  getImage(storageKey: string): Promise<StoredSalonImage>;

  getDeliveryUrl(params: {
    storageKey: string;
    variant: 'cover' | 'gallery';
  }): string;

  deleteImage(storageKey: string): Promise<void>;

  /** Server-mediated public image uploads; credentials never reach the UI. */
  uploadObject(
    storageKey: string,
    bytes: Buffer,
    mimeType: string,
  ): Promise<void>;
}
