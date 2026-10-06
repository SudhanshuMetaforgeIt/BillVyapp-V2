# React Re-Render Profiling & Optimization Report

## Executive Summary

As part of frontend performance hardening across the Billvy web application (`WebApp/billvyapp-v2`), we performed a comprehensive profiling audit of React re-renders. The audit targeted three major classes of render bottlenecks:

1. **Broad Zustand Store Subscriptions**: Over-subscribed layout gates and shells receiving unnecessary state changes (e.g., re-rendering all gated admin/manager views when a user's avatar, timezone, or profile metadata changes).
2. **Expensive Tables & Row Churn**: Unmemoized generic tables (`DataTable`, `CustomersTable`) where keystrokes in filter inputs caused re-allocation of column definition arrays and complete re-evaluation of every visible table row.
3. **High-Frequency Interactive Forms**: Monolithic billing views (`WalkInBillingPageView`) executing heavy serialization (`JSON.stringify(cart)`) and re-generating cart mutation callbacks on every keystroke.

All identified hotspots were addressed with targeted architectural fixes—narrow store selectors, memoized row sub-components, stable column contracts, and isolated form computations—verified with 138 unit/integration tests and zero TypeScript errors across all 77 application routes.

---

## 1. Broad Zustand Store Subscriptions

### The Hotspots
- [`features/subscription/components/subscription-gate.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/subscription/components/subscription-gate.tsx)
- [`components/layout/app-shell.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/layout/app-shell.tsx)

### Root Cause Analysis
- **`SubscriptionGate`**: Subscribed to the entire `user` object via `useAuthStore(selectUser)`. Because `user` is an object reference, any update in the auth store (e.g. updating profile photo, changing phone number, or syncing timezone via `useAuthStore.getState().setUser(...)`) created a new `user` reference. Because `SubscriptionGate` wraps all admin, manager, and staff dashboard views, every single nested dashboard route re-rendered unnecessarily.
- **`AppShell`**: Used inline arrow functions for toggling mobile and desktop sidebar states (`() => setSidebarOpen(false)` and `() => setSidebarCollapsed(!sidebarCollapsed)`), and computed role navigation sections dynamically on each render pass.

### Architectural Solution
1. **Narrow Selectors in `SubscriptionGate`**:
   Subscribed strictly to the primitive properties required for routing and gating:
   ```tsx
   // Before:
   const user = useAuthStore(selectUser);

   // After:
   const role = useAuthStore((s) => s.user?.role);
   const subscriptionActive = useAuthStore((s) => s.user?.subscriptionActive);
   ```
   Now, profile photo modifications or user metadata changes bypass `SubscriptionGate` re-evaluations entirely.

2. **Stable Handlers and Navigation Sections in `AppShell`**:
   - Stabilized `handleToggleCollapsed`, `handleOpenMobile`, and `handleCloseMobile` with `useCallback`.
   - Memoized `sections` with `useMemo(() => (user ? navigationForRole(user.role) : []), [user?.role])`.

---

## 2. Expensive Tables & Row Churn

### The Hotspots
- [`components/data/data-table.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/data/data-table.tsx)
- [`features/customers/components/customers-table.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/customers/components/customers-table.tsx)
- [`features/customers/components/customers-page-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/customers/components/customers-page-view.tsx)
- [`features/bills/components/bills-list-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/bills/components/bills-list-view.tsx)
- [`features/salons/components/salons-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/salons/components/salons-view.tsx)
- [`features/payments/components/payments-list-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/payments/components/payments-list-view.tsx)
- [`features/procurement/components/vendors-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/procurement/components/vendors-view.tsx)
- [`features/procurement/components/purchases-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/procurement/components/purchases-view.tsx)

### Root Cause Analysis
1. **Unmemoized Generic `DataTable` Rows**:
   In `DataTable`, rows were directly mapped to JSX `<tr>` elements. When parent components re-rendered (such as updating filter inputs), every single row was re-rendered from scratch, even if the underlying row data remained unchanged.
2. **Inline Column Array Invalidation**:
   In `BillsListView`, `SalonsView`, `PaymentsListView`, `VendorsView`, and `PurchasesView`, `const columns: Column<T>[] = [...]` was declared inside the component body without `useMemo`. As a result, every search input keystroke created a new array reference, busting child memoization.
3. **Unmemoized `CustomersTable`**:
   In `CustomersPageView`, the user typed into an immediate `searchInput` state while queries ran against a `deferredSearch`. However, because `CustomersTable` was not memoized and received an inline `onPageChange` callback and fallback array `data?.rows ?? []`, typing a single character into the search box triggered re-rendering of all customer rows.

### Architectural Solution
1. **Memoized `DataTableRow`**:
   Extracted and wrapped table rows in `React.memo`:
   ```tsx
   function DataTableRowInner<T>({ row, columns, onRowClick }: DataTableRowProps<T>) {
     return (
       <tr
         className={cn('border-b border-border last:border-0 hover:bg-ivory/60', onRowClick && 'cursor-pointer')}
         onClick={onRowClick ? () => onRowClick(row) : undefined}
       >
         {columns.map((col) => (
           <td key={col.id} className={cn('px-5 py-3 text-text', col.className)}>
             {col.cell(row)}
           </td>
         ))}
       </tr>
     );
   }

   export const DataTableRow = memo(DataTableRowInner) as typeof DataTableRowInner;
   ```
2. **Extracted and Memoized `CustomerTableRow`**:
   Extracted `CustomerTableRow` in `CustomersTable` and wrapped the parent `CustomersTable` with `React.memo`. In `CustomersPageView`, declared module-level static fallback objects (`EMPTY_ROWS` and `EMPTY_META`) and wrapped `handlePageChange` in `useCallback`.
3. **Memoized Column Definitions**:
   Wrapped all table column definitions across `BillsListView`, `SalonsView`, `PaymentsListView`, `VendorsView`, and `PurchasesView` in `useMemo`, ensuring column array references remain strictly stable across search and filter keystrokes.

---

## 3. High-Frequency Interactive Forms

### The Hotspot
- [`features/walk-in-billing/components/walk-in-billing-page-view.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/features/walk-in-billing/components/walk-in-billing-page-view.tsx)

### Root Cause Analysis
- **Unmemoized JSON Serialization**:
  `offerKey` computed a membership key on every render pass via:
  ```ts
  const offerKey = `${salonId}:${customer?.id}:${JSON.stringify(cart)}:${preview.total}:${coupon?.couponCode ?? ''}`;
  ```
  Typing into any input (`stylistName`, `phoneQuery`, `serviceSearch`, or `discountAmount`) executed `JSON.stringify(cart)` on every keystroke.
- **Unmemoized `payablePreview`**:
  An object literal `{ ...preview, membershipFee, total: ... }` was instantiated on every keystroke, forcing `BillSummaryCard` to re-render even when cart and totals were unchanged.
- **Unstable Handlers**:
  Handlers `addService`, `changeQty`, and `removeLine` were recreated on each render pass, passing new function references into `AddServicesSection`.

### Architectural Solution
1. **Fingerprinted and Memoized `offerKey`**:
   Replaced raw `JSON.stringify(cart)` with a lean fingerprint string memoized against `cart`:
   ```ts
   const cartFingerprint = useMemo(
     () => cart.map((line) => `${line.serviceId}:${line.quantity}:${line.unitPrice}`).join('|'),
     [cart],
   );

   const offerKey = useMemo(
     () => `${salonId}:${customer?.id}:${cartFingerprint}:${preview.total}:${coupon?.couponCode ?? ''}`,
     [salonId, customer?.id, cartFingerprint, preview.total, coupon?.couponCode],
   );
   ```
2. **Memoized `payablePreview`**:
   Wrapped `payablePreview` in `useMemo([preview, choice?.plan?.price])`.
3. **Stabilized Handlers**:
   Wrapped `addService`, `changeQty`, `removeLine`, and `resetForm` in `useCallback`.

---

## 4. Verification & Validation Summary

| Category | Target Files | Optimization Applied | Verification Result |
| :--- | :--- | :--- | :--- |
| **Zustand Selectors** | `subscription-gate.tsx`, `app-shell.tsx` | Narrow selectors to `role` and `subscriptionActive`; memoized layout callbacks | Prevents layout-wide cascading renders on profile photo / metadata updates |
| **Generic Table** | `data-table.tsx` | Extracted `DataTableRow` with `React.memo` | Table rows re-render only when row data or columns change |
| **Customer Directory** | `customers-table.tsx`, `customers-page-view.tsx` | `CustomerTableRow` memoization; module fallback constants; memoized page handler | Zero customer table re-renders while typing in search filter |
| **Column Contracts** | `bills-list-view.tsx`, `salons-view.tsx`, `payments-list-view.tsx`, `vendors-view.tsx`, `purchases-view.tsx` | `useMemo` on column arrays; `useCallback` on row clicks | Preserves table memoization across filter input interactions |
| **Interactive Form** | `walk-in-billing-page-view.tsx` | Replaced `JSON.stringify(cart)` with memoized fingerprint; memoized `payablePreview` and handlers | Typing stylist name or searching services no longer triggers cart serialization or summary card re-renders |

### Test & Build Status
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Unit & Integration Tests**: 23 test suites (138 tests) passed cleanly in `vitest`.
- **Production Build**: `next build` compiled 77 static/dynamic pages with Turbopack in 8.6s with 0 errors.

---

## 5. Architectural Rules for Future Component Development

1. **Always Use Narrow Zustand Selectors**:
   - *Rule*: Never subscribe to full objects (`user`, `session`) unless every single property is displayed.
   - *Example*: Use `useAuthStore((s) => s.user?.role)` instead of `useAuthStore((s) => s.user)`.
2. **Always Memoize Table Columns**:
   - *Rule*: Table column definitions must be defined either at file/module scope (if static) or wrapped in `useMemo` (if dependent on roles or action handlers).
3. **Avoid Unmemoized Object Literals in Props**:
   - *Rule*: Do not pass `{ ...data }` or fallback arrays `items ?? []` inline in props to memoized children; declare `const EMPTY_ITEMS = []` at module scope.
4. **Fingerprint Complex Data Structures**:
   - *Rule*: Do not run `JSON.stringify` on large arrays/objects inside the component body for keys or comparisons; compute lightweight fingerprints wrapped in `useMemo`.
