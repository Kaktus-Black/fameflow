# Fameflow web starter

This is a static, mobile-first Fameflow storefront and basic admin dashboard connected to Supabase.

## 1. Configure Supabase

Open `config.js` and set:
- `SUPABASE_URL` to your Supabase project URL.
- `SUPABASE_ANON_KEY` to your project's public publishable/anon key.

Only use the public key here. Never put a `service_role` key, database password, or secret key in frontend files.

## 2. Create your admin login

In Supabase Dashboard:
1. Authentication → Users → Add user.
2. Create the admin login using your email.
3. The user must already be present in `public.admin_users` (the database setup step you completed).
4. Sign in from the Admin button on the website.

## 3. Add services

Sign in to Admin and use “Add a service”. Customers will see active services in the public catalogue.

## 4. Payment details

The checkout currently creates orders but does not display a verified Etica Paybill number. Do not accept payments until you have confirmed the exact Paybill and account instructions. The payment settings table is ready for a later public settings function / admin settings screen.

## 5. Run locally

You can open `index.html` for a quick preview. For deployment, upload these files to a static host such as Cloudflare Pages or GitHub Pages. Configure `config.js` before publishing.

## Important launch checks

- The initial SQL creates the database and guest RPC functions.
- The admin UI expects the RLS policies from that SQL.
- Customer order creation and tracking use RPC functions and the private tracking token.
- Admin payment verification and status changes use authenticated Supabase access.
- This is an MVP starter, not yet a production-hardened payment or fulfilment system. Add rate limiting, URL allow-list validation, stronger admin audit logging, and a tested payment-verification workflow before public launch.
