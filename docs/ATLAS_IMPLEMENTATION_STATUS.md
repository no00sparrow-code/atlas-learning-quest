# Atlas implementation status

Last reviewed: 26 November 2026

This report describes the repository as inspected on `main` at
`20fed4ddbd444f2eea179e6b8874d0f35d1bec9c`, plus the explicitly identified
progress-backup work on `codex/atlas-foundation-sprint-1`. A UI, type or schema
is not treated as a working integration unless its execution path exists and has
been verified.

## Status definitions

- **COMPLETE** — implemented and verified.
- **PARTIAL** — genuine implementation exists but is incomplete.
- **UI ONLY** — interface exists without the necessary functional implementation.
- **PREPARED** — supporting models or documentation exist; integration is inactive.
- **NOT IMPLEMENTED** — no genuine implementation exists.
- **BLOCKED** — external credentials, decisions, infrastructure or approvals are required.

## Repository and verification baseline

| Item | Finding |
|---|---|
| Application | React 19, TypeScript, TanStack Start/Router, Vite and Tailwind CSS |
| Tests | Vitest and Testing Library |
| Persistence | Browser-local state under `atlas-progress-v2`, with v1 migration |
| Backend | Supabase/Lovable Cloud reference design only |
| AI | Optional local browser/Ollama/OpenAI-compatible adapters; no hosted gateway |
| Lovable | Connected project; preserve its managed database and generated-file boundaries |
| Default branch | `main` |
| Development branch | `codex/atlas-foundation-sprint-1` |
| Dependency baseline | `npm ci` was attempted in GitHub Actions and failed before tests because the checked-in package lock is out of sync with `package.json` (AJV and transitive dependency entries differ). |
| Test/lint/typecheck/build | Not yet verified for this change. CI is being used to run the commands after dependency installation. |

Do not infer a successful test or build from the existence of a test file or CI
workflow. Record the exact workflow run and step result when available.

## Feature inventory

| Feature | Status | Existing implementation and relevant files | Missing functionality / risks | Stage |
|---|---|---|---|---|
| Discover feed | PARTIAL | Feed data and local ranking in `src/data/cards.ts`, `src/lib/recommend.ts`, feed routes | Search/follow/collections and broader personalisation need verification and completion | 2 |
| Deep-dive series | PARTIAL | `src/data/series.ts` and series/watch routes | Real episode media must exist before playable status is claimed | 2 |
| Knowledge map | PARTIAL | Concepts, skills, categories and map route | Full prerequisite graph exploration and mastery-driven pathway experience | 2 |
| Quests and quizzes | PARTIAL | `src/data/quests.ts`, quest routes and progression store | Practical challenges, mystery content and progression need broader tests | 2 |
| XP, levels and achievements | PARTIAL | `src/lib/progression.ts`, `src/data/achievements.ts`, `src/lib/atlas-store.tsx` | Expand Atlas Man attributes, Knowledge Points and collaborative progression | 2/6 |
| Spaced repetition | PARTIAL | `src/lib/memory.ts`, review questions and review route | Validate broader learning outcomes and queue behaviour | 2 |
| Profile and local data | PARTIAL | `src/lib/atlas-store.tsx`, `src/routes/profile.tsx`, data controls | No account-backed profile, cross-device sync or server-side export/deletion | 1 |
| Progress backup | PARTIAL | Existing local import/export; new validation in `src/lib/progress-backup.ts` with tests in `src/lib/progress-backup.test.ts` | Await CI verification; exercise real browser export/import and legacy backups | 1 |
| Atlas Guide | PARTIAL | `src/lib/agent.ts`, `src/lib/ai/guide.ts`, `src/lib/ai/prompt.ts`, `src/routes/guide.tsx` | Only library fallback and optional local model path; no hosted Head AI | 3 |
| AI provider adapters | PARTIAL | `src/lib/ai/providers.ts`, `src/lib/ai/config.ts`, `src/lib/ai/types.ts` | No server-side credentials, provider routing or global quota enforcement | 3 |
| Agent catalog | PARTIAL | `src/lib/ai/agents.ts`, `src/lib/ai/pipeline.ts` | Catalog must continue to expose only genuinely executable capabilities | 3/4 |
| Live research and verification | NOT IMPLEMENTED | Pipeline reports research unavailable | Source discovery, evidence extraction and independent claim verification | 4 |
| Studio scripts and rendering | PARTIAL | `src/lib/studio/`, `src/routes/studio.tsx` | Deterministic scripts and silent browser WebM; no hosted production | 4 |
| Narration and generated visuals | NOT IMPLEMENTED | No connected TTS or image generation pipeline | Licensed assets, narration, captions and quality checks | 4 |
| Human approval | PARTIAL | Local approval metadata and structural QC in Studio | No server-side review record or publishing gate | 4 |
| Publishing | NOT IMPLEMENTED | No publishing adapter | Authenticated destination, rights review and approval enforcement | 4 |
| Accounts and sessions | NOT IMPLEMENTED | Backend setup documentation only | Lovable Cloud/Auth configuration and secure server identity | 1 |
| Cloud sync and RLS isolation | PREPARED | `docs/backend/README.md`, `docs/backend/schema.sql` | Schema not applied; adapter and two-account isolation tests absent | 1 |
| AI quotas and cost controls | PREPARED | Device-local allowances in `src/lib/ai/usage.ts`; reference tables in SQL | Server-side user/global limits, spend caps, cancellation and emergency-off checks | 3 |
| Payments and subscriptions | PREPARED | `src/lib/commerce/types.ts`, reference SQL and plans route | No checkout, webhook, server entitlements or refunds; payment activation requires approval | 8 |
| Marketplace and creator payouts | PREPARED | Commerce types and publication gates | No active marketplace, payments, payouts or creator moderation backend | 8 |
| Air | NOT IMPLEMENTED | No distributed social intelligence service | Consent controls, recommendation boundaries and user controls | 5 |
| Guilds and messaging | NOT IMPLEMENTED | No secure social backend | Membership, private messaging, blocking, reporting, moderation and isolation | 7 |
| Owner administration | NOT IMPLEMENTED | Reference owner tables and setup documentation only | Server-side owner role, audited admin functions and authoritative metrics | 9 |
| Institutional Atlas | NOT IMPLEMENTED | Reference schema and master directive | Organisations, teacher permissions, classrooms, assignments and safeguarding | 10 |
| Production monitoring | PREPARED | Browser-local status route and snapshots | No scheduled server checks or authoritative platform metrics | 11 |

## Current sprint: progress integrity

The first foundation task adds a dedicated progress-backup boundary:

- Accept supported v1/v2 backups and legacy records with progress fields.
- Reject malformed JSON, unsupported versions and oversized input before changing application state.
- Rebuild the state from known fields instead of spreading arbitrary imported properties.
- Bound list sizes, string lengths, numeric values, progress fractions and memory parameters.
- Validate category IDs and calendar dates.
- Drop malformed nested progress, history, quest, memory and review entries.
- Preserve legacy watched-card migration and legacy daily XP.
- Route both local hydration and explicit import through the same validator.

Files changed on the development branch:

- `src/lib/progress-backup.ts`
- `src/lib/progress-backup.test.ts`
- `src/lib/atlas-store.tsx`
- `.github/workflows/ci.yml`

The workflow runs unit tests, ESLint, TypeScript and a production build. The initial
`npm ci` attempt exposed pre-existing lockfile drift and stopped before those checks.
The workflow install step was changed to `npm install --no-audit --no-fund` to let
verification proceed while the lockfile issue is investigated. This is a temporary
verification workaround, not a declaration that the lockfile is fixed.

## Known security and architecture risks

1. The reference SQL policy `creator_profiles_own_update` needs review: the inspected
   policy allows creator-owned profile updates but does not visibly constrain sensitive
   status fields. Do not apply the reference schema until this is corrected and reviewed
   through Lovable Cloud.
2. Browser-local quotas are bypassable and are not financial controls.
3. Client-only identity or hidden admin routes must never be used as authorisation.
4. External model endpoints can receive learner prompts; the current UI warns about
   non-loopback endpoints and does not support credentials.
5. The app is local-first. A failed cloud connection must never erase local learner data.
6. Several large modules, including `src/lib/agent.ts`, `src/lib/atlas-store.tsx`
   and `src/routes/studio.tsx`, should be refactored only behind focused tests.

## Dependencies and approval boundaries

- Authentication, sync, owner functions and server-side quotas require Lovable Cloud
  configuration and reviewed RLS policies.
- TTS, hosted AI, storage, payments and creator payouts require provider choices,
  secrets and explicit cost/activation approval.
- Database schema changes must be made through Lovable Cloud, not by manually editing
  managed migrations or applying this reference SQL from the application branch.
- Production deployment and live payments remain disabled pending explicit approval.

## Next implementation order

1. Fix the package manifest/lockfile mismatch and establish passing CI.
2. Complete backup import/export tests and preserve local data on all failure paths.
3. Review the backend schema and owner/creator policies before any activation.
4. Implement authenticated identity and account lifecycle through Lovable Cloud.
5. Add local-first cloud synchronisation and two-account isolation tests.
6. Continue core learning and mastery improvements.
7. Build server-side AI orchestration, quotas and cost controls.
8. Implement research/verification and human-reviewed content production.
9. Add Air and social functionality only with privacy and moderation foundations.
10. Add payments, administration and institutional features after secure backend foundations.
11. Complete accessibility, performance, monitoring, backup and end-to-end readiness.

## Verification record

Update this section after each task with the exact commit, commands, workflow run,
results, remaining work, blockers, costs and risks. Never mark a feature COMPLETE
without execution evidence.
