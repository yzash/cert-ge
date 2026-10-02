# ADR-0003: LIVE mode wiring (Phase 4)

**Status:** implemented behind flags; untested against a real tenant · 2 Oct 2026

## What exists
| Concern | Where | Notes |
| --- | --- | --- |
| Identity | `packages/ai/src/google/wif.ts`, `POST /api/v1/auth/exchange` | Stub IdP issues a JWT-shaped session token. When `WIF_AUDIENCE` is set and a real IdP token is sent, the BFF exchanges it at STS and caches the access token per officer (in-memory; Memorystore in production). |
| Grounded Q&A | `packages/ai/src/google/streamAssist.ts`, `POST /api/v1/ask` (SSE) | Discovery Engine `assistants/default_assistant:streamAssist` with the officer token. The streamed JSON array is parsed incrementally; grounding references become citation chips. No references → `grounded: false`. |
| Structured extraction | `agents.ts#extractAgent`, `POST /reports/extract` | Gemini 2.5 Flash with a JSON response schema, Zod validation, then deterministic validators (asset / zone / SOP ids must exist; null fields get confidence 0). |
| Visual verification | `agents.ts#verifyAgent`, `POST /verify` | Real JPEG/PNG/WebP photos only. The SVG demo scenes are DEMO-only (Gemini does not take SVG). |
| Handover | `agents.ts#handoverAgent` | Source refs that don't match a real record are dropped. |
| Clustering / SOP drafts | `clusterAgent`, `sopEditAgent` | Flash-Lite for clustering. Production runs clustering as a nightly Workflows + GEAP batch into BigQuery. |
| Safety | `modelArmor.ts` | Prompts screened before every agent call; Ask answers screened before display. Currently fails open when Model Armor itself is unreachable: confirm this policy with Certis security. |
| Mozart writes | `packages/actions/src/mozart.ts` | Only confirmed commands, `Idempotency-Key` = command key. Endpoint paths are assumptions (PRD open question 1). |

## Deviations
- GEAP agents are called as Gemini `generateContent` with the agent's prompt and schema from the BFF, not yet deployed to Agent Engine. Moving them is a deployment change; the prompts and validators stay.
- `WS /voice/session` (Gemini Live proxy) is not in the BFF: Next.js route handlers can't hold WebSockets. It belongs in a separate Cloud Run service; the endpoint returns 426 with that note. DEMO voice uses scripted transcripts, or the browser's speech recognition on Chrome.

## To switch on
1. Provision the GE engine per site with data stores for SOPs, manuals, notices and incident summaries (fixture docs are in `packages/fixtures/src/docs.ts`, `geDocId` = `ge-doc-<sop id>`).
2. Fill `apps/bff/.env` from `.env.example`, deploy the BFF to Cloud Run (`infra/`).
3. In the app: Me → AI mode LIVE, BFF URL. Run `pnpm evals -- --live <bff>`; the Phase 4 gate is Q&A precision ≥ 90%.
