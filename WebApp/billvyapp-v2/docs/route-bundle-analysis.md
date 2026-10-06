# Local JavaScript bundle analysis

Analyzed all 75 current page routes against the running Next.js development output on localhost:3001. Missing routes were compiled with read-only document requests, then route manifests and their referenced chunks were inspected. Stale manifests for deleted routes and framework-only routes were excluded. All referenced files exist.

These numbers are sums of unique JavaScript files referenced by each route's client-reference manifest, including inherited layouts. They exclude source maps, HTML/RSC, images, separately loaded lazy chunks, and runtime/HMR code not listed by the entry manifest. They are not browser network measurements or production bundle sizes. Gzip values are computed estimates, not observed transfer sizes. Shared chunks are counted once per route; navigating between routes can reuse them.

## Representative routes

| Route | Development JS KiB | Estimated gzip KiB |
|---|---:|---:|
| Admin reports | 3306.2 | 471.0 |
| Super Admin reports | 3298.2 | 470.4 |
| Super Admin plans | 3065.1 | 448.6 |
| Login | 2523.5 | 382.2 |
| Customer dashboard | 2332.6 | 332.8 |
| Customer salon browsing | 2332.6 | 332.8 |
| Super Admin dashboard | 2206.4 | 328.4 |
| Manager appointments | 2075.0 | 318.9 |
| Admin POS | 2001.3 | 310.0 |

Use `.performance/route-bundles-dev.json` for exact bytes and the full list; this table is rounded and should be regenerated after changes.

## Findings, ranked for the next sprint

1. **Customer route isolation.** `features/customer-dashboard/index.ts` re-exports every customer view. Customer layout and pages import through it. Their manifests share an approximately 882 KiB application chunk, whose source map contains billing, booking, home, my bookings, notifications, profile, rewards, salon details, and salon browsing. Direct component imports are the first candidate to test. The measured chunk is not all removable: shared UI still belongs in the customer shell.
2. **Report route isolation.** `features/reports/index.ts` exports both Admin and Super Admin views. Separate imports should be tested so each route gets only its own view. The report routes currently include a Base UI chunk of approximately 1014 KiB in development. This is package-containing chunk size, not a claim that all of it can be removed.
3. **Report dialogs and export menus.** Super Admin report dialogs import Base UI Dialog eagerly, including when the dialogs are closed. Admin report history/export imports Base UI Menu. Move dialog-only code and constants into separate modules, then test conditional dynamic imports. Keep accessible loading and focus behaviour intact.
4. **Auth validation footprint.** Login references a Zod v4 chunk of approximately 932 KiB and a GSAP chunk of approximately 256 KiB in development. Zod and React Hook Form are used for actual validation. Investigate narrower supported validation entry points or a smaller schema implementation only after compatibility tests; dev size is not evidence of production tree-shaking failure.
5. **Shared providers.** All 75 routes reference the same approximately 502 KiB dependency chunk containing React Query, Axios, toast/goober, Zustand and Next modules, plus approximately 54 KiB of shared application code. Review provider placement for public auth pages, preserving refresh/session correctness. Package presence is based on source maps, not byte attribution within mixed chunks.
6. **Dashboard animations.** GSAP is pulled into dashboard navigation through PageTransition. Evaluate a small CSS entrance animation or lazy animation setup, retaining reduced-motion support. Source contains type-only Motion imports; an installed dependency alone is not evidence of runtime bundle weight.

## Repeat analysis

From the frontend directory:

```powershell
node scripts/analyze-route-bundles.cjs
node scripts/warm-bundle-routes.cjs --all
node scripts/analyze-route-bundles.cjs
```

The report and JSON are saved under ignored `.performance/`. No dependencies or configuration changes are needed. Compile routes and analyze against one stable version of the source; HMR can otherwise leave old manifests.

An existing local optimized build was also inspected using `--build`, but it predates the latest changes. It is a historical reference only and must not be used for before/after claims. No production deployment or new optimized build was performed.

## Validation

- All 75 source routes have an analyzed manifest.
- No missing chunk files.
- Route chunks are deduplicated before summing bytes.
- Source maps are excluded from JavaScript size.
- Package names report presence only; no fabricated per-package byte contributions.
- No application performance changes were made in this analysis.
