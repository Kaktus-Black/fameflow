# Fameflow web starter

A mobile-first static storefront and basic admin dashboard for Fameflow, connected to the Supabase project configured in `config.js`.

## Files
- `index.html` — storefront, checkout, tracking, and admin interface.
- `styles.css` — responsive dark-violet styling.
- `app.js` — Supabase data access and interface behavior.
- `config.js` — public Supabase URL and publishable key.

## 1. Supabase configuration
`config.js` is prefilled with the project URL and the public publishable key supplied for this project. The publishable key is intended for browser use when Row Level Security is correctly configured. Never put a `service_role` key, secret key, or database password in this file or in GitHub.

## 2. Admin login
Create/confirm the admin user under Supabase Dashboard → Authentication → Users. The account must also exist in `public.admin_users` (the user has run the insert query). Use that email and its Auth password in the website's Admin dialog.

## 3. Add services
Sign in as admin, then use the “Add a service” form. The storefront shows active services. Prices are KSh per 1,000 units.

## 4. Payment process
The customer can submit an M-Pesa transaction reference and amount after creating an order. Admins can mark a payment verified or rejected. Verification accepts the order and creates a customer-facing update; rejection moves it to payment_rejected and creates an update.

The exact Etica Paybill number and account instructions are intentionally not invented or hard-coded. Confirm the official details first, then add the correct instructions to the checkout UI before accepting payments.

## 5. Upload to GitHub from Android
1. Download and extract `fameflow_web_starter.zip`.
2. Open the repository in GitHub: `https://github.com/Kaktus-Black/fameflow`.
3. Choose **Add file → Upload files**.
4. Upload the four website files from inside the `fameflow_web` folder (`index.html`, `styles.css`, `app.js`, `config.js`). You may also upload this README.
5. Commit the files to the default branch.

## 6. Deploy with Cloudflare Pages
1. Sign in to Cloudflare and open **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize GitHub and select `Kaktus-Black/fameflow`.
3. For a plain static site, leave the build command blank and set the build output directory to `/` (repository root) if you uploaded the files at root. If you uploaded them in a subfolder, set the output directory to that folder.
4. Deploy. Cloudflare will provide a public `pages.dev` address.

## Important launch checks
- This is an MVP starter, not a production-hardened payment or fulfilment system.
- Test a service, a guest order, tracking with the ticket + private token, and admin sign-in before public launch.
- Review Supabase RLS and grants. Do not disable RLS to make the app work.
- Add request rate limits, target URL host allow-list validation, admin audit logging, service editing/deactivation, and stronger operational checks before scaling.
- The checkout does not initiate an M-Pesa STK push. It records a customer-submitted transaction ID for manual verification.
