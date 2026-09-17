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
