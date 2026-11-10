# Fameflow website v3

This version separates the storefront into responsive pages and changes the customer tracking screen to accept the ticket number only.

## Included files
- `index.html` — Home page
- `services.html` — service catalogue and guest checkout
- `track.html` — ticket-only order tracking
- `how-it-works.html` — customer process and payment safety information
- `admin.html` — administrator sign-in, order management and service creation
- `styles.css` — responsive layout for phones, tablets and desktop screens
- `app.js` — Supabase integration and page interactions
- `config.js` — public Supabase URL and publishable key
- `ticket_only_tracking_migration.sql` — required database migration

## IMPORTANT: Run the database migration first
1. Open Supabase Dashboard → SQL Editor.
2. Create a new query.
3. Open `ticket_only_tracking_migration.sql`, copy all its contents and paste into SQL Editor.
4. Run it once and confirm it completes successfully.

The migration adds a trigger that changes every new order ticket to a random 128-bit code, adds a ticket-only tracking RPC, and rotates existing tickets. Existing test ticket numbers will stop working. This is intentional before launch; do not run this migration again after real customer orders have been issued, because it rotates their ticket numbers too.

The migration relies on the existing Fameflow schema having `orders`, `payments`, and `notifications` as created by the original setup script. It does not disable RLS or expose the private access-token hash.

## Upload to GitHub
Upload all files in this folder directly into the repository root (not into another nested folder), then commit to the `main` branch. The old root `index.html`, `styles.css`, `app.js`, and `config.js` should be replaced. Add the four new HTML pages and the migration SQL file.

## Cloudflare
The current deployment is a Worker deployment and already serves the site. If using the existing Wrangler Worker, keep the current deployment workflow and publish the updated root files through the same project. If switching to Cloudflare Pages later, use a static-site configuration with no build command and `.` as the output directory.

## Responsive design
The layout uses a centered max-width container, fluid typography, 3-column desktop service cards, 2-column tablet cards and single-column mobile cards. The mobile navigation collapses into a menu. Forms and admin order cards are constrained to the viewport to prevent horizontal overflow.

## Security and launch notes
- The ticket is now the sole customer tracking credential. It is a random 128-bit value and must be treated as private.
- The separate token is no longer displayed or requested for tracking. The internal token is retained only in the checkout browser session to submit the payment reference through the existing protected RPC.
- The Supabase publishable key is intended for browser use with correct RLS. Never add a service-role key or database password to frontend files.
- Etica M-Pesa Paybill details displayed at checkout and on How It Works: Business Number `4096483`; Account Number `333578M`. These details were supplied by the site owner; verify the account is active and correct before accepting customer payments.
- Test order creation, ticket-only tracking, payment submission, admin verification and status updates before launch.
