import { describe, expect, it } from "vitest";
import {
  categoryAvailable,
  categoryLabel,
  expenseChanges,
  receiptLink,
  validExpenseAmount,
  validExpenseDate,
} from "./helpers";
import { can } from "@/lib/capabilities";
import { keyTouchesDomain, INVALIDATION_MAP } from "@/lib/query-invalidation";
import type { Expense, ExpenseCategory, ExpensePayload } from "./types";

const root = {
  id: "parent",
  businessId: "business",
  parentId: null,
  name: "Utilities",
  isActive: true,
} as ExpenseCategory;
const child = { ...root, id: "child", parentId: "parent", name: "Electricity" };
describe("Expense forms and scoped display", () => {
  it("uses DB parent names and checks ancestor availability", () => {
    expect(categoryLabel(child, [root, child])).toBe("Utilities / Electricity");
    expect(categoryAvailable(child, [root, child])).toBe(true);
    expect(
      categoryAvailable(child, [{ ...root, isActive: false }, child]),
    ).toBe(false);
  });
  it("rejects missing, foreign-business and circular parents", () => {
    expect(categoryAvailable(child, [child])).toBe(false);
    expect(
      categoryAvailable(child, [{ ...root, businessId: "foreign" }, child]),
    ).toBe(false);
    expect(
      categoryAvailable(child, [{ ...root, parentId: "child" }, child]),
    ).toBe(false);
  });
  it.each(["0", "-12", "1.234", "1e3", "NaN", "10000000000"])(
    "rejects invalid amount %s",
    (value) => expect(validExpenseAmount(value)).toBe(false),
  );
  it.each(["0.01", "25000", "12.30", "9999999999.99"])(
    "accepts money %s",
    (value) => expect(validExpenseAmount(value)).toBe(true),
  );
  it("keeps date-only values and rejects impossible dates", () => {
    expect(validExpenseDate("2026-10-08")).toBe(true);
    expect(validExpenseDate("2026-02-30")).toBe(false);
  });
  it("sends only edits and never moves existing financial records between branches", () => {
    const payload: ExpensePayload = {
      branchId: "foreign",
      categoryId: "child",
      amount: 25000,
      expenseDate: "2026-10-08",
      paymentMethod: "CASH",
      vendorName: null,
      description: null,
      receiptUrl: null,
    };
    const expense = {
      ...payload,
      amount: "25000.00",
      branchId: "branch",
      createdBy: "manager",
      expenseNumber: "EXP-2026-000001",
    } as Expense;
    expect(expenseChanges(expense, payload)).toEqual({});
    expect(
      expenseChanges(expense, {
        ...payload,
        amount: 123,
        receiptUrl: "receipts/bill.pdf",
      }),
    ).toEqual({ amount: 123, receiptUrl: "receipts/bill.pdf" });
    expect(
      expenseChanges({ ...expense, receiptUrl: "old.png" }, payload),
    ).toEqual({ receiptUrl: null });
  });
  it("only links HTTP(S) receipts without URL credentials", () => {
    expect(receiptLink("https://example.com/receipt.pdf")).toBe(
      "https://example.com/receipt.pdf",
    );
    for (const value of [
      "javascript:receipt.png",
      "//example.com/receipt.pdf",
      "https://user:password@example.com/receipt.pdf",
      "receipts/bill.pdf",
    ])
      expect(receiptLink(value)).toBeUndefined();
  });
  it("limits expense and category actions to the backend roles", () => {
    expect(can({ role: "SUPER_ADMIN" }, "expenses.read")).toBe(true);
    expect(can({ role: "SUPER_ADMIN" }, "expenses.write")).toBe(false);
    expect(can({ role: "SUPER_ADMIN" }, "expenseCategories.write")).toBe(false);
    expect(can({ role: "MANAGER" }, "expenses.write")).toBe(true);
    expect(can({ role: "MANAGER" }, "expenseCategories.write")).toBe(false);
    expect(can({ role: "ADMIN" }, "expenseCategories.write")).toBe(true);
    expect(can({ role: "STAFF" }, "expenses.read")).toBe(false);
    expect(can({ role: "CUSTOMER" }, "expenses.write")).toBe(false);
  });
  it("refreshes all expense lists, category options and totals after mutations", () => {
    expect(INVALIDATION_MAP.expenses).toEqual(["expenses"]);
    for (const part of ["list", "summary", "categories", "detail"])
      expect(
        keyTouchesDomain(
          ["scope", "MANAGER", "user", "business", "branch", "expenses", part],
          "expenses",
        ),
      ).toBe(true);
  });
});
