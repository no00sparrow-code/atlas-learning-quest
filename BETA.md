# Atlas beta setup and architecture

This is the operational checklist for the current local-first beta. No cloud credentials,
payment provider or paid infrastructure is configured in this repository. Anything marked
**blocked** needs an owner decision and external setup; it is not simulated in the app.

## 1. Publish the current beta (Lovable)

1. Open the project in Lovable: <https://lovable.dev/projects/5895ce21-1c52-4835-9103-0f284eb87984>.
2. Confirm `main` includes this sprint's commit.
3. Use **Publish** in the top-right of the editor.
4. Open the published URL in a private window and test onboarding, a lesson, a save, a refresh,
   a quiz, `/guide`, `/studio` and `/about`.
5. Share that URL with testers. Preview URLs are private; the published URL is the external one.

The app has no server secrets today, so publishing does not require environment variables.
Learner progress is stored in `localStorage` under `atlas-progress-v2`.

## 2. Accounts and cloud sync (blocked)

All of this must be done through Lovable Cloud so the database, auth and secrets remain managed
by Lovable. Do not add or edit `supabase/migrations/` or `drizzle/` by hand.

1. In Lovable, open **Cloud** and enable it for this project.
2. Enable **Auth**. Email magic link is the lowest-friction beta option; enable email/password only
   if you also configure verification and password reset.
3. Set the auth **Site URL** to the published origin and add the published callback URL. Preview
   and production use different exact URLs.
4. Create one beta table, which keeps the existing state shape intact:
   - `learning_state`
     - `user_id uuid primary key references auth.users(id) on delete cascade`
     - `state jsonb not null`
     - `updated_at timestamptz not null default now()`
5. Enable Row Level Security and add `select`, `insert`, `update` policies using
   `auth.uid() = user_id`. Never accept a user id supplied by the browser.
6. Add a sync adapter in the app:
   - On sign-in, load the row and replace local state only if remote `updated_at` is newer.
   - On change, debounce an upsert keyed by the authenticated `user.sub`/`auth.uid()`.
   - On sign-out, keep local state but stop syncing.
   - Never put a service-role key in the browser.
7. Test with two accounts: each must see only its own progress, saved lessons and memory.

Lovable injects the public Supabase URL and anon key. Those are publishable values; the service
role key and `LOVABLE_API_KEY` must remain server-side.

Until this is configured, Atlas creates **no account**, shows no sign-in screen and labels
account features as unavailable. Do not add a client-only “admin” gate and call it security.

## 3. AI architecture (implemented locally, model blocked)

`src/lib/ai/` is the Atlas-owned provider layer:

- `types.ts` / `config.ts` — provider IDs, local preferences, no API keys.
- `providers.ts` — replaceable adapters for:
  - the browser's built-in `LanguageModel` API (on-device, Chromium support varies);
  - an Ollama server the learner runs locally;
  - a local OpenAI-compatible server (for example LM Studio).
- `prompt.ts` — minimal learner context: first name, level, retention, due-review count, weak
  concepts, recent unfinished lesson and optional current-lesson notes. It never sends the whole
  local state, email, saved IDs or another learner's data.
- `guide.ts` — model-first Guide with a deterministic library fallback. Every reply is labelled
  “Local model” or “Library answer”; a failed model request is never presented as model output.
- `usage.ts` — device-side daily allowances (24 model requests, 3 studio renders, 120 render
  seconds). The counter resets on the next local day.

### Enable a local model

1. Open **Guide → settings**.
2. Read the privacy note and tick **Enable local model processing**.
3. Choose a source and test it:
   - **Browser on-device model:** requires a Chromium build that exposes `LanguageModel`. The
     browser downloads and owns the model; Atlas does not host it. Availability is reported
     honestly, including “needs download” and “not detected”.
   - **Ollama:** run Ollama locally, `ollama pull <model>`, then allow the published origin:
     `OLLAMA_ORIGINS=https://<published-host> ollama serve`. Set the URL and model in Guide.
   - **Local OpenAI-compatible server:** start the server with CORS enabled for the Atlas origin
     and set its URL/model in Guide.
4. Press **Check connection**. A red message means no model was reached; the Guide stays on
   library answers.
5. Ask a question. If the model succeeds, the reply is labelled with the provider and model.

No hosted model gateway is configured. Do not describe the Guide as a hosted AI assistant, and do
not add a `LOVABLE_API_KEY` to browser code.

### Agent scope

The provider layer is shared, but only the Guide has a model-backed path today. Research,
source-verification, accuracy-check, narration, categorisation and recommendation “agents” are not
implemented as independent model agents. Recommendations, categorisation, review scheduling and
the library Guide are deterministic and local. The Studio script is template-generated, not
AI-authored. The final report lists these explicitly.

## 4. Atlas Studio (local video drafts)

`/studio` is a real browser-side production desk, not a hosted render farm:

1. Choose a micro-lesson or deep dive.
2. Edit the deterministic script (headings, body and captions) and source references.
3. Set seconds per slide and consent to local rendering.
4. Render with Canvas + `MediaRecorder`. The output is a real `video/webm` at 1280×720.
5. Review automatic QC: structure, copy length, complete source references, duration and captions.
6. Complete the human checks: sources reachable, factual claims checked, rights confirmed.
7. Approve locally and download WebM + WebVTT + script/approval JSON.

Important limits, shown in the UI:

- Renders are **silent**. Narration/TTS is not connected. No synthetic voice is implied.
- The animation is slide fades and lower-third captions; it is not generative imagery.
- Video files are not uploaded or persisted after reload. Download the draft first.
- Approval is local metadata only. **Publishing is not connected.**
- Batch production, long-form (>90s) drafts and an automatic research/verify agent are not
  implemented.
- Daily local limits prevent runaway CPU use. Nothing renders in the background or for another
  learner.

To publish a real episode after owner review:

1. Review the WebM and VTT; verify every factual claim and the rights for all assets.
2. Host the file (for example `public/videos/<episode-id>.webm` or a reviewed CDN URL).
3. Add the path to `src/data/videos.ts` (`EPISODE_VIDEO_SOURCES`).
4. Test play, seek, completion, captions and mobile layout with the real file.
5. Do not mark an episode playable until the file actually loads.

## 5. Monitoring and status (local only)

`/status` runs browser-local checks: storage, unique lesson IDs, source coverage, registered
episode media, WebM support, local allowances, studio job failures and model availability.

It explicitly marks platform-wide data **unavailable**. There is no authoritative user count,
CPU/RAM/storage metric, spend, revenue, queue length or security feed to show without a backend.
Do not add estimated numbers to that page and call them monitoring.

Required later, after Cloud/Auth exists:

- scheduled server checks that compare counts and metrics with the provider's records;
- timestamped check results and failure history in a server table;
- provider status for any hosted model and TTS service;
- a status page that distinguishes verified, estimated and unavailable values.

## 6. Owner admin (blocked)

No `/admin` panel is implemented. A client-side hidden route would not be security, and there is no
owner identity, session or server data to protect. When Cloud/Auth is configured:

1. Add an owner-only server role/claim, checked on every request server-side.
2. Put all admin reads behind authenticated server functions with a server-side role check.
3. Add audit logging for admin actions.
4. Build the metrics only from authoritative queries; label estimates and unavailable values.
5. Add moderation, infrastructure, cost/revenue, error and emergency-control sections.

Until then, Atlas exposes no administrative data or controls.

## 7. Plans, free access and payments

`/plans` documents the intended Free beta / Plus / Creator structure. Payments are disabled:

- There is no checkout, card form, subscription activation or price collection.
- Free access covers all current lessons and the deterministic Guide.
- Local model and studio caps are device guardrails, not paid entitlements.
- Paid tiers are marked **Planned** and their required backend, payment and compliance work is
  listed on the page.

Before enabling payments: add authenticated accounts, server-side entitlements, a payment
provider, refunds, tax handling, age requirements and an owner-approved compliance review.

## 8. Marketplace (blocked)

No marketplace, purchases, creator payouts or revenue tracking are implemented. Those depend on
accounts, secure payments, moderation, legal review and a server data model. The current beta does
not display fake products or prices.

## 9. Server-side cost protection (blocked)

The app currently has no server-side compute to limit. Local model/render limits and explicit
consent are implemented in `src/lib/ai/usage.ts` and `/studio`. A future backend must add:

- per-user and global quotas enforced on the server (never only in the browser);
- rate limits on model, TTS, render and upload endpoints;
- a spend cap and an emergency-off flag checked before every paid call;
- queued/background workloads with cancellation and failure retention;
- cached or pre-generated media instead of per-request generation;
- owner approval before any paid provider is enabled.

No paid infrastructure or subscriptions have been activated.

## 10. Beta safety checklist

- Run `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build`.
- Test fresh onboarding, interests, feed, a real video file, likes/saves, quiz, memory, map,
  Guide (library and configured local model), Studio render/approval, import/export and `/status`.
- Keep `/about` reachable: it explains local storage, optional local model requests and reporting.
- Testers can export/restore a JSON backup from Profile → Account & data.
- Content reports go to the repository issue tracker linked from `/about`.
- Do not add analytics that collect personal data without updating the privacy note first.
- Do not publish generated educational claims that have not passed human source and rights review.
