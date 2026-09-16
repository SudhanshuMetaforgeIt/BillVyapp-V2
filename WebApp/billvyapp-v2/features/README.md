# Features

Business functionality lives here, one folder per backend domain. Route files
under `app/` stay thin and simply render a component from a feature.

## Layering

```
app/dashboard/<role>/<domain>/page.tsx   route only, a few lines
        ↓
features/<domain>/components/            UI for the domain
        ↓
features/<domain>/hooks/                 TanStack Query hooks
        ↓
features/<domain>/services/              API calls
        ↓
services/api-client.ts                   the single Axios instance
        ↓
NestJS backend
```

## Folder shape

Create only the folders a feature actually needs — empty directories are noise.

```
features/<domain>/
├── components/     domain UI (tables, forms, detail panels)
├── hooks/          useQuery / useMutation wrappers
├── services/       endpoint functions, importing `api` from services/api-client
├── schemas/        Zod schemas for this domain's forms
├── types/          types used only by this domain
├── constants/      domain-specific constants
└── index.ts        public surface — other code imports from here
```

`features/auth/` is the worked example: schemas, types, hooks and a barrel,
with no folders it does not need.

## Domains

These map 1:1 to backend modules. Add the folder when you start the feature.

`auth` · `dashboard` · `customers` · `appointments` · `services` · `products` ·
`vendors` · `purchases` · `inventory` · `bills` · `payments` · `memberships` ·
`loyalty` · `notifications` · `media` · `users` · `franchises` · `salons` ·
`roles`

Note the billing domain is **`bills`**, never `invoices` — it mirrors the
`bills` table.

## Rules

**One feature per domain, not per role.** `features/customers/` serves admins,
managers and staff alike. Never create `features/admin-customers/`. Roles change
*what is visible and permitted*, not *which feature exists* — use
`usePermissions()` for that.

**Never create a second Axios instance.** Feature services import `api` from
`@/services/api-client`, which owns auth headers, error normalisation and token
refresh.

**Server data belongs in TanStack Query, not Zustand.** Zustand is for genuine
client state — sidebar, selected salon, session identity.

**No role comparisons in components.** No `if (user.role === 'ADMIN')`. Call
`usePermissions()`; the logic lives in `lib/permissions.ts`.

**Frontend checks are UX, not security.** The backend re-checks every role and
every franchise/salon boundary on every request.

**Keep files small.** If a component grows past a couple of hundred lines or
takes on a second responsibility, split it.
