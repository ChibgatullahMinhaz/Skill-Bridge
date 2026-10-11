# SkillBridge: Existing Codebase vs Project Requirements

> Historical pre-refactor audit. Several referenced food modules have since been
> replaced or removed. See [current implementation and migration status](backend-refactor.md).

Date: 2026-10-11  
Scope: Backend code in this repository, compared with the project brief supplied in chat.  
Purpose: Identify **where changes are needed, what to change, and why**. This is an implementation checklist, not an implementation or a database migration.

## 1. Main finding

The current backend is predominantly a **food marketplace**, despite the SkillBridge branding in the [repository README](../../README.md).

- Roles: `CUSTOMER`, `PROVIDER`, `ADMIN`.
- Domain models: `ProviderProfile`, `Meal`, `Cart`, `CartItem`, `Order`, `OrderItem`.
- Existing business flows: restaurant applications, menu browsing, cart checkout, delivery orders, meal reviews.
- Missing tutoring models/flows: tutor subjects, dated availability, student-tutor bookings, teaching-session completion, completed-session reviews.

**Renaming Customer to Student and Provider to Tutor is not enough.** Authentication and shared infrastructure can be reused, but the marketplace data model and business rules need to be replaced.

Only a backend directory and the root README were found at the repository root. The frontend pages listed in the brief are therefore **not implemented in the inspected repository**, not merely missing backend routes.

### Requirement precedence

The supplied brief is the reference for this report:

- Registration must allow `STUDENT` or `TUTOR`; admins must be seeded.
- Booking begins at `CONFIRMED`, then the tutor completes it or the student cancels it.
- API and page paths in the brief are examples, not mandatory exact names.
- The README additionally describes pending bookings and tutor verification. These are **scope differences requiring a decision**, not requirements to silently add.
- The actual README lists TypeScript, Node.js/Express, PostgreSQL, and Prisma. It does not currently contain the submission timeline/marks/guidelines referenced in the brief.

## 2. Feature coverage

| Requirement | Current coverage | Required change and reason |
|---|---|---|
| Student/tutor registration | Partial: Better Auth exists, but defaults to `CUSTOMER` and does not accept role input | Add validated student/tutor selection; do not use restaurant approval to choose the tutor role |
| Login/current user | Partial: auth handler and protected profile lookup exist | Confirm and document the Better Auth contract; expose a consistent current-user profile with the new role |
| Browse/search tutors | Missing: public meals and individual provider details are not tutor discovery | Add public tutor list with subject/category/rating/price filters |
| Detailed tutor profile and reviews | Partial reusable listing/review patterns only | Return tutor bio, subjects, price, availability, review count, average rating and paginated reviews |
| Landing page/featured tutors | Missing | Add frontend landing page and a defined featured-tutor query/selection policy |
| Student profile management | Partial: self-update only supports name; current profile omits phone/image | Add an ownership-scoped profile contract and relevant editable fields |
| Create/update tutor profile | Missing tutoring flow: provider application is restaurant-specific | Add tutor-owned profile creation/update and subject management |
| Set/view availability | Missing | Add storage, validation and APIs for bookable time slots |
| Instant booking | Missing: existing checkout creates delivery orders | Add direct, atomic booking of an available tutor slot |
| Upcoming/past student bookings | Partial order-history pattern only | Query bookings by student, session time and status |
| Tutor teaching sessions/completion | Partial provider-order pattern only | Query tutor bookings and enforce tutor-owned completion |
| Reviews after sessions | Not satisfied: reviews target meals and order linkage is optional | Require the student's own completed booking |
| Admin user listing/status | Partial: endpoints and session deletion exist | Update roles, field selections, ID validation and active-session enforcement |
| Admin all bookings | Missing tutoring data, reusable admin-order listing pattern | Add a separately protected all-bookings query |
| Admin category management | Partial: category CRUD exists, categories belong to meals, providers can create | Link to tutor subjects/categories and make category writes admin-only |
| Admin analytics/content moderation | Partial review deletion, food-order user statistics | Add tutoring statistics and define moderation scope |
| Frontend pages and role-based navigation | Missing from inspected repository | Implement the public/student/tutor/admin UI in a frontend project |

## 3. Database changes

Priority: **P0 = foundational/blocking**, **P1 = required feature**, **P2 = supporting quality/documentation**.

| Priority | Existing location | What to change | Why |
|---|---|---|---|
| P0 | [base.prisma](../src/prisma/schema/base.prisma) | Replace `CUSTOMER/PROVIDER` with `STUDENT/TUTOR`; replace delivery `OrderStatus` with `BookingStatus { CONFIRMED, COMPLETED, CANCELLED }` | Roles and session lifecycle must match the brief |
| P0 | [auth.prisma](../src/prisma/schema/auth.prisma) | Default role to `STUDENT`; replace food-domain relations with tutor profile, student bookings, tutor bookings and student reviews | A user can be a learner or teacher rather than a restaurant customer |
| P0 | [provider.prisma](../src/prisma/schema/provider.prisma) | Replace `ProviderProfile` with `TutorProfile`: unique `userId`, bio/headline, hourly rate, teaching subjects/categories and timestamps; decide additional qualification/experience fields | Restaurant name, cuisine type and `isOpen` do not represent a tutor |
| P0 | New availability schema under [schema](../src/prisma/schema) | Add tutor-linked dated slots with `startsAt`, `endsAt` and timestamps; index tutor/time; define slot identity and overlap rules | Availability must be persisted and checked during bookings |
| P0 | [order.prisma](../src/prisma/schema/order.prisma) | Replace `Order/OrderItem` with `Booking`: student, tutor profile, availability slot/session interval, status, agreed price, timestamps | A tutoring session is not a multi-item delivery order |
| P1 | [category.prisma](../src/prisma/schema/category.prisma) | Retain reusable category name/slug/image; replace `meals` relation with tutor-subject/category relations | Tutor discovery and subject management require category linkage |
| P1 | [review.prisma](../src/prisma/schema/review.prisma) | Replace `customerId/mealId/orderId` with required booking linkage and student/tutor relations as needed; enforce one review per booking if that policy is accepted | Reviews must prove attendance/completion and target a tutor |
| P0 | [meal.prisma](../src/prisma/schema/meal.prisma), [cart.prisma](../src/prisma/schema/cart.prisma) | Retire food/menu/cart models after migration and caller replacement | Meals, dietary preferences, cart quantities and checkout are outside the tutoring brief |
| P0 | [migrations](../src/prisma/migrations), [generated Prisma client](../src/prisma/generated/prisma) | Create reviewed migrations; regenerate the client from the updated schema; never manually patch generated types | Database schema, generated client and service queries must agree |

### Recommended schema choices, not extra product requirements

- Keep Better Auth's `Session`, `Account`, and `Verification` models. An auth `Session` is **not** a teaching booking.
- Use named Prisma relations for student bookings versus tutor bookings to avoid ambiguous links to users.
- Start with concrete dated slots. Recurring weekly availability is optional unless explicitly requested.
- Use a join model if tutors teach multiple subjects/categories; do not mechanically convert each meal into a subject.
- Prefer `Decimal` or integer minor units for prices; snapshot the agreed booking price so later rate changes do not rewrite history.
- Preserve booking/review history when users or categories are moderated; define deletion/archive behavior before setting cascades.
- Add database constraints for valid time ranges and reservation uniqueness where appropriate. Application validation alone does not protect concurrent requests.
- Exact slot uniqueness does not prevent two differently identified slots from overlapping. Enforce tutor interval rules as well.
- If cancellation frees a slot, do not use a permanent unique `slotId` constraint that also prevents rebooking after cancellation; design an active-reservation constraint/record appropriately.
- Do not store independently writable booking/tutor/student IDs on a review without ensuring they all refer to the same booking.

## 4. Authentication, roles and user profiles

| Priority | Files | Change needed | Reason |
|---|---|---|---|
| P0 | [auth.ts](../src/lib/auth.ts) | Replace `Role.CUSTOMER` default; allow registration role through server-validated logic restricted to `STUDENT/TUTOR`; retain server-only admin assignment | Current `role.input: false` prevents the role-selection journey |
| P0 | [provider.service.ts](../src/modules/provider/provider.service.ts) | Remove approval-driven `CUSTOMER -> PROVIDER` promotion from the standard tutor registration flow | The user selects tutor at registration; verification, if retained, is a separate profile state |
| P0 | [auth.middleware.ts](../src/middlewares/auth.middleware.ts), [Express request types](../src/types/index.d.ts) | Update role types; obtain reliable role/status data; enforce inactive status for existing sessions, not just new logins; make optional auth distinguish anonymous requests from errors | Admin ban/unban must consistently affect access |
| P1 | [users.routes.ts](../src/modules/users/users.routes.ts), [users.controller.ts](../src/modules/users/users.controller.ts), [user.validation.ts](../src/modules/users/user.validation.ts) | Separate admin status management from `GET/PATCH /users/me` or equivalent self-profile APIs; allow only intended self-edit fields | Current self-service shares an admin route and silently removes `role/status` from non-admin updates |
| P1 | [users.service.ts](../src/modules/users/users.service.ts), [users.interface.ts](../src/modules/users/users.interface.ts) | Return useful profile fields; replace provider/order projections and statistics with tutor/booking data; update role filters | Students and admins need tutoring data, not store/order statistics |
| P0 | [seedAdmin.ts](../src/script/seedAdmin.ts), [package.json](../package.json) | Wire a dedicated executable seed entry/script or Prisma seed configuration; make repeated runs verify the configured account is actually admin | The seed function exists, but no invocation was found; an existing email currently skips without checking its role |

### Existing auth behavior to preserve

- Reuse Better Auth password/session handling rather than introducing a second password/authentication system.
- Reuse authenticated ownership checks and admin guards, updating their domain roles.
- Keep the existing practice of deleting sessions when an admin blocks/suspends a user.
- `BLOCKED` and `SUSPENDED` can be retained instead of adding a separate `BANNED` enum if their meaning is documented and consistently enforced.

### API contract decision

[app.ts](../src/app.ts) delegates `/api/auth/*splat` to Better Auth; it does not define custom `/register`, `/login`, or `/me` handlers. Those example routes must not be advertised as already implemented.

Choose either:

1. Use and document the Better Auth native signup/signin/session API, with the required role-selection integration.
2. Provide carefully scoped aliases/custom endpoints for the brief's example contract.

Do not mount custom aliases behind a wildcard that already handles those requests. Update the frontend client and docs together.

## 5. Tutor profiles, discovery and availability

### Replace the provider and meal surfaces

Primary existing files:

- [provider routes](../src/modules/provider/provider.routes.ts), [controller](../src/modules/provider/provider.controller.ts), [service](../src/modules/provider/provider.service.ts), [validation](../src/modules/provider/provider.validation.ts).
- [meal routes](../src/modules/meal/meal.routes.ts), [controller](../src/modules/meal/meal.controller.ts), [service](../src/modules/meal/meal.service.ts), [validation](../src/modules/meal/meal.validation.ts).

Required changes:

1. Create tutor profile routes/controller/service/validation following the existing module pattern.
2. Allow a `TUTOR` to create/update only their own profile. Define behavior when the profile does not yet exist.
3. Replace restaurant/cuisine/meal fields and validations with tutor bio, rate and teaching categories/subjects.
4. Add public list/detail APIs. The existing provider list is admin-only; its public detail includes meals rather than a tutor profile.
5. Reuse price/category/search patterns from meal browsing, but apply them to tutors. Add rating filtering/sorting and review aggregates.
6. Validate price range ordering, finite numeric values, rating bounds, category existence and bounded pagination.
7. Define a stable sort with an ID tie-breaker and matching cursor semantics. Existing `limit + 1` implementations use the discarded extra row as the next cursor, then skip it on the next request; do not copy this row-skipping pattern.
8. Public tutor results should exclude accounts banned from offering sessions and profiles not publishable under the chosen policy.
9. Define a public-safe response shape rather than exposing all user/contact/internal fields.
10. Decide how featured tutors are selected; a query parameter or reuse of a sorted list can be enough, without a new model.

### New availability module: P0

Add routes/controller/service/validation under `src/modules/availability` or the tutor module.

- Tutor-owned create/replace/update availability, plus a public query of bookable slots.
- Validate timezone-aware input, `startsAt < endsAt`, future slot rules and duplicate/overlapping intervals.
- Store instants consistently, normally in UTC, and return timezone-aware timestamps.
- Do not allow availability edits to invalidate an existing confirmed booking; reject conflicting changes or use an explicitly approved rescheduling flow.
- Make replacement operations atomic so a partial update cannot erase valid slots or existing reservations.
- Return available slots based on active reservations, not only a boolean like `isOpen`.

**Reason:** tutor availability and student instant-booking cannot be implemented from restaurant opening flags.

## 6. Bookings and session lifecycle

Primary replacement surface: [order routes](../src/modules/order/order.routes.ts), [controller](../src/modules/order/order.controller.ts), [service](../src/modules/order/order.service.ts), [validation](../src/modules/order/order.validation.ts).

Create a booking module with:

| Operation | Permission and rule |
|---|---|
| Create booking | Student only; authenticated student ID comes from the session; tutor/slot must be valid and bookable |
| List bookings | Students see their own learning sessions; tutors see their own teaching sessions |
| Booking details | Only the owning student, owning tutor or admin |
| Complete booking | Owning tutor only; `CONFIRMED -> COMPLETED`, subject to the agreed time rule |
| Cancel booking | Owning student only; `CONFIRMED -> CANCELLED`, subject to the agreed cancellation policy |
| All bookings | Admin only; separate filters/pagination for platform-wide inspection |

Core changes and reasons:

- Create bookings directly from a tutor/slot selection. Remove cart checkout, delivery address, cash-on-delivery and order-item quantity requirements.
- Default to `CONFIRMED`; do not keep `PLACED/PREPARING/READY/DELIVERED`.
- Reserve atomically at database level. Two simultaneous requests for the same slot must produce one booking and one explicit conflict, not two confirmations.
- Guard against tutor overlap even if two different availability IDs represent overlapping times.
- Consider student-overlap prevention as a recommended policy; confirm it before implementing.
- Enforce allowed transitions, actor ownership and the expected current status in the database operation. Existing order status updates accept any enum state without transition rules.
- Preserve terminal states: no reopening or completing a cancelled booking without an explicitly approved extension.
- Add status/time filters for upcoming/past bookings; do not equate all confirmed records with future sessions.
- Calculate any charge server-side from the rate/duration policy; do not trust a client-supplied total.
- Return explicit invalid-slot, permission and reservation-conflict errors using the existing response/error infrastructure.

## 7. Reviews and ratings

Files: [review schema](../src/prisma/schema/review.prisma), [routes](../src/modules/review/review.routes.ts), [controller](../src/modules/review/review.controller.ts), [service](../src/modules/review/review.service.ts), [validation](../src/modules/review/review.validation.ts).

Required changes:

1. Replace meal/provider review queries with tutor review queries.
2. Require `bookingId` for creation. Derive the student and tutor from the authenticated user and the booking.
3. Require the booking to belong to that student and have status `COMPLETED`.
4. Reject reviews for upcoming, merely confirmed or cancelled sessions.
5. Enforce the accepted duplicate policy in the database, not only through `findFirst`.
6. Reuse the existing integer rating range `1..5`, comment validation and rating aggregation.
7. Ensure tutor detail/list/rating filters use the same review population and aggregation policy.
8. Reuse admin review deletion if it satisfies the chosen content-moderation scope; review editing/deletion beyond the brief is optional.

**Reason:** the existing service permits creation without an order and never checks order completion, so it cannot prove a completed tutoring session.

## 8. Categories, admin APIs and analytics

- [Category routes](../src/modules/category/category.routes.ts): make category creation/update/deletion admin-only; creation currently allows `PROVIDER`.
- [Category service](../src/modules/category/category.service.ts): replace meal counts/deletion guards with tutor-subject relation counts/guards.
- [Category validation](../src/modules/category/category.validation.ts): standardize ID format and bound/validate pagination; honor the documented `sortBy` or remove it from the contract.
- [User admin module](../src/modules/users): update listing/status/profile-statistics logic for `STUDENT/TUTOR`.
- Add an admin all-bookings route and service query rather than relying on a provider-food-order endpoint.
- Add tutoring analytics appropriate to the overview: user counts by role/status, booking counts by state and session totals. Revenue analytics depend on a defined payment/pricing model and are not automatically required.
- Define which content admins moderate beyond reviews. Tutor-profile moderation and verification are separate policy choices.

## 9. Route wiring and obsolete modules

File: [routes/index.ts](../src/routes/index.ts).

Current mounted paths include `/api/prodivers` (typo), `/api/meals`, `/api/cart`, `/api/order`, `/api/review`, `/api/category`, and `/api/admin/users`.

Suggested target contract, adapting the brief where useful:

| Method | Suggested endpoint | Purpose |
|---|---|---|
| GET | `/api/tutors` | Public discovery/filtering |
| GET | `/api/tutors/:id` | Public tutor details |
| GET | `/api/tutors/:id/availability` | Bookable slots |
| GET | `/api/tutors/:id/reviews` | Paginated tutor feedback |
| GET | `/api/categories` | Public subjects/categories |
| GET/PATCH | `/api/users/me` | Current user's profile |
| POST/PUT | `/api/tutor/profile` | Tutor profile creation/update; choose and document semantics |
| GET/PUT | `/api/tutor/availability` | Tutor's availability management |
| POST/GET | `/api/bookings` | Create/list role-scoped bookings |
| GET | `/api/bookings/:id` | Protected booking details |
| PATCH | `/api/bookings/:id/complete` | Tutor completion |
| PATCH | `/api/bookings/:id/cancel` | Student cancellation |
| POST | `/api/reviews` | Completed-booking review |
| GET | `/api/admin/users` | Admin user list |
| PATCH | `/api/admin/users/:id` | Admin ban/unban/status change |
| GET | `/api/admin/bookings` | All bookings |
| POST/PATCH/DELETE | `/api/admin/categories[/:id]` | Admin category writes |
| GET | `/api/admin/stats` | Chosen platform statistics |

Keep `/api/health`. Authentication endpoints depend on the contract choice in section 4.

Retire [cart](../src/modules/cart), [meal](../src/modules/meal), [order](../src/modules/order), and food-specific [provider](../src/modules/provider) surfaces only after their tutoring replacements and any callers are migrated. Do not leave old routes accessible against a schema that no longer supports them.

## 10. Shared infrastructure and coupled inconsistencies

These are directly relevant to the conversion, not a general refactoring backlog.

| Location | Change/check | Reason |
|---|---|---|
| [users.service.ts](../src/modules/users/users.service.ts) | Reconcile `isEmailVerified`, `storeName`, `isApproved` selections with actual schema fields (`emailVerified`, `restaurantName`, `status`) while replacing the food projections | Existing source queries and schema are inconsistent |
| [provider.service.ts](../src/modules/provider/provider.service.ts), [order.service.ts](../src/modules/order/order.service.ts) | Retire stale `meal.image` selections; current meal schema uses `images` | Do not carry stale projections into tutor responses |
| [meal.service.ts](../src/modules/meal/meal.service.ts), [meal.prisma](../src/prisma/schema/meal.prisma) | Do not reuse the create operation unchanged: schema requires `preparationTime`, but create does not supply it | Renaming the module would retain incompatible required data |
| [user.validation.ts](../src/modules/users/user.validation.ts), [category.validation.ts](../src/modules/category/category.validation.ts) | Align ID validators with actual generated IDs; users declare `cuid()` but params require UUID; category update uses CUID2 while schema/default and other validators use CUID | Valid records must not be rejected by endpoint validation |
| [auth.middleware.ts](../src/middlewares/auth.middleware.ts), [auth.ts](../src/lib/auth.ts) | Resolve new-login vs existing-session status differences; required auth checks only blocked, hooks check blocked/suspended, status is assumed through a cast | Ban/unban and role enforcement require reliable, consistent account state |
| [validateRequest.ts](../src/middlewares/validateRequest.ts), controllers, [request types](../src/types/index.d.ts) | Preserve Express 5 query handling while using actual validated/auth-inferred types instead of spreading `any` or double casts into new modules | New booking/time/filter inputs need end-to-end type safety |
| [storageKey.ts](../src/utils/storageKey.ts), [image utilities](../src/utils) | Reuse upload/resize/storage utilities; introduce tutor/avatar key naming only if images are retained; distinguish persisted storage keys from returned URLs | Restaurant/meal image paths should not define tutor uploads |
| [origin.ts](../src/constants/origin.ts), [auth.ts](../src/lib/auth.ts), [env.ts](../src/config/env.ts) | Replace legacy shop origins with intended SkillBridge origins; align CORS and Better Auth trusted-origin/cookie configuration | Browser session authentication must work with the actual frontend deployment |
| [app.ts](../src/app.ts) | Replace duplicate JSON/urlencoded parsers with one intentional configuration per format, preserving auth-handler ordering | The earlier parser can consume the body before the later 50 MB setting takes effect |
| [prisma7.config.ts](../prisma7.config.ts), [package.json](../package.json) | Ensure Prisma scripts explicitly resolve this nonstandard config filename, or use the standard discovered name; wire admin seeding | Schema lives in a multi-file custom directory, not the default root Prisma directory |
| [handlePrismaError.ts](../src/errors/handlePrismaError.ts) | Map booking reservation/uniqueness conflicts appropriately, typically HTTP 409; keep unexpected transaction failures explicit | Concurrent booking failure must not look like a success or a generic validation error |

### Environment handling

No `.env` values were read or copied into this document. Deployment/database contents were not inspected.

Before implementation, verify intended `DATABASE_URL`, auth URL/secret, frontend origin, optional Google login, admin seed configuration and optional image-storage settings through safe configuration checks. Add a placeholder-only `.env.example` if configuration setup is documented. Do not place credentials in documentation.

## 11. Frontend work outside the current backend

The following pages still need implementation in a frontend project:

- Public: home/featured tutors, filtered tutor browser, tutor details/reviews/available-slot booking, login, registration with role selection.
- Student: dashboard, upcoming/past bookings, cancellation/review actions, self-profile editing.
- Tutor: dashboard/session list, completion action, profile/subject editor, availability editor.
- Admin: statistics, users and ban/unban, all bookings, category management and agreed moderation controls.

Frontend route guards are not a replacement for backend authorization. Wire every action to the documented backend contract and handle validation, unavailable-slot and permission errors visibly.

No frontend framework is mandated by the inspected README; choose it separately rather than assuming a stack.

## 12. Decisions to confirm before implementation

| Decision | Recommended starting point | Why confirmation matters |
|---|---|---|
| Pending bookings from README vs instant confirmation from brief | Use `CONFIRMED` immediately | Adding pending approval changes the stated booking journey |
| Tutor verification | Optional separate profile state, not registration-role promotion | Mandatory approval is not required in the supplied brief |
| Availability format | Concrete dated UTC slots | Recurring schedules/timezone rules significantly change schema and UI |
| Session duration and pricing | Explicit interval and server-calculated agreed price | Hourly vs fixed-session pricing changes booking validation |
| Cancellation/completion time rules | Define cutoffs and when completion is allowed | The brief names actors/states but not timing restrictions |
| Availability edits affecting bookings | Reject conflicts with confirmed bookings | Rescheduling requires a separate product flow |
| Review frequency | One review per completed booking | Must distinguish per-booking from lifetime per-tutor restrictions |
| Featured tutors | Reuse a defined ranked query initially | Avoid adding paid promotion/manual curation without a requirement |
| Subject/category model | Multiple categories/subjects per tutor if needed | Tutor subject management must match intended search behavior |
| Ban effect on future bookings | Decide whether sessions remain, are cancelled or require intervention | Disabling account access does not settle booked-session obligations |
| Existing food data and client compatibility | Inspect and back up before choosing migration/cutover | Food records cannot be honestly converted into attended tutoring sessions |

Payments, video meetings, notifications, recurring schedules, refunds and paid featuring are **not mandatory features in the supplied brief**. Do not add them as automatic scope.

## 13. Implementation order

1. Confirm the decisions above and identify whether existing database data/clients must be preserved.
2. Implement the new schema, reviewed migration strategy and regenerated Prisma client.
3. Update authentication roles, registration, account status enforcement and runnable admin seed.
4. Implement tutor profile/subject management and public discovery.
5. Implement dated availability and atomic reservations.
6. Implement role-scoped bookings and guarded completion/cancellation.
7. Implement completed-booking reviews and tutor rating aggregation.
8. Adapt categories, admin users/all-bookings/statistics and student self-profile.
9. Wire routes, retire old food surfaces, and update API/configuration documentation.
10. Build the frontend journeys against the finalized contract and run end-to-end acceptance checks.

Do not reset a database or rewrite applied migration history merely to simplify this conversion. For disposable development data, a clean rebuild is an option only after explicit confirmation. For retained data, plan an additive migration and controlled cutover.

## 14. Verification and definition of done

### Baseline observed during this audit

- Local TypeScript command `.\node_modules\.bin\tsc.cmd --noEmit` completed with exit code 0 and no diagnostics.
- That does **not** prove Prisma source queries match the live database or that tutoring features exist. The source/schema inconsistencies listed above still need reconciliation and runtime validation.
- [package.json](../package.json) has a placeholder failing `test` script; no test/spec files were found under `src`.
- No application startup, database migration/reset, signup, seed operation, or live API test was performed.

### Required tests after implementation

| Area | Acceptance check |
|---|---|
| Registration | Both student and tutor can register; attempted admin signup is rejected; login/current-user returns the correct role |
| Admin seed | A configured admin is created; repeat execution is idempotent and verifies role; failures are explicit |
| Authorization | Wrong-role and unrelated-user requests fail for profile, availability, booking, completion, cancellation and admin writes |
| Ban/unban | Banned/suspended users cannot access protected operations with old or new sessions; unbanned users can log in again |
| Discovery | Combined subject/category/rating/price filters return correct tutors; invalid ranges fail; pagination does not skip or repeat records |
| Availability | Invalid/past/overlapping slots fail according to policy; confirmed reservations survive attempted conflicting edits |
| Booking race | Two concurrent requests for one slot yield exactly one confirmed booking and an explicit conflict |
| Interval conflicts | Overlapping tutor sessions cannot be booked through different slot IDs |
| Booking history | Student/tutor/admin queries return the right ownership scope and correct upcoming/past classifications |
| Lifecycle | Only owning tutor completes and owning student cancels; completed/cancelled bookings cannot take invalid transitions |
| Reviews | Only owner of a completed booking can review; duplicate attempts, including concurrent ones, cannot create extra reviews |
| Ratings | Aggregate counts/averages and rating filtering use consistent data after review creation/moderation |
| Categories | Public reads work; only admins write; linked-category deletion follows the defined policy |
| Browser auth | Frontend-origin CORS, trusted origins and cookie settings work together in intended deployments |
| Migration/build | Prisma schema validates, migrations apply to a development database, client regenerates, type-check/build pass |
| Frontend journeys | Student browse-book-complete-review, tutor profile-availability-complete and admin management work end to end |

### Documentation updates when features are implemented

- Update the [README](../../README.md) to distinguish implemented features from planned ones and resolve pending-booking/verification differences.
- Document actual auth/API endpoints, payloads, error responses, roles and booking/availability rules.
- Document database migration/client-generation/admin-seed commands and safe environment setup.
- Add frontend setup/deployment instructions when that project exists.
- Add submission requirements only from an authoritative assignment source; the current README does not contain them.

**Summary:** reuse Express, Better Auth, Prisma, validation/response/error helpers and appropriate upload utilities. Replace the food-domain schema and flows with tutor profiles, availability, instant bookings and completed-session reviews; update every related role, route, query, admin view and frontend journey together.
