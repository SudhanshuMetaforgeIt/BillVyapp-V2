# React Query freshness by feature

The local development baseline previously used a 60-second `staleTime` and disabled focus refetches for every query. These feature overrides keep fast-changing screens fresher while avoiding repeat requests for relatively stable data. They affect when cached data is considered stale; mutations still invalidate their related keys immediately.

| Data | Freshness | Focus refetch after stale? |
| --- | ---: | :---: |
| Customer search | 10 seconds | No |
| Appointments, notifications | 15 seconds | Yes |
| Bills, payments, inventory | 30 seconds | Yes |
| Customers, memberships, users, support, admin report overview | 30 seconds | No |
| Dashboard aggregates and revenue series | 45 seconds | No |
| Report history and analytics | 2 minutes | No |
| Catalog, staff options, salon browsing, plans, settings | 5 minutes | No |

The global default remains 60 seconds for queries not yet assigned a feature policy. System health keeps its existing 30-second freshness and 60-second polling. No new polling was added to dashboard or list queries.

The shared `useScopedQuery` hook now reuses previous page rows only if the previous query has the same verified user, role, franchise and salon scope. It never shows another tenant's placeholder rows during a scope change. Queries remain disabled until authentication is verified, and the auth flow clears the cache when the verified scope changes.

Validation: TypeScript, targeted ESLint and 50 relevant tests passed. These values are starting points for the dev environment, not measured optimums. Use the existing performance baseline export to compare request counts, cache hit/miss and response freshness during navigation, mutation and window focus before further adjustments.
