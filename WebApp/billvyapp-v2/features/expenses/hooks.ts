"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { invalidateAfter } from "@/lib/query-invalidation";
import { describeApiError } from "@/lib/api-errors";
import type { ExpenseFilters } from "./types";
import {
  listExpenses,
  getExpenseSummary,
  listExpenseCategories,
} from "./services";

export const useExpenses = (
  filters: ExpenseFilters,
  page: number,
  enabled = true,
) =>
  useScopedQuery(
    ["expenses", "list", filters, page],
    () => listExpenses(filters, page),
    { capability: "expenses.read", enabled },
  );
export const useExpenseSummary = (filters: ExpenseFilters, enabled = true) =>
  useScopedQuery(
    ["expenses", "summary", filters],
    () => getExpenseSummary(filters),
    { capability: "expenses.read", enabled },
  );
export const useExpenseCategories = (businessId?: string) =>
  useScopedQuery(
    ["expenses", "categories", businessId],
    () => listExpenseCategories(businessId),
    { capability: "expenses.read", placeholderData: undefined },
  );
export function useExpenseMutation<T>(
  save: (payload: T) => Promise<unknown>,
  onSaved: () => void,
  message: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: save,
    onSuccess: async () => {
      await invalidateAfter(client, "expenses");
      toast.success(message);
      onSaved();
    },
    onError: (error) => toast.error(describeApiError(error).message),
  });
}
