# Atlas AI agents and orchestration

Last reviewed: 26 November 2026

## Core distinction

- **Agent** — a specialised workflow with responsibilities, tools and permissions.
- **Model** — the language or reasoning engine used by an agent.
- **Provider** — the service that supplies the model.
- **Tool** — a bounded operation an agent is allowed to perform.

An agent catalogue entry is not proof of an active integration. Only expose an agent as available when its actual execution path exists.

## Current implementation

The current catalogue is `src/lib/ai/agents.ts`; the local Studio pipeline is `src/lib/ai/pipeline.ts`.

| Agent | Catalogue status | Actual implementation |
|---|---|---|
| Research | NOT IMPLEMENTED | No live web-research provider; Studio uses reviewed lesson notes |
| Source verification | PARTIAL / available | Checks URL syntax, labels and source completeness; does not verify factual claims |
| Script | PARTIAL / available | Deterministic slide/script assembly from existing lesson copy |
| Quality | PARTIAL / available | Structural QC for copy, captions and slide structure; human factual review remains required |
| Narration | NOT IMPLEMENTED | No TTS engine; output is silent |
| Visuals | PARTIAL / available | Text-led slides, accents and lower thirds; no generative imagery |
| Subtitles | PARTIAL / available | WebVTT and burned-in captions from slide copy |
| Render | PARTIAL / available | Browser Canvas + MediaRecorder WebM, subject to browser support and user consent |
| Categorisation | PARTIAL / available | Deterministic category assignment from reviewed metadata |
| Recommendations | PARTIAL / available | Local scoring using interests, progress, memory and due reviews |
| Atlas Guide | PARTIAL / model-gated | Optional browser/Ollama/local OpenAI-compatible model; deterministic library fallback |

The Studio pipeline explicitly marks research and narration unavailable, keeps approval human-required and does not publish automatically.

## Current provider architecture

`src/lib/ai/providers.ts` supports:

- Browser-managed on-device LanguageModel API.
- Ollama on a user-configured local endpoint.
- Local OpenAI-compatible endpoint.

Consent is required before model processing. The current adapters run from the browser; there is no hosted Head AI gateway, server-side token accounting or paid provider fallback.

`src/lib/ai/usage.ts` stores device-local allowances. These limits are not enforceable financial controls.

## Target orchestration

A future Head AI service should:

1. Classify the task and choose a genuinely available agent.
2. Choose an approved model/provider for that task.
3. Check per-user, per-agent, per-provider and global budgets before execution.
4. Validate inputs and permissions for each tool.
5. Apply timeouts, concurrency limits and bounded retries.
6. Deduplicate jobs and reuse cached outputs where safe.
7. Record actual token usage, latency, status and cost.
8. Stop immediately on cancellation, quota exhaustion or emergency shutdown.
9. Return a graceful deterministic fallback where possible.
10. Preserve provenance and uncertainty in outputs.

The Head AI must not override budget limits or user consent. Paid fallback remains disabled until explicitly approved.

## Content production stages

```text
Research → Verification → Script → Production → Quality Review → Human Approval → Publishing
```

Every stage needs a defined input/output contract, status, execution record, retry policy and error state. Cost tracking applies to paid operations. Publishing must require human approval whenever factual accuracy, rights or safety cannot be reliably established.

## Evidence and verification rules

- A valid URL is not proof of accuracy.
- A model must not certify its own factual claims without independent evidence checks.
- Record source title, publisher, date, URL and relevant claim/evidence association.
- Distinguish verified fact, inference, hypothesis and uncertainty.
- Do not invent citations or source metadata.
- Preserve human review for high-impact educational claims and licensing.

## Implementation order

1. Keep catalogue statuses honest and tested.
2. Define typed input/output contracts for agents and tools.
3. Add a server-side orchestration boundary only after backend identity and quotas exist.
4. Implement a real research provider with source provenance and rate limits.
5. Implement independent verification with evidence coverage.
6. Add provider token accounting, budgets, cache, idempotency and cancellation.
7. Add TTS/visual generation only after licensing and spend approval.
8. Connect publishing only behind an audited human-approval gate.
