import { api } from "@/services/api-client";
import type { Paginated, Franchise, Salon } from "@/types/models";
import type {
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpensePayload,
  ExpenseUpdate,
  ExpenseSummary,
  CategoryPayload,
} from "./types";

export function listExpenses(filters: ExpenseFilters, page: number) {
  return api.get<Paginated<Expense>>("/expenses", {
    params: { ...filters, page, limit: 10 },
  });
}
export const getExpense = (id: string) => api.get<Expense>(`/expenses/${id}`);
export const getExpenseSummary = (filters: ExpenseFilters) =>
  api.get<ExpenseSummary>("/expenses/summary", { params: filters });
export const createExpense = (payload: ExpensePayload) =>
  api.post<Expense>("/expenses", payload);
export const updateExpense = (id: string, payload: ExpenseUpdate) =>
  api.patch<Expense>(`/expenses/${id}`, payload);
export const createCategory = (payload: CategoryPayload) =>
  api.post<ExpenseCategory>("/expense-categories", payload);
export const updateCategory = (
  id: string,
  { parentId, name, description }: CategoryPayload,
) =>
  api.patch<ExpenseCategory>(`/expense-categories/${id}`, {
    parentId,
    name,
    description,
  });
export const setCategoryActive = (id: string, isActive: boolean) =>
  api.patch<ExpenseCategory>(`/expense-categories/${id}/status`, { isActive });

async function allPages<T>(
  path: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const result = await api.get<Paginated<T>>(path, {
      params: { ...params, page, limit: 100 },
    });
    rows.push(...result.data);
    if (page >= result.meta.totalPages) return rows;
  }
}
export const listExpenseCategories = (businessId?: string) =>
  allPages<ExpenseCategory>("/expense-categories", { businessId });
export const listExpenseBusinesses = () =>
  allPages<Franchise>("/franchises", {});
export const listExpenseBranches = (businessId: string, activeOnly = false) =>
  allPages<Salon>("/salons", {
    franchiseId: businessId,
    ...(activeOnly ? { isActive: "true" } : {}),
  });
