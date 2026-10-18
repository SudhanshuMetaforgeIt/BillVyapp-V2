# EC2 single-user database seed

Use a fresh MySQL database with the backend's migrations applied. This seed creates exactly one user: `sudhanshu.y@metaforgeit.com`, with role `SUPER_ADMIN` and initial password `dev@1234`. Passwords are stored using the same Argon2id settings as application login.

The five application role records are initialized so you can create other users through the app later. No demo users, franchises, salons, plans, or transactions are created. This is a separate command from the existing development/demo seed.

From the cloned repository root on EC2:

```bash
git pull origin main
cd WebApp/BackendServer/billvyapp-main-server
npm ci
# Create .env with the EC2 database's DATABASE_URL and application configuration.
# Use a database migration account for the migration command if required.
npx prisma migrate deploy
npm run db:generate
npm run build
npm run db:seed:super-admin
```

Alternatively, after setup/build, run from the repository root:

```bash
npm --prefix WebApp/BackendServer/billvyapp-main-server run db:seed:super-admin
```

Use the same Node.js version as the working development setup. The command loads the backend `.env` when present; environment variables supplied by the EC2 service also work. Database connections use the backend's existing UTC and TLS configuration, including `DATABASE_TLS_MODE` and `DATABASE_TLS_CA_PATH` for a remote production database.

Repeat runs keep the existing super admin password unchanged, including any password changed through the app. The seed refuses to run if another user exists, the designated email belongs to a different role/scope or inactive account, or the super admin role is inactive. It never deletes users or business data. All database changes run in one transaction.

Run the isolated seed regression tests without connecting to a database:

```bash
npm run test:seed:super-admin
```
