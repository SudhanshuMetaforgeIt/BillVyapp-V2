"use client";
import { useDeferredValue, useState } from "react";
import { Plus, Receipt, Wallet, Tags } from "lucide-react";
import { DataTable, type Column } from "@/components/data/data-table";
import { RowActionsMenu } from "@/components/data/row-actions-menu";
import { QueryErrorState } from "@/components/data/query-error-state";
import {
  FormField,
  SelectInput,
  MutationError,
} from "@/components/data/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useScopedQuery } from "@/hooks/use-scoped-query";
import { can } from "@/lib/capabilities";
import { isSuperAdmin } from "@/lib/permissions";
import { formatCurrency, formatDate, formatFullName } from "@/lib/format";
import {
  useExpenses,
  useExpenseSummary,
  useExpenseCategories,
  useExpenseMutation,
} from "./hooks";
import {
  listExpenseBusinesses,
  listExpenseBranches,
  setCategoryActive,
} from "./services";
import { categoryAvailable, categoryLabel, receiptLink } from "./helpers";
import {
  PAYMENT_METHODS,
  type Expense,
  type ExpenseCategory,
  type ExpenseFilters,
  type ExpensePaymentMethod,
} from "./types";
import { ExpenseDialog } from "./expense-dialog";
import { CategoryDialog } from "./category-dialog";

function ReceiptValue({ value }: { value: string | null }) {
  const href = receiptLink(value);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-champagne underline"
    >
      Open receipt
    </a>
  ) : (
    <span>{value || "—"}</span>
  );
}

export function ExpensesPageView() {
  const user = useCurrentUser();
  const superAdmin = isSuperAdmin(user);
  const [business, setBusiness] = useState("");
  const businessId = user?.franchiseId ?? business;
  const [branch, setBranch] = useState("");
  const branchId = user?.salonId ?? branch;
  const [tab, setTab] = useState<"expenses" | "categories">("expenses");
  const [search, setSearch] = useState("");
  const searchValue = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryStatus, setCategoryStatus] = useState("all");
  const [expenseDialog, setExpenseDialog] = useState<{ id?: string } | null>(
    null,
  );
  const [categoryDialog, setCategoryDialog] = useState<{
    category?: ExpenseCategory;
  } | null>(null);
  const dateRangeValid = !dateFrom || !dateTo || dateFrom <= dateTo;
  const filters: ExpenseFilters = {
    businessId: businessId || undefined,
    branchId: branchId || undefined,
    categoryId: categoryId || undefined,
    paymentMethod: (paymentMethod || undefined) as
      ExpensePaymentMethod | undefined,
    search: searchValue.trim() || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const expenses = useExpenses(filters, page, dateRangeValid);
  const summary = useExpenseSummary(filters, dateRangeValid);
  const categories = useExpenseCategories(businessId || undefined);
  const businesses = useScopedQuery(
    ["expenses", "businesses"],
    listExpenseBusinesses,
    { enabled: superAdmin, capability: "franchises.read" },
  );
  const branches = useScopedQuery(
    ["expenses", "branches", businessId],
    () => listExpenseBranches(businessId),
    {
      enabled: !user?.salonId && Boolean(businessId),
      capability: "expenses.read",
      placeholderData: undefined,
    },
  );
  const statusChange = useExpenseMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      setCategoryActive(id, isActive),
    () => {},
    "Category availability updated",
  );
  const categoryRows = (categories.data ?? []).filter(
    (item) =>
      categoryLabel(item, categories.data ?? [])
        .toLowerCase()
        .includes(categorySearch.trim().toLowerCase()) &&
      (categoryStatus === "all" ||
        item.isActive === (categoryStatus === "active")),
  );
  const categoryTotalPages = Math.ceil(categoryRows.length / 10);
  const effectiveCategoryPage = Math.min(
    categoryPage,
    Math.max(categoryTotalPages, 1),
  );
  const categoryData = categories.data
    ? {
        data: categoryRows.slice(
          (effectiveCategoryPage - 1) * 10,
          effectiveCategoryPage * 10,
        ),
        meta: {
          page: effectiveCategoryPage,
          limit: 10,
          total: categoryRows.length,
          totalPages: categoryTotalPages,
        },
      }
    : undefined;
  const columns: Column<Expense>[] = [
    {
      id: "number",
      header: "Expense",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.expenseNumber}</p>
          <p className="text-xs text-text-secondary">
            {formatDate(row.expenseDate)}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: (row) => {
        const item = categories.data?.find(
          (item) => item.id === row.categoryId,
        );
        return item
          ? categoryLabel(item, categories.data ?? [])
          : row.category.name;
      },
    },
    {
      id: "amount",
      header: "Amount",
      cell: (row) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      id: "method",
      header: "Payment method",
      cell: (row) =>
        PAYMENT_METHODS.find((item) => item.value === row.paymentMethod)
          ?.label ?? row.paymentMethod,
    },
    { id: "vendor", header: "Paid to", cell: (row) => row.vendorName || "—" },
    {
      id: "branch",
      header: "Branch",
      cell: (row) => (
        <div>
          {row.branch.name}
          {superAdmin && (
            <p className="text-xs text-text-secondary">{row.business.name}</p>
          )}
        </div>
      ),
    },
    {
      id: "creator",
      header: "Recorded by",
      cell: (row) => formatFullName(row.createdByUser),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <RowActionsMenu
          name={row.expenseNumber}
          actions={
            can(user, "expenses.write")
              ? [
                  {
                    label: "Edit expense",
                    onClick: () => setExpenseDialog({ id: row.id }),
                  },
                ]
              : []
          }
          fields={[
            ["Expense number", row.expenseNumber],
            ["Business", row.business.name],
            ["Branch", row.branch.name],
            ["Category", row.category.name],
            ["Amount", formatCurrency(row.amount)],
            ["Date", formatDate(row.expenseDate)],
            [
              "Payment method",
              PAYMENT_METHODS.find((item) => item.value === row.paymentMethod)
                ?.label,
            ],
            ["Vendor / Paid to", row.vendorName],
            ["Description", row.description],
            ["Recorded by", formatFullName(row.createdByUser)],
            ["Receipt", <ReceiptValue key="receipt" value={row.receiptUrl} />],
            ["Created", formatDate(row.createdAt)],
            ["Updated", formatDate(row.updatedAt)],
          ]}
        />
      ),
    },
  ];
  const categoryColumns: Column<ExpenseCategory>[] = [
    {
      id: "name",
      header: "Category",
      cell: (row) => (
        <div className="font-medium">
          {categoryLabel(row, categories.data ?? [])}
        </div>
      ),
    },
    ...(superAdmin
      ? [
          {
            id: "business",
            header: "Business",
            cell: (row: ExpenseCategory) =>
              businesses.data?.find((item) => item.id === row.businessId)
                ?.name ?? row.businessId,
          },
        ]
      : []),
    {
      id: "description",
      header: "Description",
      cell: (row) => row.description || "—",
    },
    {
      id: "availability",
      header: "Availability",
      cell: (row) => (
        <span className={row.isActive ? "text-success" : "text-text-secondary"}>
          {!row.isActive
            ? "Inactive"
            : categoryAvailable(row, categories.data ?? [])
              ? "Active"
              : "Parent inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (row) => (
        <RowActionsMenu
          name={row.name}
          fields={[
            ["Name", row.name],
            ["Hierarchy", categoryLabel(row, categories.data ?? [])],
            ["Description", row.description],
            ["Availability", row.isActive ? "Active" : "Inactive"],
          ]}
          actions={
            can(user, "expenseCategories.write")
              ? [
                  {
                    label: "Edit category",
                    onClick: () => setCategoryDialog({ category: row }),
                  },
                  {
                    label: row.isActive
                      ? "Deactivate category"
                      : "Activate category",
                    onClick: () =>
                      statusChange.mutate({
                        id: row.id,
                        isActive: !row.isActive,
                      }),
                    disabled: statusChange.isPending,
                  },
                ]
              : []
          }
        />
      ),
    },
  ];
  if (!can(user, "expenses.read"))
    return (
      <p className="app-surface-card p-5">
        Your account cannot access expenses.
      </p>
    );
  return (
    <div className="space-y-6">
      <div className="app-surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-text-secondary">
          {superAdmin
            ? "View recorded expenses by franchise and salon."
            : "Track payments already made by your business."}
        </p>
        {can(user, "expenses.write") && (
          <Button
            onClick={() => setExpenseDialog({})}
            disabled={!businessId || !can(user, "expenses.write")}
          >
            <Plus className="size-4" />
            Add expense
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3" aria-busy={summary.isFetching}>
        {[
          {
            title: "Total expenses",
            value: summary.data ? formatCurrency(summary.data.amount) : "—",
            icon: Wallet,
          },
          {
            title: "Recorded expenses",
            value: summary.data ? String(summary.data.count) : "—",
            icon: Receipt,
          },
          {
            title: "Categories used",
            value: summary.data ? String(summary.data.byCategory.length) : "—",
            icon: Tags,
          },
        ].map(({ title, value, icon: Icon }) => (
          <div key={title} className="app-surface-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">{title}</p>
              <Icon className="size-5 text-champagne" />
            </div>
            {summary.isPending && dateRangeValid ? (
              <Skeleton className="mt-3 h-8 w-28" />
            ) : (
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {dateRangeValid && !summary.isError ? value : "—"}
              </p>
            )}
            <p className="mt-1 text-xs text-text-secondary">
              Matching the expense filters
            </p>
          </div>
        ))}
      </div>
      {summary.isError && (
        <QueryErrorState
          error={summary.error}
          onRetry={() => void summary.refetch()}
        />
      )}
      <div className="app-surface-card space-y-4 p-5">
        <div
          className="flex gap-2 border-b border-border pb-3"
          role="tablist"
          aria-label="Expenses sections"
        >
          <Button
            role="tab"
            aria-selected={tab === "expenses"}
            variant={tab === "expenses" ? "default" : "outline"}
            onClick={() => setTab("expenses")}
          >
            Expenses
          </Button>
          <Button
            role="tab"
            aria-selected={tab === "categories"}
            variant={tab === "categories" ? "default" : "outline"}
            onClick={() => setTab("categories")}
          >
            Categories
          </Button>
        </div>
        {superAdmin && (
          <FormField id="expense-business-filter" label="Franchise">
            <SelectInput
              id="expense-business-filter"
              value={business}
              onChange={(event) => {
                setBusiness(event.target.value);
                setBranch("");
                setCategoryId("");
                setPage(1);
                setCategoryPage(1);
              }}
              disabled={businesses.isPending}
            >
              <option value="">All franchises</option>
              {(businesses.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectInput>
            {!businessId && (
              <p className="text-xs text-text-secondary">
                Choose a franchise to filter expenses by salon.
              </p>
            )}
            {businesses.isError && (
              <QueryErrorState
                error={businesses.error}
                onRetry={() => void businesses.refetch()}
              />
            )}
          </FormField>
        )}
        {tab === "expenses" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FormField id="expense-search" label="Search">
                <Input
                  id="expense-search"
                  placeholder="Expense number, vendor, description"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  maxLength={191}
                />
              </FormField>
              {!user?.salonId && businessId && (
                <FormField
                  id="expense-branch-filter"
                  label={superAdmin ? "Salon" : "Branch"}
                >
                  <SelectInput
                    id="expense-branch-filter"
                    value={branch}
                    onChange={(event) => {
                      setBranch(event.target.value);
                      setPage(1);
                    }}
                    disabled={branches.isPending}
                  >
                    <option value="">
                      {superAdmin ? "All salons" : "All branches"}
                    </option>
                    {(branches.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.isActive ? "" : " (inactive)"}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              )}
              <FormField id="expense-category-filter" label="Category">
                <SelectInput
                  id="expense-category-filter"
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setPage(1);
                  }}
                  disabled={categories.isPending}
                >
                  <option value="">All categories</option>
                  {(categories.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {categoryLabel(item, categories.data ?? [])}
                      {!item.isActive ? " (inactive)" : ""}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField id="expense-payment-filter" label="Payment method">
                <SelectInput
                  id="expense-payment-filter"
                  value={paymentMethod}
                  onChange={(event) => {
                    setPaymentMethod(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All methods</option>
                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField id="expense-date-from" label="From date">
                <Input
                  id="expense-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </FormField>
              <FormField id="expense-date-to" label="To date">
                <Input
                  id="expense-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                />
              </FormField>
            </div>
            {!dateRangeValid && (
              <p role="alert" className="text-sm text-danger">
                From date must be on or before to date.
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategoryId("");
                setPaymentMethod("");
                setDateFrom("");
                setDateTo("");
                setBranch("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
            {expenses.isFetching && expenses.data && (
              <p role="status" className="text-xs text-text-secondary">
                Updating expenses…
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <FormField id="expense-category-search" label="Search categories">
              <Input
                id="expense-category-search"
                value={categorySearch}
                onChange={(event) => {
                  setCategorySearch(event.target.value);
                  setCategoryPage(1);
                }}
              />
            </FormField>
            <FormField id="expense-category-status" label="Availability">
              <SelectInput
                id="expense-category-status"
                value={categoryStatus}
                onChange={(event) => {
                  setCategoryStatus(event.target.value);
                  setCategoryPage(1);
                }}
              >
                <option value="all">All categories</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectInput>
            </FormField>
            {can(user, "expenseCategories.write") && (
              <Button
                disabled={!businessId || !categories.isSuccess}
                onClick={() => setCategoryDialog({})}
              >
                <Plus className="size-4" />
                Add category
              </Button>
            )}
          </div>
        )}
        {categories.isError && (
          <QueryErrorState
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
        )}
        {branches.isError && businessId && !user?.salonId && (
          <QueryErrorState
            error={branches.error}
            onRetry={() => void branches.refetch()}
          />
        )}
      </div>
      {tab === "expenses" ? (
        dateRangeValid && (
          <DataTable
            columns={columns}
            query={expenses}
            rowKey={(row) => row.id}
            onPageChange={setPage}
            emptyTitle="No expenses found"
            emptyMessage="Add your first expense or adjust the filters to see recorded payments."
            noun="expenses"
          />
        )
      ) : (
        <>
          <MutationError error={statusChange.error} />
          <DataTable
            columns={categoryColumns}
            query={{ ...categories, data: categoryData }}
            rowKey={(row) => row.id}
            onPageChange={setCategoryPage}
            emptyTitle="No categories found"
            emptyMessage="Your Admin can add expense categories for this business."
            noun="categories"
          />
        </>
      )}
      {expenseDialog && (
        <ExpenseDialog
          key={expenseDialog.id ?? `${businessId}-${branchId}`}
          id={expenseDialog.id}
          businessId={businessId}
          branchId={branchId}
          onClose={() => setExpenseDialog(null)}
        />
      )}
      {categoryDialog && (
        <CategoryDialog
          key={categoryDialog.category?.id ?? businessId}
          businessId={categoryDialog.category?.businessId ?? businessId}
          category={categoryDialog.category}
          categories={categories.data ?? []}
          onClose={() => setCategoryDialog(null)}
        />
      )}
    </div>
  );
}
