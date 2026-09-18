export type BillStatus = 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type BillPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type BillStats = {
  totalBills: number;
  totalBillsChange: string;
  paidBills: number;
  paidBillsPct: number;
  pendingBills: number;
  pendingBillsPct: number;
  overdueBills: number;
  overdueBillsPct: number;
  totalAmount: number;
  totalAmountChange: string;
};

export type BillAmountSummary = {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  cancelledAmount: number;
};

export type BillItemRow = {
  id: string;
  itemType: 'SERVICE' | 'PRODUCT';
  serviceId?: string | null;
  productId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
};

export type BillRowItem = {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCode?: string;
  salonId: string;
  branchName: string;
  billDate: string;
  billTime: string;
  rawDate: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: BillStatus;
  paymentStatus: BillPaymentStatus;
  items: BillItemRow[];
  notes?: string | null;
  createdAt: string;
};

export type BillsFilterState = {
  search: string;
  statusTab: 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  status: string;
  branchId: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
};

export type CreateBillPayload = {
  salonId: string;
  customerId: string;
  billNumber?: string;
  billDate?: string;
  notes?: string;
  discount?: number;
  tax?: number;
  roundOff?: number;
  items: Array<{
    itemType: 'SERVICE' | 'PRODUCT';
    serviceId?: string;
    productId?: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    taxRate?: number;
  }>;
};

export type AdminBillsResult = {
  bills: BillRowItem[];
  stats: BillStats;
  amountSummary: BillAmountSummary;
  total: number;
  totalPages: number;
  branches: { id: string; name: string }[];
  customers: { id: string; name: string; phone?: string; customerCode?: string }[];
  services: { id: string; name: string; price: number; salonId: string }[];
};
