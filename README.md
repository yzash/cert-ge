# Mozart Frontline (MVP)

AI-first mobile app for Certis security and facilities officers, built from [`docs/PRD.md`](docs/PRD.md). Demo-grade, synthetic data, runs end to end with no backend (DEMO mode) and has a LIVE path to Gemini Enterprise and GEAP behind a flag.

**Try it:** `pnpm install && pnpm dev`, then open http://localhost:8081 in a desktop browser. The phone frame and a presenter rail appear side by side. Follow [`docs/run-of-show.md`](docs/run-of-show.md).

## What's in the build

| PRD | Feature | Where |
|---|---|---|
| F1 | Shift Home: tasks ranked by SLA and proximity, briefing with acknowledge, alarms, big mic | `apps/mobile/app/(tabs)/home.tsx` |
| F2 | Ask Mozart: streamed answers with citation chips, document viewer, escalate, EN/MS/ZH/TA, offline cache of last 20 | `(tabs)/ask.tsx`, `doc/[id].tsx` |
| F3 | Voice-to-Report: hold to talk, live transcript, draft with per-field confidence, low-confidence fields gated, photo, offline save | `report.tsx` |
| F4 | Visual SOP Verification: QR/visual asset match, Pass/Attention/Fail, next SOP step, override with reason, low-confidence retake | `verify.tsx` |
| F5 | Shift Handover: generated from the shift's records, every line linked to its source, edit, sign, incoming acknowledges | `handover/` |
| F6 | Friction Log: two taps, status timeline, decision text, push on change | `friction.tsx` |
| F7 | Guard tour: checkpoint scan, voice note → structured observation, missed-checkpoint banner + supervisor alert | `(tabs)/tour.tsx` |
| F8 | Emergency alert: full-screen takeover, acknowledge, SOP card, live ack rate | `src/components/chrome.tsx`, Team → Alerts |
| F9 | Supervisor tab: shift board with blocked flags, closures with evidence, friction queue, handovers, site instructions | `(tabs)/team.tsx` |
| F10 | HQ feedback loop (web): themes by site/category, weekly trend, Decide (Change SOP / Fix equipment / No change), published updates with ack rates, audit log | `app/hq/index.tsx` |

Plus: sign-in stub with language picker (screen 1), Tasks with Mobility V2 status pills and a Verify shortcut (3), work-order detail with Speak note / Verify / Attach and evidence-gated close (4), Me with offline queue, GE seat, DEMO/LIVE switch and audit trail (12), dark mode by default.

## Architecture

```
Expo app (Android / web)  ──commands (idempotent, offline outbox)──▶  BFF /api/v1 (Next.js 15)  ──▶ Mozart action layer (confirmed writes only)
        │  getAi(): one interface                                         │
        ├─ DEMO: scripted fixtures + heuristics, on device                ├─ GE streamAssist (officer WIF token)
        └─ LIVE: via BFF ─────────────────────────────────────────────────┴─ GEAP agents on Gemini 2.5 Flash / Flash-Lite, Model Armor
```

- The same reducer (`packages/actions`) runs on the device (optimistic, offline) and on the BFF (`POST /sync`).
- Commands that write a WorkOrder, Incident or Briefing are rejected without `confirmedBy`/`confirmedAt`.
- In the web demo each browser tab is a device; all tabs share one world, so the Faizal → Mei Ling → Raj loop works with no server. Me → Sync: BFF switches to the shared BFF for multi-phone demos.

Deviations from the PRD are in [`docs/adr/`](docs/adr): Expo SDK 54 instead of RN 0.76, HQ as a route of the web build, AsyncStorage outbox instead of SQLite, and the LIVE wiring status.

## Checks

```bash
pnpm typecheck
pnpm test          # domain tests: ranking, invariants, idempotency, evidence-gated close, the full friction → SOP → briefing loop
pnpm evals         # DEMO: Q&A 48/50 cited correctly (96%), voice 12/12, verification 10/10
pnpm build:web && npx serve -s apps/mobile/dist -l 8081 &
pnpm demo:check -- http://localhost:8081 3   # Playwright run-of-show, three clean runs
```

## LIVE mode

Set the variables in `apps/bff/.env.example`, run `pnpm dev:bff`, then in the app: Me → AI mode LIVE and BFF URL. Without a Google tenant every LIVE call falls back to the DEMO answer with a visible badge (`node scripts/check-live-fallback.mjs`). See ADR-0003 for what is wired and what still needs a tenant to test.
