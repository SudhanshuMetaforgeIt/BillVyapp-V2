# Route Skeletons and Progressive Loading Architecture

This document describes the implementation of Next.js App Router route-level loading boundaries, progressive rendering, and layout reservation skeletons designed to eliminate Cumulative Layout Shift (CLS) and blank loading states across BillVyApp v2.

---

## 1. Problem Statement & Objectives

- **Previous Behavior:**
  - Route transitions and cold dashboard loads showed jarring blank screens with a single pulsating circle.
  - No `loading.tsx` Suspense boundaries existed in the App Router hierarchy.
  - When child pages hydrated or loaded queries, content jumped abruptly onto the screen, degrading user experience and causing measurable Cumulative Layout Shift (CLS).
- **Solution:**
  - Implemented modular, geometrically accurate skeleton primitives that mirror the real dimensions and responsive layouts of dashboard views.
  - Wired Next.js App Router route-level `loading.tsx` fallbacks across all major role segments (`admin`, `manager`, `staff`, `super_admin`, `customer`, `auth`).
  - Integrated `<AppShellSkeleton />` into the root application shell (`AppShell`) during auth resolution and hydration.

---

## 2. Skeleton Component Primitives

All skeletons are located under [`components/skeletons`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons) and re-exported via [`components/skeletons/index.ts`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/index.ts):

| Primitive | Path | Layout Geometry Reserved |
| :--- | :--- | :--- |
| **`AppShellSkeleton`** | [`components/skeletons/app-shell-skeleton.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/app-shell-skeleton.tsx) | Sidebar (`lg:w-64`), Top Header (`h-16`), notifications/avatar placeholders, and dashboard content fallback. |
| **`DashboardContentSkeleton`** | [`components/skeletons/dashboard-content-skeleton.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/dashboard-content-skeleton.tsx) | Page heading + 4-card metric grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) + search toolbar + table rows. |
| **`TablePageSkeleton`** | [`components/skeletons/table-page-skeleton.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/table-page-skeleton.tsx) | Page header + filter toolbar + 8 table rows with avatar and badge placeholders. |
| **`WalkInBillingSkeleton`** | [`components/skeletons/walk-in-billing-skeleton.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/walk-in-billing-skeleton.tsx) | Two-column billing layout: left order panel (branch, customer, items) and right sticky summary & checkout panel. |
| **`CustomerDashboardSkeleton`** | [`components/skeletons/customer-dashboard-skeleton.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/customer-dashboard-skeleton.tsx) | Hero banner + 3 stat tiles (loyalty, memberships, bills) + 3 booking cards + 4 salon cards. |
| **`AuthPageSkeleton`** | [`components/skeletons/auth-page-skeleton.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/components/skeletons/auth-page-skeleton.tsx) | Server-rendered `AuthPageShell` preserving aurora gradients and brand panel, with an exact auth card skeleton. |

---

## 3. Route Fallback Mapping

Next.js automatically suspends page transitions at each boundary and streams the corresponding `loading.tsx`:

- **Root Dashboard Boundary:**
  - [`app/dashboard/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/loading.tsx) &rarr; `<AppShellSkeleton />`
- **Role Dashboard Boundaries:**
  - [`app/dashboard/admin/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/admin/loading.tsx) &rarr; `<DashboardContentSkeleton />`
  - [`app/dashboard/manager/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/manager/loading.tsx) &rarr; `<DashboardContentSkeleton />`
  - [`app/dashboard/staff/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/staff/loading.tsx) &rarr; `<DashboardContentSkeleton />`
  - [`app/dashboard/super_admin/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/super_admin/loading.tsx) &rarr; `<DashboardContentSkeleton />`
  - [`app/dashboard/customer/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/customer/loading.tsx) &rarr; `<CustomerDashboardSkeleton />`
  - [`app/auth/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/auth/loading.tsx) &rarr; `<AuthPageSkeleton />`
- **Specialized Heavy Feature Boundaries:**
  - [`app/dashboard/admin/walk-in-billing/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/admin/walk-in-billing/loading.tsx) &rarr; `<WalkInBillingSkeleton />`
  - [`app/dashboard/manager/walk-in-billing/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/manager/walk-in-billing/loading.tsx) &rarr; `<WalkInBillingSkeleton />`
  - [`app/dashboard/staff/walk-in-billing/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/staff/walk-in-billing/loading.tsx) &rarr; `<WalkInBillingSkeleton />`
- **Table Views:**
  - [`app/dashboard/admin/customers/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/admin/customers/loading.tsx) &rarr; `<TablePageSkeleton title="Customers" ... />`
  - [`app/dashboard/admin/bills/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/admin/bills/loading.tsx) &rarr; `<TablePageSkeleton title="Bills & Invoices" ... />`
  - [`app/dashboard/admin/staff/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/admin/staff/loading.tsx) &rarr; `<TablePageSkeleton title="Staff Directory" ... />`
  - [`app/dashboard/admin/services/loading.tsx`](file:///c:/Users/Sudhanshu%20Yadav/Desktop/Billvyapp-v2/WebApp/billvyapp-v2/app/dashboard/admin/services/loading.tsx) &rarr; `<TablePageSkeleton title="Services & Catalog" ... />`

---

## 4. Verification & Results

1. **TypeScript Type Safety:**
   - Ran `npx tsc --noEmit` &rarr; 0 type errors.
2. **Unit & Integration Tests:**
   - Ran `vitest run` &rarr; 23 test suites passed, 138 tests passed.
3. **Turbopack Production Build:**
   - Ran `next build` &rarr; All 78 static and dynamic routes compiled successfully with zero hydration or build errors.
