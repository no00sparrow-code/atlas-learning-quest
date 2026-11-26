# Atlas security and privacy assessment

Last reviewed: 26 November 2026

## Security posture

Atlas is currently local-first. It has no active account system, server-side authorisation, cloud sync or production owner dashboard. Browser storage is not an identity or security boundary.

The prepared Supabase/Lovable Cloud schema is not applied. All findings below distinguish current local behaviour from future backend requirements.

## Current controls

- Progress import and hydration share a validator in `src/lib/progress-backup.ts`.
- Imported data is rebuilt from known fields rather than blindly spread into state.
- Input size, arrays, strings, numbers, dates and nested records are bounded or filtered.
- Prototype-sensitive keys are rejected.
- Invalid local progress is retained in a separate recovery key and can be downloaded from Profile > Data controls.
- A valid legacy backup can be used if the current primary backup is invalid.
- Guide model processing is opt-in.
- The Guide warns when an endpoint is not loopback and does not support credentials in endpoint fields.
- Provider requests have timeouts and use AbortController.
- Studio does not automatically approve or publish content.

These controls improve local data integrity; they do not create cloud account isolation.

## Known risks and blockers

| Risk | Current exposure | Required control before activation |
|---|---|---|
| No authentication | No authenticated learner identity | Lovable Cloud Auth and secure sessions |
| No server authorisation | No protected account/server API | Server-derived identity and policy checks |
| Browser storage editable | Local progress and counters can be modified | Treat client data as untrusted; validate server writes |
| Browser-local AI quotas | Can be reset or manipulated | Server-side user/global/provider quotas |
| External local-model URL | A non-loopback endpoint receives prompts | Explicit disclosure, endpoint validation and privacy controls |
| No server sync | No cross-device isolation | RLS, sync adapter and two-account tests |
| Prepared SQL policy | Creator status changes now have a server-side owner-only trigger in reference SQL; schema remains unapplied | Review trigger and verify two-account RLS behaviour before activation |
| No admin backend | UI-only route would not secure operations | Authenticated owner server function and audit log |
| No payment integration | Commerce types are not payment security | Signed webhook verification, idempotency and server entitlements |
| No social backend | No private messaging or guild access control | RLS, block/report/moderation and membership tests |

## Specific SQL review finding

The reference schema retains row-scoped creator self-updates but now has a security-definer `BEFORE UPDATE` trigger that rejects any creator approval-status change unless `public.is_owner()` is true. The trigger uses an empty search path, and the owner helper uses schema-qualified references. The creator-profile `updated_at` trigger is also present.

This adds a server-side guard against self-approval in the draft SQL, but the schema remains unapplied and has not been executed against a Supabase project. Review the function and run two-account RLS tests in the owner-controlled Lovable Cloud project before activation. This was a risk in the prepared reference schema, not an active production vulnerability.

## Mandatory backend rules

- Use `auth.uid()` or verified server identity for ownership.
- Never trust a browser-supplied user ID, role, owner flag or entitlement.
- Apply RLS to every learner-owned table.
- Keep service-role keys server-side only.
- Revalidate input on the server.
- Keep private messages, collections and learning histories private by default.
- Audit owner actions.
- Require signed, replay-safe payment webhooks.
- Enforce AI and media quotas server-side.
- Preserve local progress when network or authentication fails.
- Support account data export and deletion.

## Required security tests

- Two-account profile and progress isolation.
- Cross-user read and write attempts.
- Privilege escalation and owner-role manipulation.
- Malformed and oversized payloads.
- Prototype-key injection.
- Session expiry and sign-out sync cancellation.
- Rate-limit and quota bypass.
- Prompt/provider response validation.
- Private collection and messaging access.
- Moderation permission boundaries.
- Payment amount/entitlement manipulation.
- Webhook signature failure and replay.
- Unauthorised content publishing.

## Privacy rules

- Collect only the information needed for learning and safety.
- Make private message analysis disabled by default.
- Do not let Air impersonate a user or send a message without explicit approval.
- Do not expose identifiable learner histories to advertisers or creators.
- Apply age-appropriate controls before opening social or institutional functionality.
- Define retention and deletion rules before cloud data is activated.

## Incident and recovery expectations

- Preserve the original local backup if hydration rejects it.
- Keep a downloadable recovery copy visible to the learner.
- Keep audit trails for administrative changes.
- Maintain tested backups before production database changes.
- Document incident ownership, escalation and rollback before launch.
