# ADR-0005: v2 chat-first experience at /v2, alongside v1

**Status:** accepted · 5 Oct 2026

## Context
Feedback: the first screen for everyone should be a chat, laid out like the Gemini Enterprise app (centred conversation), with a cleaner, more modern UI in Certis navy and orange. The original version should stay available.

## Decision
- v2 lives at `/v2` in the same Expo app and deployment; v1 stays at `/`. Both share the domain layer (schemas, reducer, AI interface, data), so one data change shows in both.
- The chat is our own UI (option B), not an embedded Gemini Enterprise page: embedding can't trigger our action cards, needs a live tenant, and doesn't work offline. In LIVE mode the same chat calls Gemini Enterprise (`streamAssist`) and a GEAP router agent through the BFF.
- A message goes through an intent router (`packages/ai/src/router.ts`; DEMO rules, LIVE Gemini Flash-Lite via `POST /chat/route`) and either streams a cited answer or drops an interactive card (report, verify, handover, friction, leave, payslip, claim, swap, roster, licence, robots, approvals, team, alert, themes). Cards end in a confirm tap.
- Layout: centred column (max 760 px), sidebar on desktop, drawer on phones, detail side panel / bottom sheet. Inter type, light by default with a dark mode for night shift, orange reserved for the primary action.

## Consequences
- v1 screens are untouched; `pnpm demo:check` (v1) and `pnpm demo:check:v2` both run.
- The router was tuned against its own eval set (`packages/evals`), so the 32/32 score is a regression check, not an independent accuracy measure. A held-out set from real officer phrasing is needed before the trial.
