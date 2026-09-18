export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type FranchiseListItem = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
};

export type PaymentListItem = {
  id: string;
  billId: string;
  amount: string;
  status: string;
  paymentMethod?: string;
  paymentDate: string;
  createdAt: string;
};

export type NotificationListItem = {
  id: string;
  notificationType: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
};

export type BillItemListItem = {
  id: string;
  itemType: string;
  serviceId: string | null;
  productId: string | null;
  description: string | null;
  quantity: number;
  total: string;
};

export type BillPaymentSummary = {
  id: string;
  amount: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
};

export type BillListItem = {
  id: string;
  salonId: string;
  customerId: string;
  billNumber: string;
  billDate: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  status: string;
  paymentStatus: string;
  items: BillItemListItem[];
  payments?: BillPaymentSummary[];
  createdAt: string;
  updatedAt: string;
};

export type AppointmentServiceLine = {
  id: string;
  serviceId: string;
  name: string;
  staffId: string | null;
  price: string;
  durationMinutes: number;
  status: string;
};

export type AppointmentListItem = {
  id: string;
  salonId: string;
  customerId: string;
  staffId: string | null;
  appointmentNumber: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  services: AppointmentServiceLine[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};