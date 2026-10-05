# Mozart Frontline: build conventions

AI-first app for Certis frontline officers (see `docs/PRD.md`). Demo-grade, synthetic data, DEMO mode by default with LIVE behind a flag.

## Layout

```
apps/mobile     Expo SDK 54 (React Native 0.81), Android + web. v1 officer app at /, HQ view at /hq; v2 chat-first app at /v2 (src/v2)
apps/bff        Next.js 15 route handlers, /api/v1/* (the PRD's BFF contract), LIVE wiring to GE / GEAP
packages/schema    Zod schemas for every entity (single source of truth)
packages/fixtures  Synthetic Canopy Mall: 18 officers, 120 assets, 30 SOPs, 40 Q&A, 12 voice clips, 10 images, 8 weeks of friction logs
packages/ai        One AiProvider interface; DEMO (scripted + heuristics) and LIVE (via BFF); src/google = server-only GE/GEAP clients
packages/actions   Commands, the reducer (action layer), selectors, Mozart write client
packages/ui        Design tokens (Certis navy/orange, 44 pt targets, 16 pt body)
packages/evals     Q&A / voice / verification eval harness
scripts/           Playwright run-of-show and LIVE-fallback checks
```

## Rules (do not break these)

1. **The app never branches on DEMO vs LIVE.** Screens call `getAi()` (apps/mobile/src/store/app.ts). Mode lives inside `packages/ai`. LIVE failures fall back to DEMO and the UI shows a `LIVE failed · DEMO answer` badge, never a blank screen.
2. **No write without a human tap.** Every state change is a `Command` (`packages/actions/src/commands.ts`). Commands in `CONFIRM_REQUIRED` (anything that writes a WorkOrder, Incident or Briefing, every HR write, every robot command) must carry `confirmedBy` + `confirmedAt`; the reducer throws otherwise. Only pass `{ confirm: true }` to `dispatch` from an explicit officer button press.
3. **AI output is validated before use.** Zod on every model output; LIVE agents also run deterministic validators (ids must exist in the site register). Invalid output is a logged failure with a fallback, never a crash.
4. **Grounded or silent.** Ask Mozart answers only with citations; no citation → "I don't have that in the site documents" + Escalate.
5. **Offline-first.** Commands queue in the device outbox with idempotency keys and replay in order (`POST /sync`). The same reducer runs on device and server.
6. **Fixtures are the spec.** A feature is done when it runs on fixtures, offline, and `pnpm test`, `pnpm evals` and `pnpm demo:check` pass.
7. Never put a model id or secret in the app bundle. LIVE config is BFF env only (`apps/bff/.env.example`).

## Commands

```bash
pnpm install
pnpm dev                 # Expo web on :8081 (press a for Android)
pnpm dev:bff             # BFF on :8787
pnpm typecheck
pnpm test                # domain tests (loop, invariants) + evals
pnpm evals               # DEMO evals; `pnpm evals -- --live http://localhost:8787` for LIVE
pnpm build:web && npx serve -s apps/mobile/dist -l 8081 &
pnpm demo:check          # v1 Playwright run-of-show against :8081
pnpm demo:check:v2       # v2 (chat-first) run-of-show
```

## Conventions

- Use `npx expo install` for Expo packages. Routes live in `apps/mobile/app/`, non-route code in `apps/mobile/src/`.
- On web, each browser tab is a separate device (sessionStorage) sharing one world (localStorage). On Android everything is AsyncStorage.
- v2 chat cards never write on render; each ends in an explicit button that dispatches a confirmed command. Pay amounts are never written into chat history.
- Zustand selectors must return stable values (no `.filter()` inside the selector) or React loops (error #185).
- New entity → schema first, then fixture, then reducer case + test, then UI.
- Commit per feature, PR per phase, ADR in `docs/adr/` for any deviation from the PRD.
