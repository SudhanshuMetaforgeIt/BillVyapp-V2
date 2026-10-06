# Authentication startup waterfall

On a protected full reload, the frontend previously waited for `POST /auth/refresh` and then called `GET /auth/me`. The second request began only after the first completed. The backend now includes the verified user, role, franchise/salon scope, subscription state and timezone in the refresh response. Startup installs that identity after one request. Protected queries remain disabled until the identity is installed.

Refresh calls from startup and concurrent 401 retries share one in-flight promise. This matters because the backend revokes each presented refresh token during rotation. Public authentication routes do not make a startup refresh request; navigating into a protected area starts it if needed. When a 401 refresh changes the user's scope, the query cache and selected scope are cleared before data requests resume.

The previous local backend snapshot had only three successful refresh samples (p50 92.6 ms) and one successful `/auth/me` sample (21.1 ms). That is insufficient to claim a measured latency improvement. The structural request count on a protected reload changes from two sequential auth calls to one. Existing dashboard aggregate requests already use parallel calls; customer dashboard queries start independently after session verification.

Validation: backend build and 21 auth service tests passed; frontend TypeScript, targeted lint and five auth/client tests passed. An authenticated browser reload should be measured next to confirm one refresh call, zero startup `/auth/me` calls and the time until the first protected query begins.
