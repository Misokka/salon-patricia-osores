# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tenant salon booking platform** (SaaS-ready) for hair salons, spas, and beauty services. It features appointment booking, staff management, availability scheduling, and admin dashboard. Built as a template for rapid client deployment.

**Tech Stack:**
- Next.js 16 (App Router) + TypeScript + React 18
- Supabase (PostgreSQL + Auth + Storage)
- Tailwind CSS + Framer Motion
- Nodemailer (transactional emails via Brevo/SMTP)

## Development Commands

```bash
# Install dependencies
npm install

# Local development
supabase start              # Start local Supabase (Docker required)
supabase db reset           # Reset DB and apply all migrations
npm run dev                 # Start Next.js dev server on :3000

# Production
npm run build               # Build for production
npm start                   # Run production server
npm run sitemap             # Generate sitemap
```

## Product Philosophy (IMPORTANT)

This product prioritizes:
- Simplicity for salon owners (non-technical users)
- Strong business rules enforced at database level (RPC + RLS)
- Predictable behavior over flexibility
- Avoiding over-engineering (no unnecessary microservices, queues, etc.)

When implementing features:
- Prefer extending existing workflows over adding new concepts
- Respect existing status workflows and slot-based availability logic
- Never bypass booking validation logic for convenience

## Architecture

### Multi-Tenant Design

This application is designed as a **multi-salon SaaS platform**:

- **Salon Isolation:** Every data table includes `salon_id` for tenant isolation
- **Admin Auth:** Admin users have `salon_id` stored in `user.app_metadata.salon_id` (set via Supabase SQL)
- **Public Routes:** Use `PUBLIC_SALON_ID` constant (currently hardcoded to `00000000-0000-0000-0000-000000000001`)
- **Future:** Domain-based salon detection to replace hardcoded PUBLIC_SALON_ID

**Key Function:** `getSalonIdFromAuth()` in [lib/salonContext.ts](lib/salonContext.ts) retrieves the authenticated admin's salon.

### Configuration Management

**Single source of truth:** [config/salon.config.ts](config/salon.config.ts)

Contains all static configuration (salon identity, contact info, theme, SEO, scheduling defaults, email templates). **No business data** (services, staff) belongs here—that lives in the database.

When cloning for a new client: update `salon.config.ts`, logo/hero images, and environment variables.

### Database Schema

**Migrations:** [supabase/migrations/](supabase/migrations/)

Key tables:
- `salons` - Tenant table
- `services` - Services with duration and pricing
- `staff_members` - Multi-staff support with positioning
- `staff_absences` - Absence/vacation tracking (datetime ranges)
- `appointments` - Bookings with status workflow (pending/accepted/refused/cancelled)
- `time_slots` - Available time slots (15-30min intervals)
- `appointment_slots` - Junction table linking appointments to time slots
- `opening_hours` - Salon regular and exceptional hours

**Row Level Security (RLS):** Enabled on all tables. Public can SELECT most data; mutations require admin role (`is_admin()` function checks `raw_app_meta_data.role = 'admin'`).

### Supabase Client Variants

Multiple Supabase client factories in [lib/supabase/](lib/supabase/):

- **server.ts** - SSR/Server Components (auth-aware, cookies)
- **client.ts** - Client Components (browser, auth-aware)
- **admin.ts** - Service role (bypasses RLS, server-side only)
- **public.ts** - Anonymous client (no auth)
- **middleware.ts** - Next.js middleware client

**Rule:** Use `admin.ts` only in API routes when you need to bypass RLS for admin operations.

### Appointment Booking Flow

1. **Client selects service** → Frontend fetches available slots via `/api/disponibilites/available`
2. **Client picks consecutive slots** → Slots are validated for:
   - Availability
   - Consecutiveness (no gaps)
   - Sufficient total duration to cover service duration
3. **Booking submitted** → [validateAppointmentSlots()](lib/appointmentValidation.ts) performs server-side validation
4. **RPC `book_appointment` called** → Supabase function atomically:
   - Assigns first available staff (or specific staff if requested)
   - Marks slots as unavailable
   - Creates appointment
   - Returns `appointment_id` and `management_token`
5. **Emails sent:**
   - Admin notification (new booking)
   - Client confirmation with management URL
6. **Admin reviews** → Accept/refuse via dashboard
7. **Status updates** → Client receives acceptance/rejection email

**Management Token:** Each appointment gets a unique token allowing clients to view/modify/cancel their booking without authentication (via `/rendezvous/manage?token=...`).

### Email System

[lib/emailService.ts](lib/emailService.ts) - Nodemailer with Brevo SMTP

Email templates use inline HTML. Subjects are defined in `salon.config.ts` under `emails.subjects`.

**Types:**
- New booking (to admin)
- Booking confirmation (to client) with management link
- Acceptance/rejection (to client)
- Auto-confirmation (if manual approval disabled)
- Review request (sent N hours after appointment)

**Environment variables:**
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (or fallback to `EMAIL_USER`/`EMAIL_PASS`)

### Staff & Absence Management

**Multi-staff support** (added in migrations 013-023):

- Services can be performed by any available staff member
- Appointments assign `staff_member_id` (auto or manual)
- `staff_absences` table tracks vacations/sick days as datetime ranges
- `find_available_staff_for_slot()` RPC checks both appointment conflicts and absences
- Reassignment feature allows moving appointments between staff if conflicts arise

**Conflict Detection:** [supabase/migrations/022_step7_conflict_detection_reassign.sql](supabase/migrations/022_step7_conflict_detection_reassign.sql) includes RPC functions to detect overlapping appointments and suggest reassignment.

## API Routes Structure

```
app/api/
├── admin/          # Admin-only routes (use getSalonIdFromAuth)
│   ├── agenda/
│   ├── appointments/
│   ├── rendezvous/
│   ├── salon-settings/
│   ├── staff-members/
│   └── staff-absences/
├── rendezvous/     # Public booking routes (use PUBLIC_SALON_ID)
│   ├── route.ts           # POST: Create booking
│   ├── cancel/            # POST: Cancel via token
│   ├── modify/            # POST: Modify via token
│   └── manage/            # GET: Fetch booking via token
├── disponibilites/
│   └── available/         # GET: Fetch available slots
└── public/
    └── staff-members/     # GET: Public staff list
```

**Pattern:** Admin routes call `getSalonIdFromAuth()` to enforce tenant isolation. Public routes use `PUBLIC_SALON_ID`.

## Component Organization

```
app/components/
├── admin/               # Admin dashboard components
│   ├── agenda/         # Calendar/schedule views
│   ├── FilterBar.tsx
│   ├── Sidebar.tsx
│   ├── TimeSlotPicker.tsx
│   └── ...
└── [public components in app/components root or page-specific folders]
```

Admin components are protected by auth middleware. Public components are freely accessible.

## Environment Variables

**Required for local development** (`.env.local`):

```bash
# Supabase (local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>

# API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Email
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your user>
SMTP_PASS=<your password>
```

**Production:** Set these in Vercel dashboard. Use production Supabase project URLs.

## Creating Admin Users

Admins are created by setting metadata in Supabase SQL Editor:

```sql
-- Set user as admin
UPDATE auth.users
SET raw_app_meta_data = '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';

-- Assign salon
UPDATE auth.users
SET raw_app_meta_data =
  jsonb_set(
    raw_app_meta_data,
    '{salon_id}',
    '"00000000-0000-0000-0000-000000000001"',
    true
  )
WHERE email = 'admin@example.com';
```

## Client Deployment Workflow

When deploying for a new client (see README.md "Procédure nouveau client"):

1. Clone this template repo
2. Create new GitHub repo for client
3. Update [config/salon.config.ts](config/salon.config.ts) (name, contact, theme, SEO)
4. Replace images: `public/images/logo.png`, `public/images/landing.jpg`
5. Create Supabase project, run migrations
6. Create admin user via SQL
7. Deploy to Vercel, set environment variables
8. Configure custom domain (for multi-tenant: update salon detection logic)

## Important Constraints

**Appointment Slot Validation:**
- Slots must be on the same date
- Slots must be consecutive (no gaps)
- Total slot duration must >= service duration
- All validation logic in [lib/appointmentValidation.ts](lib/appointmentValidation.ts)

**Time Slot Generation:**
- Automated via admin dashboard or cron
- Respects `opening_hours` and `exceptional_hours`
- Configurable interval (15/30 min) in `salon.config.ts`

**Staff Assignment:**
- Auto-assigned to first available staff by `book_appointment` RPC
- Can be manually specified with `staff_member_id` parameter
- Absence periods block staff from auto-assignment

## Testing

No automated tests currently. Manual testing via:
- Local Supabase instance
- Postman/curl for API routes
- Browser testing for UI flows
