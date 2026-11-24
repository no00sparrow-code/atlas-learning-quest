# Atlas backend architecture

Status: **designed and prepared, not configured**. Atlas still runs local-first. No account,
cloud sync, server quota or payment is active. This document is the exact boundary for the next
integration stage.

## 1. Provider decision: Supabase / Lovable Cloud

Supabase is the better fit for Atlas than Firebase because Atlas needs relational records
(progress, mastery, production jobs, purchases, revenue ledger), SQL portability, and row-level
security policies that can be reviewed and tested. Firebase Spark is attractive for document data
and offline mobile, but its free tier does not include Cloud Storage or Cloud Functions, and its
security rules would not give the same portable SQL model.

Current Supabase Free tier (checked 24 November 2026 from the official pricing page):

| Resource        | Free allowance                                 | Atlas implication                          |
| --------------- | ---------------------------------------------- | ------------------------------------------ |
| Price           | $0                                             | No paid activation                         |
| Auth            | 50,000 MAU                                     | Enough for beta                            |
| Database        | 500 MB Postgres, shared CPU / 500 MB RAM       | Enough for text state; not for video       |
| Egress          | 5 GB + 5 GB cached                             | Avoid serving video through Supabase       |
| File storage    | 1 GB, 50 MB max per file                       | Store captions/thumbnails, not long videos |
| Edge Functions  | Included within quota                          | Server checks and webhooks                 |
| Active projects | 2                                              | One preview, one production                |
| Inactivity      | Free project pauses after 1 week of inactivity | Add an owner reminder/keepalive policy     |

Other constraints to plan for: free projects have no automatic backups, public auth email requires
a suitable SMTP setup, and free quotas are not an SLA. Source:
<https://supabase.com/pricing>.

Videos should be hosted outside the database bucket (for example reviewed static files or an
object store with a separate budget), with only metadata and captions in Supabase.

## 2. What exists in this repository

- `src/lib/backend/config.ts` detects public Supabase variables and deliberately reports
  "configured, auth/sync not enabled" rather than pretending a connection works.
- `src/lib/backend/config.test.ts` verifies secrets are never returned and malformed URLs are
  rejected.
- `docs/backend/schema.sql` is a reviewed reference schema with RLS policies. It is **not applied**
  and is not a generated migration.
- The current app remains local-only in `src/lib/atlas-store.tsx`.

There is no `@supabase/supabase-js` dependency or active auth adapter. That is intentional until an
owner project exists and two-account isolation can be tested.

## 3. Setup sequence (owner/Lovable)

Do not edit `supabase/migrations/` or `drizzle/` by hand. Lovable manages database changes.

1. Open the project in Lovable and enable **Cloud**.
2. Enable **Auth**. Use email magic links for the first beta. Configure a real SMTP sender before
   inviting public users; the default free auth email restriction is not a production signup flow.
3. Set the exact production and preview Site URLs and callback URLs.
4. Apply the tables and policies from `schema.sql` through the Lovable Cloud SQL editor (or ask
   Lovable to implement them). Review every `security definer` function and policy first.
5. Add the owner's auth user UUID to `platform_admins` using the SQL editor. Never expose this
   table to the browser.
6. Confirm `system_controls` exists with `payments_enabled=false`,
   `ai_provider_enabled=false`, and `emergency_shutdown=false`.
7. Add public client configuration to the hosting environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
     These are public identifiers; the anon key is not a service-role secret. The current app detects
     them but does not connect.
8. Add server-only secrets in Lovable/Supabase Secrets, never in source:
   - `SUPABASE_SERVICE_ROLE_KEY` (server functions only)
   - payment provider secret and webhook secret, only after approval
   - any hosted AI key, only after approval
9. Implement a sync adapter:
   - load the authenticated user's row on sign-in;
   - resolve conflicts using `revision`/`updated_at`;
   - debounce upserts keyed by `auth.uid()`;
   - keep local data if the network fails;
   - stop syncing on sign-out.
10. Test with two real accounts: each must see only their own profile, progress, saved items,
    mastery, usage and purchases. Attempt cross-user reads with the anon key and expect zero rows.

Until step 10 passes, cloud sync must remain labelled unavailable.

## 4. Auth and data rules

- Never trust a user ID from the browser. Use `auth.uid()` in RLS and server functions.
- `profiles`, `learning_state`, `ai_usage`, `subscriptions`, `purchases` and creator records are
  scoped to the authenticated user.
- Only `content_items` with `status='published'` and approved creator products are public.
- `ai_usage` is read-only for learners; the server writes usage after a successful call.
- `admin_audit`, `health_checks`, `production_jobs`, `system_controls` and `video_assets` are
  owner-only.
- Service-role keys must never reach the browser bundle, logs or a public repository.
- Inputs must be validated again on the server; RLS is not input validation.

## 5. Owner admin design

No `/admin` route is implemented. A hidden client route is not security. When auth and RLS exist:

1. Add an owner-only server function that checks `public.is_owner()` from the authenticated JWT,
   not a flag sent by the client.
2. Put every admin query behind that server function.
3. Write every administrative action to `admin_audit`.
4. Build metrics from authoritative SQL, and label each metric:
   - **verified** — directly queried from the provider/database;
   - **estimated** — derived with a documented formula;
   - **unavailable** — no reliable source.
5. Never display a placeholder user count, CPU value, revenue or queue length.
6. Include moderation reports, production jobs, failed renders, errors, quotas, costs and the
   emergency controls in the same protected surface.

## 6. Monitoring

The current `/status` page records browser-local snapshots in local storage. It is not a scheduled
server monitor.

After backend setup, run a scheduled job (cron/Edge Function) that writes to `health_checks`:

- auth/database reachability;
- RLS smoke test with two users;
- model provider availability (without spending, where possible);
- queued/rendered/failed production jobs;
- storage/egress against provider quotas;
- broken source URLs;
- error rate and quota exhaustion;
- emergency shutdown state.

Record timestamps and outcomes. The admin UI should show last success, last failure and
unavailable checks separately.

## 7. Cost controls

Local quotas already work in the browser. Server enforcement still needs:

- a per-user daily counter in `ai_usage`;
- a global spend cap in `system_controls`;
- provider-specific request and render caps;
- an emergency-off switch checked before every paid call;
- idempotency keys for model/render jobs;
- cached or pre-generated results;
- a retry budget and failure retention.

No paid infrastructure is active.

## 8. Payments and marketplace requirements

No checkout is present. The interface boundary is in `src/lib/commerce/types.ts`; it deliberately
contains no charge function.

Before enabling real payments:

1. Choose an authorised payment provider and business account owner (an adult/business
   representative).
2. Complete the provider's identity, tax, refund and age-requirement checks.
3. Create server-only secrets:
   - provider secret key;
   - webhook signing secret;
   - price IDs for each plan/product.
4. Add server endpoints for checkout creation, webhook verification, subscription state and
   refunds. Never collect card details in Atlas.
5. Store only provider identifiers in `subscriptions`, `purchases` and `revenue_ledger`; never store
   card numbers, CVCs or full payment payloads.
6. Verify webhooks idempotently and update records only after signature verification.
7. Add creator payouts, reserves, refund handling, tax reporting and moderation policy.
8. Test in provider test mode with two accounts, failed payments, refunds and webhook replay.
9. Keep `payments_enabled=false` until the owner explicitly approves activation.

The current `/plans` page is informational only and shows no price or purchase action.

## 9. Open questions before launch

- Who is the legal/business owner of the payment account and creator payouts?
- Will video be hosted as reviewed static files or in a paid object store?
- Is a second Supabase project needed for preview vs production?
- What retention period applies to learner data, AI prompts and generated drafts?
- Which jurisdiction's tax/consumer rules apply?
- What content licence and attribution policy applies to creator packs?
