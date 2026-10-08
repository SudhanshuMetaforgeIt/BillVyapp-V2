import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api-client";
import {
  listExpenseCategories,
  listExpenses,
  getExpenseSummary,
  updateCategory,
  createExpense,
} from "./services";
vi.mock("@/services/api-client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());
describe("Expense API integration contracts", () => {
  it("loads every category page so categories after page 100 remain available", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [{ id: "first" }],
        meta: { totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id: "second" }],
        meta: { totalPages: 2 },
      });
    expect(await listExpenseCategories("business")).toEqual([
      { id: "first" },
      { id: "second" },
    ]);
    expect(api.get).toHaveBeenLastCalledWith("/expense-categories", {
      params: { businessId: "business", page: 2, limit: 100 },
    });
  });
  it("uses identical expense filters for records and totals with pagination only on records", async () => {
    const filters = {
      branchId: "branch",
      dateFrom: "2026-10-01",
      categoryId: "category",
    };
    await listExpenses(filters, 2);
    await getExpenseSummary(filters);
    expect(api.get).toHaveBeenCalledWith("/expenses", {
      params: { ...filters, page: 2, limit: 10 },
    });
    expect(api.get).toHaveBeenCalledWith("/expenses/summary", {
      params: filters,
    });
  });
  it("does not send immutable business scope in category corrections", async () => {
    await updateCategory("category", {
      businessId: "business",
      name: "Utilities",
      parentId: null,
      description: null,
    });
    expect(api.patch).toHaveBeenCalledWith("/expense-categories/category", {
      name: "Utilities",
      parentId: null,
      description: null,
    });
  });
  it("creates expenses directly without a status/approval request", async () => {
    const payload = {
      categoryId: "category",
      amount: 25000,
      expenseDate: "2026-10-08",
      paymentMethod: "BANK_TRANSFER" as const,
      vendorName: null,
      description: null,
      receiptUrl: null,
    };
    await createExpense(payload);
    expect(api.post).toHaveBeenCalledWith("/expenses", payload);
    expect(api.patch).not.toHaveBeenCalled();
  });
});
