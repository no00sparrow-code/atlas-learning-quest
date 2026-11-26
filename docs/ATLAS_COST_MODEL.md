# Atlas cost model

Last reviewed: 26 November 2026

## Current cost position

No hosted AI provider, payment processor, production database or media-generation service is activated by the application branch.

Current application work is primarily browser-side:

- Learning state is stored in browser local storage.
- Progression, memory and recommendations use deterministic TypeScript.
- AI is optional and uses a browser-managed model or a user-configured local endpoint.
- Studio scripts, structural checks, captions and WebM rendering run locally in the browser.
- Local daily limits are safeguards against accidental device workload, not enforceable billing controls.

The GitHub Actions workflow uses hosted CI to run tests, lint, type checking and the production build. No paid third-party runtime service has been enabled by this task.

## Cost drivers to measure before activation

| Cost area | Current state | Future meter required |
|---|---|---|
| Application hosting | No new deployment in this task | Requests, build minutes, bandwidth and environment count |
| Database and Auth | Supabase/Lovable Cloud prepared, not connected | Database size, active users, backups and project tier |
| AI inference | Local/browser adapters only | Input/output tokens, provider, model, agent and request |
| Research | No live research provider | Search requests, fetched pages, extraction and verification calls |
| Narration | No TTS engine | Characters/minutes generated and voice tier |
| Generated imagery | No image provider connected | Images, resolution, retries and storage |
| Video | Browser-local silent WebM | Browser CPU, duration and any future server render minutes |
| Object storage | No new object store activation | Stored GB, operations and retention |
| Egress/CDN | No new media delivery integration | GB transferred and cache hit rate |
| Payments | Disabled | Transaction, refund, dispute and payout fees |
| Email/notifications | No transactional provider activated | Messages and deliverability service |
| Monitoring | Current status is browser-local | Events, logs, traces and retention |

Do not put guessed prices into this document. Record provider quotes, pricing-page dates, currency, free-tier limits and expected usage before making a spend decision.

## Required controls before hosted AI

- Per-user daily request and token budgets.
- Global monthly spend cap.
- Per-provider, per-model and per-agent caps.
- Request timeout and maximum output length.
- Concurrency and queue limits.
- Bounded retries with exponential backoff where appropriate.
- Idempotency keys and duplicate-job suppression.
- Cache keys and cache expiry.
- Cancellation on user request, timeout or budget exhaustion.
- An emergency-off control checked before every paid request.
- A graceful deterministic fallback when no provider is available.
- A visible usage record with actual, estimated and unavailable values clearly distinguished.

The server must enforce limits. A browser counter in `src/lib/ai/usage.ts` is not a billing control and must not be represented as one.

## Paid fallback policy

Paid fallback remains disabled by default. A model or agent cannot override a spending limit. A paid request must not begin until the server has checked the user's allowance, the global budget, provider status and emergency-off state.

No service-role key, provider key or payment secret may be placed in frontend code, local storage or GitHub.

## Cost approval gate

Before enabling a paid service, record:

1. Provider and product.
2. Why local/free options are insufficient.
3. Pricing source and date.
4. Expected low, normal and peak usage.
5. Monthly cost estimate and worst-case cap.
6. Quota and shutdown behaviour.
7. Data retention and privacy implications.
8. Account owner and billing owner.
9. Explicit approval.

## Financial reporting

Future owner reporting must label metrics as:

- **Actual** — provider invoice or authoritative usage record.
- **Estimated** — formula and assumptions documented.
- **Unavailable** — no reliable source.

Never display browser-local counters as total platform spend.
