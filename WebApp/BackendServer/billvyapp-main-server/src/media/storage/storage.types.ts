export type PresignedUpload = {
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export type PresignedDownload = {
  storageKey: string;
  downloadUrl: string;
  expiresInSeconds: number;
};

/**
 * Abstraction over private object storage. Binary bytes never enter MySQL —
 * only storage keys and metadata are persisted.
 */
export interface ObjectStorageProvider {
  /** Value stored on MediaFile.storageProvider (e.g. LOCAL, S3). */
  readonly providerName: string;

  buildStorageKey(params: {
    salonId?: string | null;
    originalFileName: string;
  }): string;

  createUploadUrl(params: {
    storageKey: string;
    mimeType: string;
  }): Promise<PresignedUpload>;

  createDownloadUrl(storageKey: string): Promise<PresignedDownload>;

  deleteObject(storageKey: string): Promise<void>;
}
