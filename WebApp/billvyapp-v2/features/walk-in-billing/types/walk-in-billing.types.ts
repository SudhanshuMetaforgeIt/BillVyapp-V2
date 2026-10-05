export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WalkInCustomerGender =
  'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

export type WalkInCustomer = {
  id: string;
  userId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: WalkInCustomerGender | null;
  isActive: boolean;
};

export type CreateCustomerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: WalkInCustomerGender;
};

export type ServiceCategory = {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type SalonService = {
  id: string;
  salonId: string;
  categoryId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  taxRate: string;
  isActive: boolean;
};

export type CartLine = {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export type WalkInPaymentMethod = 'UPI' | 'CASH' | 'CARD' | 'WALLET';

export type EnrollmentDetails = { nameConfirmed: boolean; whatsappSameAsBilling: boolean; whatsappNumber?: string; dateOfBirth?: string; address?: string; email?: string };
export type MembershipOffer = { id: string; name: string; price: string; durationDays: number; benefits: string | null; termsAndConditions: string | null; couponUsageLimit: number | null; eligibleServices: { id: string; name: string }[] };
export type CreateBillPayload = {
  enrollmentPlanId?: string | null;
  enrollmentDetails?: EnrollmentDetails;
  couponCode?: string | null;
  salonId: string;
  customerId: string;
  discount?: number;
  notes?: string | null;
  items: Array<{
    itemType: 'SERVICE';
    serviceId: string;
    quantity: number;
  }>;
};

export type BillRecord = {
  enrolledCouponCode?: string | null;
  membershipFee?: string; enrollmentPlanId?: string | null; enrollmentPlanName?: string | null;
  couponCode?: string | null;
  id: string;
  salonId: string;
  customerId: string;
  billNumber: string;
  billDate: string;
  subtotal: string;
  discount: string;
  tax: string;
  roundOff: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  status: string;
  paymentStatus: string;
  notes: string | null;
  items: Array<{
    id: string;
    itemType: string;
    serviceId: string | null;
    description: string | null;
    quantity: number;
    membershipDiscount?: string; membershipUnits?: number;
    unitPrice: string;
    discount: string;
    taxRate: string;
    taxAmount: string;
    total: string;
  }>;
  payments?: Array<{
    id: string;
    amount: string;
    paymentMethod: string;
    status: string;
    paymentDate: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentPayload = {
  billId: string;
  amount: number;
  paymentMethod: WalkInPaymentMethod;
};

export type PaymentRecord = {
  id: string;
  billId: string;
  amount: string;
  paymentMethod: string;
  status: string;
};

export type BillPreview = {
  membershipFee?: number;
  membershipDiscount?: number;
  originalSubtotal?: number;
  membershipPricing?: Record<string, { discount: number; final: number; units: number }>;

  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  youSave: number;
};

export type ValidatedBillCoupon = {
  couponUsageLimit?: number | null;
  usedVisits?: number;
  remainingVisits?: number | null;
  termsAndConditions?: string | null;
  benefitType?: 'NONE' | 'FREE_SERVICES' | 'PERCENTAGE_DISCOUNT';
  discountPercentage?: number | null;
  freeServiceLimit?: number | null;
  freeServicesPerVisit?: boolean;
  usedUnits?: number;
  remainingUnits?: number | null;
  customer?: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  couponCode: string;
  membershipName: string;
  benefits: string | null;
  eligibleServices: { id: string; name: string }[];
  startDate: string;
  endDate: string;
};
