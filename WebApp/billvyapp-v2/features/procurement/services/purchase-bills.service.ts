import { api } from '@/services/api-client';

export type PurchaseBill = { id: string; originalFileName: string; mimeType: string; fileSize: number; createdAt: string };
export type BillOwner = 'purchase' | 'vendor';
export const BILL_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/avif';

export function validateBill(file: File) {
  if (!BILL_ACCEPT.split(',').includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)
    throw { status: 400, message: 'Choose a PDF, JPEG, PNG, WebP or AVIF bill up to 10 MB.' };
}
export function listPurchaseBills(type: BillOwner, id: string, salonId?: string) {
  return api.get<PurchaseBill[]>(`/procurement-documents/${type}/${id}`, { params: { salonId: salonId || undefined } });
}
export function uploadPurchaseBill(type: BillOwner, id: string, file: File, salonId?: string, onProgress?: (percent: number) => void) {
  validateBill(file);
  return api.post<PurchaseBill>(`/procurement-documents/${type}/${id}`, file, {
    params: { fileName: file.name, salonId: salonId || undefined },
    headers: { 'Content-Type': file.type }, timeout: 90000,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.min(100, Math.round(event.loaded / event.total * 100)));
    },
  });
}
export function getBillDownload(id: string) {
  return api.get<{ downloadUrl: string }>(`/procurement-documents/files/${id}/download-url`);
}
