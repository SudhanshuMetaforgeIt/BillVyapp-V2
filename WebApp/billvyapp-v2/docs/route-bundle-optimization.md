# Local development route bundle optimization

Measured on October 5, 2026 using the running Next development server on port 3001.

Customer pages and their layout now import their specific component directly instead of the feature barrel. Admin and Super Admin reports also import their specific view directly. Super Admin report generation and preview dialogs use conditional dynamic imports; report type options live in a separate module so displaying the filter does not import dialog code.

## Measurements

Manifest-referenced initial JavaScript, including inherited layouts, in KiB:

| Route | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Customer home | 2332.6 | 1189.8 | 49.0% |
| Customer salons | 2332.6 | 1021.8 | 56.2% |
| Customer bookings | 2332.6 | 1103.6 | 52.7% |
| Customer billing | 2332.6 | 1129.6 | 51.6% |
| Customer profile | 2332.6 | 1941.5 | 16.8% |
| Super Admin reports | 3298.2 | 1885.9 | 42.8% |
| Admin reports | 3306.2 | 2967.5 | 10.2% |

These are development bundle sizes, not production build sizes or measured network transfer. The analyzer excludes separately loaded async chunks, source maps, images and HTML/RSC. Estimated gzip for customer home decreased from 332.8 to 173.1 KiB; Super Admin reports decreased from 470.4 to 301.8 KiB. Deferred dialogs still download when used. Authentication pages were unaffected.

## Validation and repeatability

All 75 current routes returned HTTP 200 when warmed; the analyzer reported no missing route manifests. TypeScript checking passed, and both report service test files passed (12 tests). Authenticated dialog interactions were not exercised in this pass.

Run from the frontend directory:

```powershell
node scripts/warm-bundle-routes.cjs --all
node scripts/analyze-route-bundles.cjs
npx tsc --noEmit
npm test -- features/reports
```

Detailed current measurements are in ignored `.performance/route-bundles-dev.json` and `.performance/route-bundles-dev.md`; the pre-change snapshot is `.performance/route-bundles-dev-before.json`.

Remaining large development routes include Super Admin plans, authentication, Admin reports and customer profile. Those require a separate examination of their own dependency paths before choosing further changes.

## Lazy loading follow-up

34 additional dialog entry points now import their implementation only while open. Salon gallery upload/edit dialogs are now in a separate module. Profile photo components load separately, while crop controls continue to load only after selecting a file. Seven dashboard/report chart entry points load within 200px of the viewport, using reserved-height placeholders. Report charts were separated from shared analytics tables and summary components to preserve the split. The Admin export menu loads on click or keyboard activation, retaining its Base UI menu implementation. CSV template downloads import a separate export utility on click rather than importing the bulk-upload dialog. Bill and profile routes import their views directly to avoid eager barrel exports.

Compared with the snapshot immediately before this follow-up:

| Route | Before KiB | After KiB | Reduction |
| --- | ---: | ---: | ---: |
| Admin reports | 2967.5 | 1768.6 | 40.4% |
| Customer profile | 1941.5 | 1125.3 | 42.0% |
| Super Admin dashboard | 2206.4 | 2136.7 | 3.2% |
| Admin services | 2300.1 | 2153.5 | 6.4% |
| Manager appointments | 2075.0 | 2016.7 | 2.8% |

TypeScript checking passed, 69 relevant existing tests passed, and all 75 routes returned HTTP 200 with no missing manifests. These figures exclude deferred chunks; total JavaScript used after opening tools is not reduced by the same amount. Interactive focus, upload and dialog flows still require an authenticated UI check. The comparison snapshot is `.performance/route-bundles-lazy-before.json`.
