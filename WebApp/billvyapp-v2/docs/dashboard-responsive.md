# Dashboard responsive contract

Scope: Super Admin, Admin, Manager and Staff. Changes use the existing components, tokens and navigation. Business calculations, API contracts, database schemas and role permissions are unchanged.

## Layout strategy

`app/dashboard-responsive.css` is imported by the existing global stylesheet and owns the shared responsive rules.

| Responsibility | Approach |
| --- | --- |
| Shell, sidebar and header | Existing 1024px navigation switch; compact header below 640px; fluid gutters; shrinking main content. |
| Page composition | Named `dashboard` inline-size container. `content-md`, `content-lg`, `content-xl` variants use 40rem, 64rem and 80rem of available content width. |
| Forms and detail panels | Named `panel` container. `panel-md` switches to grouped fields at 28rem; small dialogs use a single column. |
| Statistics | Auto-fit grid with a 12rem minimum capped by available width. Named metric containers adapt headings and values with container units. |
| Toolbars | Wrapping flex rows and wrapping action groups. Controls stack below 640px. Date ranges use a shared grid. |
| Tables | Local, keyboard-focusable scrolling; readable column minimums; existing mobile card alternatives retained. Important columns remain available. |
| Dialogs | Fluid padding, viewport-bounded height, internal scrolling, larger close controls and wrapping footer actions. |
| Charts | Responsive SVG layouts. Dense axes retain a readable minimum plot width within a local, focusable scroll region. |
| Touch and keyboard | Larger coarse-pointer controls, visible scroll-region focus, closed mobile navigation made inert. |

Positioned descendants belong to the table scroll wrapper: `position: relative` prevents absolute screen-reader labels from contributing to document overflow. This addresses overflow without hiding table content. Wide table utilities retain their existing minimum widths rather than being overridden by the generic table rule.

Dropdown placement uses the select component's existing positioning mechanism. Its popup width, horizontal position and vertical height are bounded by the viewport; direction is captured during positioning instead of reading a DOM ref during render. Long options wrap.

## Audit and changes

The audit covered shell/navigation, header/profile controls, statistics, tables and pagination, search/filter/action rows, forms, dialogs, charts, empty/loading/error states and images. Modules included customers, businesses/branches, salons/photos, services/categories, staff/users, reports, inventory, procurement/vendors, appointments, campaigns, notifications, support, audit, platform plans, settings and profile.

Membership coverage includes member and plan tables, create/edit plan forms, membership details, coupons, benefit configuration, eligible services, terms, filters and pagination. The eligible-service fieldset has its own bounded vertical scroll area.

Billing uses the available dashboard width to choose its columns. Narrow views stack customer/service selection, totals, membership enrollment, coupon controls and payment actions. Discounts, coupon counters and enrollment payloads keep their existing behavior. Bill and purchase item tables also scroll inside their dialogs.

The source audit is saved in `.responsive-checks/source-audit.txt`; the changed-file inventory is `.responsive-checks/changed-files.json`.

## Verification

The isolated browser helpers intercept API traffic with fixtures. They do not contact a live backend, create database records or complete payments. Fixtures include long customer/salon/plan names, populated tables, long terms and 25 eligible services in dialog/interaction checks.

Widths: **320, 360, 375, 390, 414, 480, 600, 640, 768, 820, 960, 1024, 1200, 1280, 1440, 1920, 2560px**. The 820px case uses a 390px landscape height; other cases use an 800px height.

| Check | Result |
| --- | --- |
| Production route sweep | 61 role-specific routes × 17 widths = 1,037 checks; no document/main/header overflow or browser exceptions. |
| Production interactions | 231 checks; no failures or browser exceptions. Mobile navigation, inert closed navigation, account menus, membership details/create/edit, populated billing, enrollment terms, service dropdowns and attached coupons. |
| Final chart change | All four production dashboard home pages rechecked across all 17 widths: 68 checks, no failures or browser exceptions; results in `home-results.json`. |
| TypeScript | `npx tsc --noEmit` passed. |
| Existing frontend tests | All 94 tests in 15 files passed. |
| Production build | Passed, including generation of all 77 static pages. |
| Encoding | All 513 frontend TypeScript/TSX/CSS sources passed strict UTF-8 decoding. |
| Touched-file ESLint | 27 existing hook-rule errors and one existing image warning remain. They concern existing effect-based state synchronization, one declaration-order issue and a campaign image. Shared select ref-render errors were removed as part of popup positioning. |

Browser results and representative screenshots are in `.responsive-checks/`. This verifies layouts and representative interactions with fixtures; it is not live backend integration testing or an assertion that every possible data combination and dialog has been exercised.

## Re-running the browser checks

Build the frontend and run its production server on port 3100, then run:

```powershell
node scripts/verify-dashboard-responsive.mjs
node scripts/verify-dashboard-interactions.mjs
node scripts/verify-dashboard-responsive.mjs --home
```

`RESPONSIVE_BASE_URL` can point to another local server. `PLAYWRIGHT_MODULE` can override the bundled Playwright module path; Chromium must be available to that runtime. The helpers add no production dependency. Optional `RESPONSIVE_ROLE` and `RESPONSIVE_ROUTE` environment variables restrict a route sweep.
