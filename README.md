# Fameflow — final website package

This package contains the separated, responsive Fameflow website and the final Supabase migration.

## Website files for GitHub

Upload the **contents** of this folder into the root of `Kaktus-Black/fameflow` (not the enclosing folder):

- `index.html` — home
- `services.html` — catalogue, guest checkout and Pochi payment submission
- `track.html` — ticket-only order tracking
- `how-it-works.html` — customer instructions and Pochi details
- `admin.html` — administrator login, order review and service creation
- `styles.css` and `app.js`
- `config.js` — public Supabase URL/key and support WhatsApp number
- `supabase/` — database migration and WhatsApp notification Edge Function

The existing public Supabase project URL and publishable key are configured in `config.js`. A publishable/anon key is intended for browser use with RLS. **Never put the Supabase service-role key, Meta access token, or webhook secret in `config.js` or any public GitHub file.**

## Supabase database — run once

1. Open Supabase Dashboard → SQL Editor → New query.
2. Open `supabase/fameflow_final_migration.sql` and copy the entire file.
3. Run it once, before accepting live orders.
4. It rotates existing test ticket numbers. Old tickets will no longer work. Do not rerun after live orders exist.

This migration retains the existing Fameflow schema and adds secure random tickets, ticket-only tracking, and ticket-only payment submission. It does not disable RLS or expose the service-role key.

## Payment method

The customer payment instructions now show **Pochi la Biashara: 0117063135**. Etica Paybill details have been removed from the customer pages. Confirm that this Pochi number is active and registered to the intended business before accepting payments. Customers enter the M-Pesa transaction reference and amount; payment remains manually reviewed.

## WhatsApp customer support

A floating WhatsApp support button appears on every page and opens a chat with `+254117063135`.

## WhatsApp admin alerts — configuration required

The Edge Function source is `supabase/functions/fameflow-whatsapp/index.ts`. It is designed to send a WhatsApp Cloud API template message to the admin phone `+254117063135` on both events:

- a new order is inserted;
- payment details are submitted (a new payment row is inserted).

**This feature will not send messages until you configure Meta WhatsApp Cloud API and Supabase Database Webhooks.** You need a Meta Business account, a WhatsApp Business Platform sender number, a valid access token, the sender Phone Number ID, and an approved template named `fameflow_order_alert` in English. The template must have seven body placeholders in this order: event, ticket, service, quantity, amount, target URL, transaction reference. The admin recipient must have opted in to receive messages. The sender number is the Meta API business number; it is not automatically the same as the recipient/support number.

Deploy the function using the Supabase CLI from this project:

```bash
supabase functions deploy fameflow-whatsapp --no-verify-jwt
supabase secrets set FAMEFLOW_WEBHOOK_SECRET="use-a-long-random-secret" \
  WHATSAPP_ACCESS_TOKEN="YOUR_META_ACCESS_TOKEN" \
  WHATSAPP_PHONE_NUMBER_ID="YOUR_META_PHONE_NUMBER_ID" \
  FAMEFLOW_ADMIN_WHATSAPP="254117063135" \
  WHATSAPP_TEMPLATE_NAME="fameflow_order_alert" \
  WHATSAPP_TEMPLATE_LANGUAGE="en" \
  WHATSAPP_GRAPH_API_VERSION="v23.0"
```

Supabase normally provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. If not, add them as function secrets in the Supabase Dashboard. Never share the service-role key or Meta token in chat or commit them to GitHub.

Then in Supabase Dashboard → Database → Webhooks, create two webhooks using HTTP POST:

1. Table `public.orders`, event `INSERT`.
2. Table `public.payments`, event `INSERT`.

For both, set the URL to `https://hjlgszrnwggyjzybbenu.supabase.co/functions/v1/fameflow-whatsapp` and add header `x-fameflow-hook-secret` with the exact same secret as `FAMEFLOW_WEBHOOK_SECRET`. Save and test each webhook. The Edge Function checks this header before processing webhook data.

Meta may require template approval before messages can be sent. A normal WhatsApp chat link is only for customer-initiated support; it cannot send background notifications.

## Themes and responsive layout

The website starts in the customer's system theme. The theme control cycles through system → light → dark → system and stores a manual preference in that browser. The layout adapts for mobile, tablet and desktop.

## Deployment

Replace the existing root website files in GitHub and commit to `main`. Your existing Cloudflare Worker deployment should rebuild from the repository using its existing deployment workflow. This package is static HTML/CSS/JS; do not add a service-role key to frontend configuration.

## Launch test checklist

- Confirm the Pochi number and business recipient are correct.
- Run the SQL migration once before live orders.
- Create a test service in Admin.
- Place a test order and save its generated ticket.
- Submit a test payment reference and confirm it enters `payment_review`.
- Track the order using only its ticket.
- Sign in as admin, verify/reject the test payment and update its status.
- Test light/dark/system themes on phone, tablet and desktop.
- Test the floating WhatsApp support link.
- Configure and verify both WhatsApp database webhooks before relying on admin alerts.
