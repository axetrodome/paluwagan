@AGENTS.md
# Paluwagan Manager

A mobile application for managing and tracking informal group savings
("Paluwagan") in the Philippines.

The application is a **record-keeping and management tool**. It does not
hold, transfer, or process users' money.

---

# 1. Project Overview

Paluwagan Manager allows a group organizer to create and manage a
Paluwagan group.

The application helps organizers and members track:

- Members
- Contribution amounts
- Contribution schedules
- Payment status
- Payout order
- Payout schedules
- Payment history
- Proof of payment
- Reminders
- Group summaries
- Reports

The primary goal is to make Paluwagan management easier, transparent,
and less dependent on spreadsheets, notebooks, and chat messages.

---

# 2. Important Product Rule

Paluwagan Manager is NOT a financial wallet.

The application must NOT:

- Hold user funds
- Transfer money between users
- Process GCash payments
- Process Maya payments
- Connect to users' bank accounts
- Act as an escrow service
- Automatically move money

The application only records and manages transactions reported by users.

For example:

A member pays the organizer through GCash.

The application only records:

    Member: Juan
    Amount: ₱1,000
    Status: Paid
    Date: August 20, 2026
    Proof: uploaded screenshot

The actual payment happens outside the application.

---

# 3. Target Users

## Organizer

The person who creates and manages a Paluwagan.

Organizer capabilities:

- Create Paluwagan
- Invite members
- Remove members
- Configure contribution amount
- Configure contribution frequency
- Configure start date
- Configure payout order
- Record payments
- Approve payment records
- View outstanding payments
- View payout schedule
- Send reminders
- View reports

## Member

A person participating in a Paluwagan.

Member capabilities:

- View joined Paluwagans
- View contribution schedule
- View personal payment history
- View payment status
- Upload proof of payment
- View payout position
- View payout history

Members should NOT be able to modify the Paluwagan configuration unless
explicitly granted permission by the organizer.

---

# 4. MVP

The first version should remain simple.

## MVP Features

### Authentication

- Google Sign-In
- Email/password authentication
- Logout
- Password reset
- Email verification if required by Supabase

### Paluwagan

- Create Paluwagan
- Edit Paluwagan
- Archive Paluwagan
- View Paluwagan
- Join Paluwagan through invitation
- View members

### Contributions

- Record contribution
- View contribution history
- Paid status
- Partial status
- Unpaid status
- Overdue status
- Contribution amount
- Contribution due date

### Payouts

- Configure payout order
- View next recipient
- View payout schedule
- Mark payout as completed
- View payout history

### Payment Proof

- Upload payment screenshot
- View payment proof
- Organizer can verify payment

### Dashboard

Show:

- Total members
- Current contribution amount
- Total expected
- Total collected
- Outstanding amount
- Next contribution deadline
- Next payout recipient

---

# 5. Future Features

Do NOT implement these unless explicitly requested.

Potential future features:

- Push notifications
- Automatic contribution reminders
- CSV export
- PDF reports
- Multiple organizers
- Advanced analytics
- Recurring schedules
- GCash integration
- Maya integration
- Subscription plans
- Premium features
- Multiple currencies
- Multi-language support
- Dark mode
- Audit logs
- Dispute handling

The MVP should be completed before implementing these features.

---

# 6. Technology Stack

## Mobile

React Native

Use Expo for development and builds.

Recommended:

- React Native
- Expo
- Expo Router

Do not use React Native CLI unless there is a specific technical reason.

---

# 7. UI / Design

Use:

- NativeWind
- React Native components
- Custom reusable components

The application should have a clean, modern, friendly Filipino fintech-inspired
visual style.

Do NOT make the application look overly corporate.

The UI should prioritize:

- Readability
- Large touch targets
- Clear payment status
- Simple navigation
- Minimal clutter
- Easy-to-understand financial information

Use Philippine Peso formatting:

    ₱1,000.00

Dates should use a human-friendly format.

Example:

    August 20, 2026

---

# 8. State Management

Use Zustand for client-side state where necessary.

Do NOT put every piece of application data into global state.

Prefer:

- Local component state for temporary UI state
- React Hook Form for forms
- Supabase for persistent data
- Zustand for shared application state

Avoid unnecessary global state.

---

# 9. Forms and Validation

Use:

- React Hook Form
- Zod

All user input must be validated.

Examples:

Contribution amount:

- Must be greater than 0
- Must be a valid number

Paluwagan name:

- Required
- Reasonable maximum length

Email:

- Must be a valid email

Never rely only on client-side validation.

Important validation should also be enforced by the database or backend.

---

# 10. Backend

Use Supabase.

Supabase services:

- Supabase Auth
- PostgreSQL
- Supabase Storage
- Supabase Edge Functions when necessary

Do NOT create a separate backend API unless there is a clear reason.

Avoid creating unnecessary infrastructure.

---

# 11. Database

Use PostgreSQL through Supabase.

Initial database entities:

    profiles
    paluwagans
    paluwagan_members
    contributions
    payouts
    invitations
    payment_proofs

---

# 12. Database Structure

## profiles

Stores application user information.

Suggested fields:

    id
    full_name
    email
    avatar_url
    created_at
    updated_at

The `id` should reference the authenticated Supabase user.

---

## paluwagans

Stores Paluwagan groups.

Suggested fields:

    id
    name
    description
    contribution_amount
    frequency
    start_date
    status
    created_by
    created_at
    updated_at

Possible frequency values:

    weekly
    biweekly
    monthly

Possible status values:

    active
    completed
    archived

---

## paluwagan_members

Connects users to Paluwagan groups.

Suggested fields:

    id
    paluwagan_id
    user_id
    display_name
    payout_position
    role
    status
    joined_at

Possible roles:

    organizer
    member

Possible status:

    active
    removed
    pending

A user should not have duplicate active membership in the same
Paluwagan.

---

## contributions

Stores expected and recorded contributions.

Suggested fields:

    id
    paluwagan_id
    member_id
    amount
    due_date
    paid_at
    status
    notes
    created_at
    updated_at

Possible status:

    unpaid
    partial
    paid
    overdue
    waived

---

## payouts

Stores payout information.

Suggested fields:

    id
    paluwagan_id
    member_id
    payout_position
    amount
    scheduled_date
    paid_at
    status
    notes
    created_at
    updated_at

Possible status:

    pending
    completed
    skipped
    cancelled

---

## invitations

Stores invitations to Paluwagan groups.

Suggested fields:

    id
    paluwagan_id
    email
    invited_by
    token
    status
    expires_at
    created_at

Possible status:

    pending
    accepted
    expired
    cancelled

---

## payment_proofs

Stores uploaded proof of payment.

Suggested fields:

    id
    contribution_id
    uploaded_by
    storage_path
    status
    reviewed_by
    reviewed_at
    created_at

Possible status:

    pending
    approved
    rejected

---

# 13. Database Security

Supabase Row Level Security (RLS) must be enabled.

Never expose database access without appropriate authorization.

Users should only be able to access data they are authorized to access.

Examples:

A member can:

- View Paluwagans they belong to
- View their own contributions
- Upload their own payment proof
- View their own payout information

An organizer can:

- Manage their own Paluwagan
- Manage members of their Paluwagan
- View contributions of members in their Paluwagan
- Review payment proofs
- Manage payout schedules

Users must NOT be able to access unrelated Paluwagan data.

---

# 14. Security Rules

NEVER:

- Hardcode Supabase service-role keys in the mobile app
- Store passwords manually
- Store sensitive secrets in source code
- Trust client-provided organizer IDs
- Trust client-provided user IDs
- Disable RLS for convenience
- Use service-role credentials in React Native

Only public/client-safe Supabase configuration may be included in the
mobile application.

Sensitive operations should be performed through secure backend
mechanisms such as Supabase Edge Functions.

---

# 15. Authentication Flow

Expected flow:

    App
     |
     +-- Google Sign-In
     |
     +-- Email/Password
     |
     v
    Supabase Auth
     |
     v
    Authenticated User
     |
     v
    profiles

After authentication, the application should create or update the
corresponding profile record if necessary.

---

# 16. Application Navigation

Use Expo Router.

Suggested structure:

    app/
    ├── _layout.tsx
    │
    ├── (auth)/
    │   ├── login.tsx
    │   ├── register.tsx
    │   └── forgot-password.tsx
    │
    ├── (tabs)/
    │   ├── _layout.tsx
    │   ├── index.tsx
    │   ├── paluwagans.tsx
    │   ├── notifications.tsx
    │   └── profile.tsx
    │
    ├── paluwagan/
    │   ├── [id].tsx
    │   ├── create.tsx
    │   ├── members.tsx
    │   ├── contributions.tsx
    │   └── payouts.tsx
    │
    └── contribution/
        └── [id].tsx

The exact structure can be changed if there is a strong reason.

---

# 17. Suggested Project Structure

    src/
    ├── components/
    │   ├── ui/
    │   ├── paluwagan/
    │   ├── contributions/
    │   └── members/
    │
    ├── hooks/
    │
    ├── lib/
    │   ├── supabase.ts
    │   ├── validation/
    │   └── utils/
    │
    ├── services/
    │   ├── auth/
    │   ├── paluwagan/
    │   ├── contributions/
    │   └── payouts/
    │
    ├── stores/
    │
    ├── types/
    │
    └── constants/

Use clear separation between:

- UI
- Business logic
- Database access
- Validation
- State management

---

# 18. Supabase Client

Create a single Supabase client.

Do not create multiple Supabase client instances throughout the
application.

Example conceptual structure:

    src/lib/supabase.ts

All database access should go through well-defined services or hooks.

Avoid writing large Supabase queries directly inside UI components.

Bad:

    Component
       |
       +-- supabase.from(...)

Prefer:

    Component
       |
       v
    Hook / Service
       |
       v
    Supabase

---

# 19. Business Rules

## Contribution

A contribution belongs to:

    Paluwagan
        +
    Member
        +
    Due Date

Example:

    Paluwagan: Family Paluwagan
    Member: Juan
    Amount: ₱1,000
    Due Date: August 21
    Status: Paid

---

## Partial Payment

If the expected amount is ₱1,000 and the member pays ₱500:

    Expected: ₱1,000
    Paid: ₱500
    Remaining: ₱500
    Status: Partial

Do not mark the contribution as fully paid unless the full required
amount has been recorded.

---

## Payout

The payout amount should be calculated based on the Paluwagan rules.

Do not blindly assume:

    payout = contribution_amount * member_count

unless the configured Paluwagan structure supports that calculation.

Business rules should be explicit and testable.

---

# 20. Money Handling

Never use floating point numbers for monetary calculations where precision
matters.

Prefer integer values representing the smallest currency unit or
PostgreSQL numeric/decimal types.

For Philippine Peso:

    ₱1,000.00

should not suffer from floating-point precision problems.

All monetary calculations should be centralized.

Do not duplicate financial calculations across multiple screens.

---

# 21. Dates and Time

The application should account for Philippine time.

Default timezone:

    Asia/Manila

Store timestamps consistently in the database.

Convert timestamps to the user's appropriate timezone when displaying
them.

Avoid manually adding or subtracting hours from dates.

Use a proper date/time library when date calculations become complex.

---

# 22. Error Handling

Errors should be understandable to normal users.

Bad:

    PostgrestError: code 23505

Good:

    This member is already part of this Paluwagan.

Bad:

    Network request failed.

Better:

    We couldn't connect to the server. Please check your internet
    connection and try again.

Technical errors should still be logged for debugging.

Never expose sensitive backend information to users.

---

# 23. Loading States

Every asynchronous operation should have an appropriate loading state.

Examples:

    Loading Paluwagan...

    Saving contribution...

    Uploading proof...

    Processing...

Avoid leaving the user wondering whether an action worked.

---

# 24. Empty States

Every list should have a useful empty state.

Example:

    You don't have any Paluwagans yet.

    Create your first Paluwagan to get started.

    [ Create Paluwagan ]

---

# 25. Confirmation Dialogs

Destructive actions should require confirmation.

Examples:

- Remove member
- Archive Paluwagan
- Delete payment proof
- Cancel payout

Do not accidentally perform destructive actions from a single tap.

---

# 26. UI Status Colors

Use consistent semantic status indicators.

Paid:

    Success

Partial:

    Warning

Unpaid:

    Neutral / Warning

Overdue:

    Error

Pending:

    Neutral

Completed:

    Success

Do not rely only on color.

Always include text or icons so the status is understandable.

---

# 27. Accessibility

The application should:

- Use readable font sizes
- Have sufficiently large touch targets
- Provide accessible labels
- Avoid relying only on colors
- Support screen readers where practical
- Maintain good contrast

---

# 28. Performance

Avoid unnecessary database requests.

Prefer:

- Fetching only required columns
- Pagination for large lists
- Efficient queries
- Appropriate indexes
- Cached data where useful
- Optimized images

Do not fetch an entire table if only five records are required.

---

# 29. Development Rules for AI

When modifying this project, the AI assistant must follow these rules.

## Rule 1

Understand the existing architecture before making changes.

Do not rewrite working parts of the application unnecessarily.

## Rule 2

Prefer small, focused changes.

Do not modify unrelated files.

## Rule 3

Do not introduce a new library unless there is a clear reason.

Before adding a dependency, check whether the existing stack can solve
the problem.

## Rule 4

Do not change the database schema casually.

If a schema change is required:

1. Explain why it is required.
2. Create an appropriate migration.
3. Consider existing data.
4. Update TypeScript types.
5. Update affected queries/services.

## Rule 5

Never bypass RLS to make something work.

Fix the authorization logic instead.

## Rule 6

Do not put business logic directly into UI components.

Move reusable business logic into services, hooks, or utility functions.

## Rule 7

Do not use fake/mock data in production functionality unless explicitly
requested.

## Rule 8

Do not silently change product requirements.

If a requirement is ambiguous, choose the simplest reasonable behavior
and clearly explain the assumption.

## Rule 9

Do not implement future features while working on the MVP.

Keep the scope controlled.

## Rule 10

After making changes, check for:

- TypeScript errors
- Lint errors
- Runtime errors
- Broken imports
- Incorrect Supabase queries
- RLS problems
- Navigation issues

---

# 30. AI Development Workflow

Before implementing a feature:

1. Understand the requested feature.
2. Inspect the existing code.
3. Identify affected components.
4. Identify affected database tables.
5. Check existing services/hooks.
6. Implement the smallest clean solution.
7. Validate the implementation.
8. Explain what changed.

Do not immediately rewrite large sections of the application.

---

# 31. Testing

Important business logic should have tests.

Prioritize tests for:

- Contribution calculations
- Partial payments
- Payout calculations
- Payout ordering
- Due date calculations
- Authorization
- Membership rules
- Validation

Example:

    Expected contribution = ₱1,000
    Payment = ₱500

Expected:

    status = partial
    remaining = ₱500

---

# 32. Environment Variables

Use environment variables for configuration.

Example:

    EXPO_PUBLIC_SUPABASE_URL
    EXPO_PUBLIC_SUPABASE_ANON_KEY

Never commit secrets.

Use:

    .env

and make sure sensitive environment files are included in `.gitignore`
when appropriate.

---

# 33. Git

Use meaningful commits.

Examples:

    feat: add paluwagan creation
    feat: add contribution tracking
    fix: correct payout calculation
    fix: prevent duplicate membership
    refactor: move contribution logic to service
    chore: update dependencies

Avoid commits such as:

    update
    changes
    fix stuff
    test

---

# 34. MVP Development Order

Build the application in this order:

## Phase 1 — Project Setup

- Expo
- Expo Router
- NativeWind
- TypeScript
- Supabase
- Environment configuration

## Phase 2 — Authentication

- Login
- Register
- Google Sign-In
- Logout
- Auth state

## Phase 3 — User Profile

- Profile
- Name
- Email
- Avatar

## Phase 4 — Paluwagan

- Create
- Edit
- View
- Archive
- List

## Phase 5 — Members

- Add members
- Invite members
- Member list
- Organizer/member roles

## Phase 6 — Contributions

- Generate contribution records
- Record payment
- Partial payment
- Payment history
- Payment status

## Phase 7 — Payouts

- Payout order
- Payout schedule
- Next payout
- Payout history

## Phase 8 — Payment Proof

- Upload screenshot
- View screenshot
- Approve/reject proof

## Phase 9 — Dashboard

- Total collected
- Outstanding
- Members
- Next contribution
- Next payout

## Phase 10 — Polish

- Error states
- Loading states
- Empty states
- Accessibility
- Performance
- Testing

---

# 35. Definition of Done

A feature is considered complete when:

- The UI works
- Validation works
- Database operations work
- RLS is correctly configured
- Loading states exist
- Error states exist
- Empty states exist
- TypeScript has no errors
- No unnecessary dependencies were added
- Existing functionality is not broken
- The feature follows the architecture described in this document

---

# 36. Product Philosophy

Keep Paluwagan Manager:

    Simple
    Fast
    Reliable
    Transparent
    Easy to understand

The application should feel like a tool that replaces a spreadsheet,
not like a complicated banking application.

Build the simplest solution that solves the user's problem.

Do not over-engineer the MVP.