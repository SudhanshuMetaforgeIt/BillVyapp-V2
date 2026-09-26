import axios from 'axios';

import { api } from '@/services/api-client';
import type { BillDocument, MediaDownload, MediaFile, MediaUpload, Paginated } from '@/types/models';

export function listBillDocuments(billId: string, page = 1, limit = 20) {
  return api.get<Paginated<BillDocument>>(`/bills/${billId}/documents`, {
    params: { page, limit },
  });
}

export function deleteBillDocument(billId: string, id: string) {
  return api.delete<void>(`/bills/${billId}/documents/${id}`);
}

/**
 * Upload flow defined by the media API:
 *   1. POST /media/upload-url -> short-lived presigned PUT URL
 *   2. PUT the bytes directly to storage (no bearer token; the URL is the credential)
 *   3. POST /media/:id/confirm -> backend verifies the object exists
 *   4. POST /bills/:billId/documents { mediaFileId } -> attach
 */
export async function uploadBillDocument(input: {
  billId: string;
  salonId: string;
  file: File;
}): Promise<BillDocument> {
  const upload = await api.post<MediaUpload>('/media/upload-url', {
    originalFileName: input.file.name,
    mimeType: input.file.type || 'application/octet-stream',
    fileSize: input.file.size,
    salonId: input.salonId,
    entityType: 'BILL',
    entityId: input.billId,
  });

  try {
    await axios.put(upload.uploadUrl, input.file, {
      headers: { 'Content-Type': input.file.type || 'application/octet-stream' },
    });
  } catch {
    await api.delete<void>(`/media/${upload.id}`).catch(() => undefined);
    throw { status: 0, message: 'The file could not be uploaded to storage.' };
  }

  await api.post<MediaFile>(`/media/${upload.id}/confirm`);
  return api.post<BillDocument>(`/bills/${input.billId}/documents`, {
    mediaFileId: upload.id,
  });
}

/**
 * Bill documents expose the storage key but not the media id, so resolve the
 * media record attached to the bill, then request a presigned, expiring URL.
 * Called on click; the URL is never stored.
 */
export async function getBillDocumentDownloadUrl(
  billId: string,
  document: Pick<BillDocument, 'storageKey'>,
): Promise<MediaDownload> {
  const media = await api.get<Paginated<MediaFile>>('/media', {
    params: { entityType: 'BILL', entityId: billId, page: 1, limit: 100 },
  });
  const match = media.data.find((m) => m.storageKey === document.storageKey);
  if (!match) {
    throw { status: 404, message: 'This document is not available for download.' };
  }
  return api.get<MediaDownload>(`/media/${match.id}/download-url`);
}
