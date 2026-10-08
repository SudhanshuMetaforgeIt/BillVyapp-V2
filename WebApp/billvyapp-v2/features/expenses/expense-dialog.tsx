"use client";
import { useState } from "react";
import { Modal } from "@/components/data/modal";
import {
  FormField,
  SelectInput,
  MutationError,
} from "@/components/data/form-fields";
import { QueryErrorState } from "@/components/data/query-error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { businessToday } from "@/lib/business-calendar";
import { useExpenseCategories, useExpenseMutation } from "./hooks";
import {
  categoryAvailable,
  categoryLabel,
  expenseChanges,
  validExpenseAmount,
  validExpenseDate,
} from "./helpers";
import {
  createExpense,
  updateExpense,
  getExpense,
  listExpenseBranches,
} from "./services";
import {
  PAYMENT_METHODS,
  type Expense,
  type ExpensePayload,
  type ExpensePaymentMethod,
} from "./types";

export function ExpenseDialog({
  id,
  businessId,
  branchId,
  onClose,
}: {
  id?: string;
  businessId: string;
  branchId: string;
  onClose: () => void;
}) {
  const detail = useScopedQuery(
    ["expenses", "detail", id],
    () => getExpense(id!),
    {
      enabled: Boolean(id),
      capability: "expenses.read",
      placeholderData: undefined,
      staleTime: 0,
    },
  );
  if (id && !detail.data)
    return (
      <Modal open onClose={onClose} title="Edit expense">
        {detail.isError ? (
          <QueryErrorState
            error={detail.error}
            onRetry={() => void detail.refetch()}
          />
        ) : (
          <p role="status">Loading expense…</p>
        )}
      </Modal>
    );
  return (
    <ExpenseForm
      original={detail.data}
      businessId={detail.data?.businessId ?? businessId}
      branchId={detail.data?.branchId ?? branchId}
      onClose={onClose}
    />
  );
}

function ExpenseForm({
  original,
  businessId,
  branchId: initialBranch,
  onClose,
}: {
  original?: Expense;
  businessId: string;
  branchId: string;
  onClose: () => void;
}) {
  const user = useCurrentUser();
  const [branchId, setBranchId] = useState(user?.salonId ?? initialBranch);
  const [categoryId, setCategoryId] = useState(original?.categoryId ?? "");
  const [amount, setAmount] = useState(original?.amount ?? "");
  const [expenseDate, setExpenseDate] = useState(
    original?.expenseDate ?? businessToday(),
  );
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>(
    original?.paymentMethod ?? "CASH",
  );
  const [vendorName, setVendorName] = useState(original?.vendorName ?? "");
  const [description, setDescription] = useState(original?.description ?? "");
  const [receiptUrl, setReceiptUrl] = useState(original?.receiptUrl ?? "");
  const categories = useExpenseCategories(businessId);
  const branches = useScopedQuery(
    ["expenses", "branches", businessId, "active"],
    () => listExpenseBranches(businessId, true),
    {
      enabled: !original && !user?.salonId && Boolean(businessId),
      capability: "expenses.read",
      placeholderData: undefined,
    },
  );
  const payload: ExpensePayload = {
    branchId,
    categoryId,
    amount: Number(amount),
    expenseDate,
    paymentMethod,
    vendorName: vendorName.trim() || null,
    description: description.trim() || null,
    receiptUrl: receiptUrl.trim() || null,
  };
  const changes = original ? expenseChanges(original, payload) : undefined;
  const save = useExpenseMutation(
    (value: ExpensePayload) =>
      original
        ? updateExpense(original.id, expenseChanges(original, value))
        : createExpense(value),
    onClose,
    original ? "Expense updated" : "Expense recorded",
  );
  const available = (categories.data ?? []).filter((item) =>
    categoryAvailable(item, categories.data ?? []),
  );
  const currentCategory = (categories.data ?? []).find(
    (item) => item.id === original?.categoryId,
  );
  const validCategory =
    available.some((item) => item.id === categoryId) ||
    Boolean(original && categoryId === original.categoryId);
  const canSave = Boolean(
    businessId &&
    branchId &&
    (original ||
      user?.salonId ||
      branches.data?.some((item) => item.id === branchId)) &&
    validCategory &&
    validExpenseAmount(amount) &&
    validExpenseDate(expenseDate) &&
    (!original || Object.keys(changes ?? {}).length > 0),
  );
  return (
    <Modal
      open
      onClose={onClose}
      busy={save.isPending}
      title={original ? `Edit ${original.expenseNumber}` : "Add expense"}
      description="Record a payment already made. Saving records the expense immediately."
      className="max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave && !save.isPending) save.mutate(payload);
        }}
      >
        <fieldset
          disabled={save.isPending}
          className="grid gap-4 sm:grid-cols-2"
        >
          {original ? (
            <FormField id="expense-branch" label="Branch">
              <p id="expense-branch" className="py-2 text-sm">
                {original.branch.name}
              </p>
            </FormField>
          ) : !user?.salonId ? (
            <FormField id="expense-branch" label="Branch">
              <SelectInput
                id="expense-branch"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                disabled={branches.isPending}
              >
                <option value="">Select branch</option>
                {(branches.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </SelectInput>
              {branches.isError && (
                <QueryErrorState
                  error={branches.error}
                  onRetry={() => void branches.refetch()}
                />
              )}
            </FormField>
          ) : null}
          <FormField id="expense-category" label="Category">
            <SelectInput
              id="expense-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={categories.isPending}
            >
              <option value="">
                {categories.isPending
                  ? "Loading categories…"
                  : "Select category"}
              </option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {categoryLabel(item, categories.data ?? [])}
                </option>
              ))}
              {original &&
                !available.some((item) => item.id === original.categoryId) && (
                  <option value={original.categoryId}>
                    {currentCategory
                      ? categoryLabel(currentCategory, categories.data ?? [])
                      : original.category.name}{" "}
                    (current, unavailable for new expenses)
                  </option>
                )}
            </SelectInput>
          </FormField>
          <FormField id="expense-amount" label="Amount">
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              max="9999999999.99"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
            {amount && !validExpenseAmount(amount) && (
              <p className="text-xs text-danger">
                Enter a positive amount with up to two decimal places.
              </p>
            )}
          </FormField>
          <FormField id="expense-date" label="Expense date">
            <Input
              id="expense-date"
              type="date"
              required
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
            />
          </FormField>
          <FormField id="expense-method" label="Payment method">
            <SelectInput
              id="expense-method"
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as ExpensePaymentMethod)
              }
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField id="expense-vendor" label="Vendor / Paid to (optional)">
            <Input
              id="expense-vendor"
              value={vendorName}
              onChange={(event) => setVendorName(event.target.value)}
              maxLength={191}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="expense-description" label="Description (optional)">
              <textarea
                id="expense-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={10000}
                rows={3}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField
              id="expense-receipt"
              label="Receipt URL or path (optional)"
              hint="Link to a PDF, JPG, JPEG or PNG receipt."
            >
              <Input
                id="expense-receipt"
                value={receiptUrl}
                onChange={(event) => setReceiptUrl(event.target.value)}
                maxLength={2048}
                placeholder="https://…/receipt.pdf"
              />
            </FormField>
          </div>
        </fieldset>
        {categories.isError && (
          <QueryErrorState
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
        )}
        {categories.isSuccess && available.length === 0 && !original && (
          <p role="status" className="text-sm text-text-secondary">
            No active categories are available. Ask your Admin to add or
            activate a category.
          </p>
        )}
        <MutationError error={save.error} />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSave || categories.isError || save.isPending}
          >
            {save.isPending
              ? "Saving…"
              : original
                ? "Save changes"
                : "Save expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
