import { isDateOnlyString } from "@/lib/business-timezone";
import type {
  Expense,
  ExpenseCategory,
  ExpensePayload,
  ExpenseUpdate,
} from "./types";

/** Missing/inactive ancestors and cycles make a category unavailable for new records. */
export function categoryAvailable(
  category: ExpenseCategory,
  categories: ExpenseCategory[],
): boolean {
  const seen = new Set<string>();
  let current: ExpenseCategory | undefined = category;
  while (current) {
    if (
      !current.isActive ||
      current.businessId !== category.businessId ||
      seen.has(current.id)
    )
      return false;
    seen.add(current.id);
    if (!current.parentId) return true;
    current = categories.find(
      (item) =>
        item.id === current?.parentId &&
        item.businessId === category.businessId,
    );
  }
  return false;
}
export function categoryLabel(
  category: ExpenseCategory,
  categories: ExpenseCategory[],
): string {
  const names = [category.name];
  const seen = new Set([category.id]);
  let parentId = category.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = categories.find(
      (item) => item.id === parentId && item.businessId === category.businessId,
    );
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join(" / ");
}
export function validExpenseAmount(value: string): boolean {
  return (
    /^\d+(?:\.\d{1,2})?$/.test(value) &&
    Number(value) > 0 &&
    Number(value) <= 9999999999.99
  );
}
export const validExpenseDate = isDateOnlyString;

/** Send only corrections: keep immutable scope and an unchanged inactive category intact. */
export function expenseChanges(
  original: Expense,
  payload: ExpensePayload,
): ExpenseUpdate {
  const changes: ExpenseUpdate = {};
  if (original.categoryId !== payload.categoryId)
    changes.categoryId = payload.categoryId;
  if (Number(original.amount) !== payload.amount)
    changes.amount = payload.amount;
  if (original.expenseDate !== payload.expenseDate)
    changes.expenseDate = payload.expenseDate;
  if (original.paymentMethod !== payload.paymentMethod)
    changes.paymentMethod = payload.paymentMethod;
  if (original.vendorName !== payload.vendorName)
    changes.vendorName = payload.vendorName;
  if (original.description !== payload.description)
    changes.description = payload.description;
  if (original.receiptUrl !== payload.receiptUrl)
    changes.receiptUrl = payload.receiptUrl;
  return changes;
}
export function receiptLink(value: string | null): string | undefined {
  if (!value || !/^https?:\/\//i.test(value)) return undefined;
  try {
    const url = new URL(value);
    return !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}
