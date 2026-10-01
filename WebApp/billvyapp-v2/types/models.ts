/**
 * Backend response models, transcribed from the runtime Swagger contract
 * (http://localhost:3000/api/docs). Prisma Decimals arrive as strings; keep
 * them as strings here and convert only for display.
 *
 * Feature modules may keep their own view models, but anything typed as a raw
 * API payload should come from this file.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}

type Decimal = string;
type IsoDate = string;

// ------------------------------------------------------------ identity/org

export interface Franchise {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Salon {
  id: string;
  franchiseId: string;
  franchise?: {
    id: string;
    name: string;
    code: string;
  } | null;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  googlePlaceId: string | null;
  mapAddress: string | null;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export interface Customer {
  id: string;
  userId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  isActive: boolean;
  totalBills: number;
  totalSpent: Decimal;
  lastVisit: IsoDate | null;
  branchName: string | null;
  salonId: string | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
}

export type AddressType = 'HOME' | 'WORK' | 'OTHER';

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: AddressType;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: string | null;
  longitude: string | null;
  isDefault: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface CustomerAddressInput {
  addressType: AddressType;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  isDefault?: boolean;
}

// ----------------------------------------------------------------- catalog

export interface ServiceCategory {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface SalonService {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: Decimal;
  taxRate: Decimal;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface ProductCategory {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Product {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  unit: string;
  costPrice: Decimal;
  sellingPrice: Decimal;
  taxRate: Decimal;
  reorderLevel: number;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  taxNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface VendorInput {
  name: string;
  code: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  city?: string | null;
  notes?: string | null;
}

export interface ProductVendor {
  id: string;
  productId: string;
  vendorId: string;
  vendorProductCode: string | null;
  purchasePrice: Decimal | null;
  isPreferred: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

// ---------------------------------------------------------------- purchases

export type PurchaseStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: Decimal;
  discount: Decimal;
  tax: Decimal;
  total: Decimal;
}

export interface Purchase {
  id: string;
  salonId: string;
  vendorId: string;
  purchaseNumber: string;
  vendorInvoiceNumber: string | null;
  purchaseDate: IsoDate;
  subtotal: Decimal;
  discount: Decimal;
  tax: Decimal;
  total: Decimal;
  status: PurchaseStatus;
  notes: string | null;
  items: PurchaseItem[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface PurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
  discount?: number;
  tax?: number;
}

export interface CreatePurchaseInput {
  salonId: string;
  vendorId: string;
  purchaseDate: string;
  vendorInvoiceNumber?: string | null;
  notes?: string | null;
  items: PurchaseItemInput[];
}

// ---------------------------------------------------------------- inventory

export interface InventoryRecord {
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  productSku: string;
  reorderLevel: number;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: Decimal;
  lastPurchasePrice: Decimal | null;
  lastStockedAt: IsoDate | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'DAMAGE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';

export interface StockMovement {
  id: string;
  salonId: string;
  productId: string;
  productName: string;
  movementType: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  unitCost: Decimal | null;
  balanceAfter: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: IsoDate;
}

// ------------------------------------------------------------- appointments

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface AppointmentServiceLine {
  id: string;
  serviceId: string;
  name: string;
  staffId: string | null;
  price: Decimal;
  durationMinutes: number;
  status: AppointmentStatus;
}

export interface Appointment {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string | null;
  appointmentNumber: string;
  appointmentDate: IsoDate;
  startTime: string;
  endTime: string;
  totalDurationMinutes: number;
  status: AppointmentStatus;
  notes: string | null;
  services: AppointmentServiceLine[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface CreateAppointmentInput {
  salonId: string;
  customerId?: string;
  staffId?: string | null;
  appointmentDate: string;
  startTime: string;
  notes?: string | null;
  services: { serviceId: string; staffId?: string | null }[];
}

// ------------------------------------------------------------------ billing

export type BillStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type BillPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'WALLET'
  | 'OTHER';
export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface BillItem {
  id: string;
  itemType: 'SERVICE' | 'PRODUCT';
  serviceId: string | null;
  productId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: Decimal;
  discount: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  total: Decimal;
}

export interface BillPaymentSummary {
  id: string;
  amount: Decimal;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: IsoDate;
}

export interface Bill {
  id: string;
  salonId: string;
  customerId: string;
  billNumber: string;
  billDate: IsoDate;
  subtotal: Decimal;
  discount: Decimal;
  tax: Decimal;
  roundOff: Decimal;
  total: Decimal;
  paidAmount: Decimal;
  dueAmount: Decimal;
  status: BillStatus;
  paymentStatus: BillPaymentStatus;
  notes: string | null;
  createdBy: string | null;
  salon: { id: string; name: string } | null;
  customer: {
    id: string;
    customerCode: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  items: BillItem[];
  payments: BillPaymentSummary[];
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface BillDocument {
  id: string;
  billId: string;
  storageKey: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string;
  fileSize: number;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export interface Payment {
  id: string;
  billId: string;
  amount: Decimal;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  paymentDate: IsoDate;
  status: PaymentStatus;
  notes: string | null;
  salonId: string;
  customerId: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

// ------------------------------------------------------ membership/loyalty

export interface MembershipPlan {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  price: Decimal;
  durationDays: number;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Membership {
  id: string;
  customerId: string;
  membershipPlanId: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: MembershipStatus;
  salonId: string;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

export type LoyaltyTransactionType =
  | 'EARNED'
  | 'REDEEMED'
  | 'EXPIRED'
  | 'ADJUSTED'
  | 'BONUS';

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  salonId: string | null;
  points: number;
  transactionType: LoyaltyTransactionType;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: IsoDate;
}

export interface LoyaltyBalance {
  customerId: string;
  balance: number;
}

export interface CreateLoyaltyInput {
  customerId: string;
  salonId?: string | null;
  points: number;
  transactionType: LoyaltyTransactionType;
  description?: string | null;
}

// ----------------------------------------------------------- notifications

export type NotificationChannel = 'WHATSAPP' | 'EMAIL' | 'SMS';
export type NotificationStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'CANCELLED';

export interface AppNotification {
  id: string;
  salonId: string | null;
  userId: string | null;
  customerId: string | null;
  channel: NotificationChannel;
  notificationType: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: NotificationStatus;
  provider: string | null;
  providerReference: string | null;
  errorMessage: string | null;
  retryCount: number;
  scheduledAt: IsoDate | null;
  sentAt: IsoDate | null;
  deliveredAt: IsoDate | null;
  failedAt: IsoDate | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

// ------------------------------------------------------------ media/audit

export interface MediaFile {
  id: string;
  salonId: string | null;
  uploadedBy: string | null;
  storageProvider: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  entityType: string | null;
  entityId: string | null;
  createdAt: IsoDate;
}

export interface MediaUpload extends MediaFile {
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface MediaDownload {
  id: string;
  storageKey: string;
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  salonId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: IsoDate;
}

export type SearchEntityType =
  | 'customers'
  | 'bills'
  | 'appointments'
  | 'services'
  | 'products'
  | 'salons';

export interface SearchHit {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle: string | null;
  meta: Record<string, unknown> | null;
}
