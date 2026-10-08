# Settings, password policy, database backups and maintenance

General settings and password rules are persisted in `PlatformSettings`. Cached
settings dates are hydrated after Redis deserialization. Editing one settings
section no longer overwrites unsaved changes in another section.

New account passwords (staff/admin creation and customer self-registration) are
checked against the current database policy. Existing login passwords, OTP codes,
session tokens, and random inaccessible passwords for staff-created customer
profiles are not revalidated as new user passwords. Generated customer passwords
are 128 characters and include every supported character class. Changing policy does not lock
existing users out.

## Maintenance

`GET /api/settings/maintenance-status` publicly returns only `{ enabled, message }`.
Franchise Admins, Managers and Staff see:

> The application is in maintenance mode. It will be live soon.

Their business API requests return HTTP 503 while enabled. The dashboard polls
every five seconds and checks on focus, reopening automatically when disabled.
Authentication/session routes stay available; Super Admin can manage settings.
Customer access is unchanged.

## Full database backup and restore

These existing Super Admin endpoints now operate on the **entire MySQL database**:

- `POST /api/settings/backup`
- `GET /api/settings/backups`
- `POST /api/settings/restore`, body
  `{ "confirm": true, "confirmationPhrase": "RESTORE", "backupId": "<uuid>" }`

Exports include all application tables, data, schema, triggers, routines and events.
`mysqldump` and `mysql` must be installed on the backend host and accessible on PATH,
or configured through `MYSQLDUMP_PATH` and `MYSQL_CLIENT_PATH`. Connection settings
come from `DATABASE_URL`; passwords are excluded from process arguments. The MySQL
account needs export privileges and schema/data modification privileges for restore.

Backups are private local files under `STORAGE_LOCAL_ROOT/backups/database`: an SQL
dump and a versioned manifest with database name, size, timestamp and SHA-256 checksum.
Only completed compatible database backups appear in the restore selector. Legacy
settings-only JSON snapshots remain under `backups/platform-settings` and are not
offered as full database restore targets. Uploaded media files and Redis contents
are outside the database and require separate storage backups.

Restore verifies the manifest and SQL checksum before any database changes. It
puts the application into maintenance, makes a new recovery backup of the current
database, and imports the selected SQL dump. If import fails, it attempts to import
the recovery backup. If both imports fail, forced maintenance remains active;
restore a valid recovery backup or perform operator recovery before removing the
`settings:database:restoring` Redis flag. Operation locks prevent concurrent backup
or restore jobs. Files are streamed, and incomplete exports are never published.

MySQL DDL restores are not transactional. Use backups from a compatible application
schema/version and quiesce background workers/other database writers during a
restore. Restoring replaces snapshot tables and discards newer data in them. Cache
keys are cleared afterward; the browser signs out so restored identity/session
state is reloaded. A saved maintenance flag in the restored database remains in
effect until Super Admin disables it.

Backups are retained until the operator removes or archives them. Monitor storage
capacity and keep copies on separate protected storage.

## Verification

`outputs/verify-settings-database.cjs` clones a read-only full dump of the application
database into a uniquely named temporary database. It checks settings persistence,
warm-cache dates, enabled/disabled password rules and maintenance, then performs a
full restore and compares row counts for all 43 application tables. It drops only
that temporary database and removes its temporary dumps. The application database
is not modified. Backend unit tests additionally exercise checksum rejection,
explicit confirmation, role restrictions, concurrent operation rejection and
automatic recovery (including the double-failure maintenance case).
