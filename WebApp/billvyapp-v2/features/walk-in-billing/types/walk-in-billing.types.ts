export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type WalkInCustomer = {
  id: string;
  userId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
};

export type CreateCustomerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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

export type CreateBillPayload = {
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
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  youSave: number;
};
