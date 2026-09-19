export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type CustomerStats = {
  totalCustomers: number;
  totalCustomersChange: string;
  newCustomers: number;
  newCustomersChange: string;
  returningCustomers: number;
  returningCustomersPct: number;
  totalSpentThisMonth: number;
  totalSpentChange: string;
};

export type CustomerInsights = {
  mostFrequentCustomer: { name: string; visits: number } | null;
  highestSpender: { name: string; amount: number } | null;
  newThisMonth: number;
  inactiveCustomers: number;
};

export type CustomerItem = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  joinedDate: string;
  rawCreatedAt: string;
  phone: string;
  email: string;
  branchName: string;
  salonId?: string | null;
  totalBills: number;
  totalSpent: number;
  lastVisit: string;
  isActive: boolean;
  gender?: Gender | null;
  customerCode: string;
};

export type CustomersFilterState = {
  search: string;
  customerTab: 'ALL' | 'NEW' | 'RETURNING';
  branchId: string;
  status: 'all' | 'active' | 'inactive';
  gender: 'all' | Gender;
  page: number;
  limit: number;
};

export type CreateCustomerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: Gender;
  dateOfBirth?: string;
  salonId?: string;
};

export type AdminCustomersResult = {
  customers: CustomerItem[];
  stats: CustomerStats;
  insights: CustomerInsights;
  total: number;
  totalPages: number;
  branches: { id: string; name: string }[];
};
