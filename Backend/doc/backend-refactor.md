# SkillBridge backend refactor

## Phase status (2026-10-11)

| Phase | Code status | Database/runtime verification |
|---|---|---|
| Schema, roles and authentication | Implemented; Prisma client regenerated | Schema validation and real Better Auth in-memory signup/login tests pass |
| Tutor discovery, profiles and subjects | Implemented | Type-checked; live database test pending |
| Availability and instant bookings | Implemented | Validation tests pass; database constraints/race tests pending |
| Reviews, student profiles and admin management | Implemented | Type-checked; live database test pending |
| Database migration | Replacement SQL saved | Not applied: migration advisory lock held by pooled database session |
| Frontend | Outside this backend refactor | Not implemented here |

The owner authorized removing old development food data, then requested that no
database session be terminated and that migration remain pending.

The inspected development database initially had no public tables. The four original
migrations were subsequently applied. No existing user accounts needed preservation.
The pending replacement migration nevertheless maps `CUSTOMER -> STUDENT`,
`PROVIDER -> TUTOR` and preserves admin/user/account/verification data if present.
It deletes old food reviews, drops cart/meal/order/provider tables, and invalidates
old login sessions. Categories are retained; edit them to actual tutoring subjects.

## Setup and cutover

Use the existing dependencies and Node.js/pnpm environment.

```powershell
pnpm run db:validate
pnpm run db:generate
pnpm run typecheck
pnpm test
pnpm run build
```

Configure `DATABASE_URL` for runtime, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
and `APP_URL` for the intended frontend. Google login is enabled only when both
Google credential variables are configured. R2 credentials are needed only for
category image operations.

For Prisma migrations, configure `DIRECT_URL` with the **same logical database's
direct, non-pooled connection**. Never put either connection value in source control.
[prisma7.config.ts](../prisma7.config.ts) prefers `DIRECT_URL` for migrations;
the runtime Prisma client continues to use `DATABASE_URL`.

Once the existing advisory lock has been safely resolved by the database owner:

```powershell
pnpm run db:deploy
pnpm run db:generate
pnpm run db:seed
```

Do not disable advisory locking or reset the database to work around this blocker.
The pending [migration](../src/prisma/migrations/20261011153000_replace_food_marketplace_with_skillbridge/migration.sql)
uses a transaction, a partial unique active-slot index, valid-time/price/rating checks,
and the PostgreSQL `btree_gist` extension for tutor interval exclusion.
Applying it requires permission to install that extension if it is not already installed.

Admin seeding uses `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`.
It refuses to promote an existing non-admin account sharing that email. Repeated
runs leave an existing admin intact. **Seeding has not been executed during this refactor.**

## Authentication

Better Auth is mounted at `/api/auth`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Register with `name`, `email`, `password`, and optional `role: STUDENT/TUTOR` |
| POST | `/api/auth/sign-in/email` | Email/password login |
| GET | `/api/auth/get-session` | Better Auth session |
| POST | `/api/auth/sign-out` | Sign out |

Omitted signup role defaults to `STUDENT`. `ADMIN`/legacy roles cannot be registered.
Native profile updates cannot change role. Admin assignment is seed-only.
Blocked/suspended accounts cannot start new sessions, and protected application APIs
read current account status/role from the database to enforce moderation on old sessions.

Browser clients must send credentials/cookies and an allowed Origin. Better Auth
uses its native response/error format; application APIs use the existing
`statusCode/success/data/meta` response envelope.

## Application API

All routes below include the `/api` prefix.

| Method | Route | Access |
|---|---|---|
| GET | `/health` | Public |
| GET | `/tutors` | Public |
| GET | `/tutors/:id` | Public |
| GET | `/tutors/:id/availability` | Public |
| GET | `/tutors/:id/reviews` | Public |
| GET | `/categories`, `/categories/:id` | Public |
| GET/PATCH | `/users/me` | Authenticated user |
| GET/PUT | `/tutor/profile` | Tutor |
| GET/PUT | `/tutor/availability` | Tutor |
| POST | `/bookings` | Student |
| GET | `/bookings`, `/bookings/:id` | Own student/tutor bookings; admins can inspect all |
| PATCH | `/bookings/:id/complete` | Owning tutor |
| PATCH | `/bookings/:id/cancel` | Owning student |
| POST | `/reviews` | Student with own completed booking |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/:id` | Admin; body `{ "status": "ACTIVE/BLOCKED/SUSPENDED" }` |
| GET | `/admin/bookings`, `/admin/stats` | Admin |
| DELETE | `/admin/reviews/:id` | Admin moderation |
| GET/POST | `/admin/categories` | Admin |
| GET/PATCH/DELETE | `/admin/categories/:id` | Admin |

Category writes also remain available at `/categories[/:id]` but always require admin.
Old `/cart`, `/meals`, `/order`, `/review`, `/prodivers` routes have been removed.
Empty food-module folders and unused food-era coercion, pagination and responsive-image
helpers have also been removed. Category upload/storage utilities remain in use.
Applied migration history is retained for database cutover.

### Payload examples

Tutor profile `PUT /tutor/profile` creates or replaces profile/subject data:

```json
{
  "headline": "Mathematics tutor",
  "bio": "Experienced teacher of mathematics.",
  "hourlyRate": 25,
  "categoryIds": ["category-cuid"]
}
```

Availability `PUT /tutor/availability`:

```json
{
  "slots": [
    { "startsAt": "2026-12-01T10:00:00Z", "endsAt": "2026-12-01T11:00:00Z" }
  ]
}
```

Booking: `{ "slotId": "slot-cuid" }`.
Review: `{ "bookingId": "booking-cuid", "rating": 5, "comment": "Excellent session." }`.
Self-profile supports `name`, `phone`, `image` (HTTP URL), and `address`;
phone/image/address can be cleared with `null`. Role/status input is rejected.

IDs in examples are placeholders; real tutor/slot/booking/category IDs use CUID.
Prices are stored as Decimal and serialized as strings in database-backed responses.
Tutor-list average ratings/counts are numeric.

### Search and pagination

Tutor query: `search`, `categoryId`, `minPrice`, `maxPrice`, `minRating`,
`sortBy=rating|price|createdAt`, `sortOrder=asc|desc`, `page`, `limit`.
Search matches tutor name/headline/bio and subject names.
Featured tutors can use a limited rating-sorted query; no paid/manual featured model exists.

Booking query: `status`, `period=upcoming|past`, `page`, `limit`.
Admins may additionally filter by `studentId`/`tutorId`.
Upcoming means confirmed sessions that have not ended; past includes terminal
bookings and elapsed sessions. A status filter is combined with that period filter.
Default page is 1, limit is 10; maximum limit is 100.
Tutor reviews and availability use the same page pagination.
Availability supports timezone-aware `from`/`to` start-date bounds.

Category listing retains existing cursor pagination: `cursor`, `limit`, `search`,
`sortBy=name|createdAt`, `sortOrder`. Its legacy response nests the data/meta
inside the response `data` field; this compatibility shape is unchanged.

## Implemented booking policies

Availability follows separate routes/controller/service/validation layers.
Validation middleware parses timestamps and pagination once into typed response
locals; controllers handle HTTP responses, and services resolve profiles and access
the database. Public tutor availability uses the same availability module.

Booking also follows routes/controller/service/validation separation. Routes wire
authorization and validation, controllers handle HTTP responses, and services own
reservation and lifecycle rules. Admin booking listing reuses the booking controller
behind the admin guard. Parsed booking inputs are passed through typed response locals.

Admin follows the same routes/controller/service/validation layers for user moderation,
statistics and review removal. Its service reuses user/review services rather than
duplicating their business rules; statistics queries live in the admin service.
Booking and category endpoints reuse their own modules behind the admin guard.

Review submission and public tutor-review listing also use separate routes,
controller, service and validation layers. Validation parses inputs into typed
response locals; the public review service checks tutor visibility before listing
reviews. Admin review moderation retains its existing admin controller/service flow.

Tutor discovery, details and profile management use the same separated layers.
Tutor routes contain only endpoint/middleware wiring, controllers handle responses,
validation parses typed inputs, and tutor services retain business/database logic.
Availability and review subroutes reuse their respective modules.

User self-profile endpoints follow routes/controller/service/validation separation.
Routes wire authentication and input validation, controllers handle responses, and
services retain profile and moderation rules. Profile edits still reject role/status
fields and derive ownership from the authenticated user.

- Concrete dated timezone-aware slots; PostgreSQL stores UTC-compatible instants.
- Overlapping tutor slots are forbidden; adjacent slots are allowed.
- Availability replacement removes only never-booked slots. Any slot with booking
  history remains immutable, even when cancelled; cancellations free it for rebooking.
- Instant confirmation; only `CONFIRMED -> COMPLETED/CANCELLED` transitions.
- Only owning tutor completes; only owning student cancels.
- No completion/cancellation time cutoff was added because the brief specifies none.
- Reservation operations serialize on the student and tutor database rows.
  Student/tutor overlapping booked sessions are rejected.
- Active/completed slot reservations are unique; cancelled slots may be rebooked.
- Server computes `hourlyRate * durationHours`, rounded to two decimal places,
  and snapshots the price. No payment processing is implemented.
- One review per completed booking, enforced with a database unique constraint.
- Public tutor discovery excludes non-active/non-tutor users.
- Ban/unban changes access but does not automatically cancel existing bookings.
- Admin accounts cannot be banned through the user-moderation endpoint.

## Verification

Validated in this refactor:

- Prisma replacement schema validates; local client generated.
- TypeScript check passes.
- Eight database-free tests pass, including native Better Auth signup, role-change
  rejection, login ban/suspension, validation and forged-input checks.
- Production bundle builds successfully.
- Ephemeral HTTP smoke checks pass: `/api/health` returns 200, anonymous
  `/api/users/me` returns 401, removed `/api/meals` returns 404. The test server
  was closed afterward.

Booking validation and database integration test files were subsequently removed
at the owner's request. The historical eight-test result above predates that removal.
`pnpm test` now runs only authentication policy and in-memory authentication tests;
the booking `test:integration` command has been removed.

The migration itself, admin seed, booking concurrency constraints, live tutoring API
journeys and frontend browser behavior remain unverified until cutover is allowed.
