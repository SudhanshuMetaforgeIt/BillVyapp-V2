export type ExpensePaymentMethod =
  "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
export const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] =
  [
    { value: "CASH", label: "Cash" },
    { value: "UPI", label: "UPI" },
    { value: "CARD", label: "Card" },
    { value: "BANK_TRANSFER", label: "Bank transfer" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "OTHER", label: "Other" },
  ];
export interface ExpenseCategory {
  id: string;
  businessId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Expense {
  id: string;
  businessId: string;
  branchId: string;
  categoryId: string;
  expenseNumber: string;
  amount: string;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  vendorName: string | null;
  description: string | null;
  receiptUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  business: { id: string; name: string; code: string };
  branch: { id: string; name: string; code: string };
  category: { id: string; name: string; parentId: string | null };
  createdByUser: { id: string; firstName: string; lastName: string | null };
}
export interface ExpenseSummary {
  count: number;
  amount: string;
  byCategory: { categoryId: string; count: number; amount: string }[];
  byPaymentMethod: {
    paymentMethod: ExpensePaymentMethod;
    count: number;
    amount: string;
  }[];
}
export interface ExpenseFilters {
  businessId?: string;
  branchId?: string;
  categoryId?: string;
  paymentMethod?: ExpensePaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
export interface ExpensePayload {
  branchId?: string;
  categoryId: string;
  amount: number;
  expenseDate: string;
  paymentMethod: ExpensePaymentMethod;
  vendorName: string | null;
  description: string | null;
  receiptUrl: string | null;
}
export type ExpenseUpdate = Partial<Omit<ExpensePayload, "branchId">>;
export interface CategoryPayload {
  businessId?: string;
  parentId: string | null;
  name: string;
  description: string | null;
}
