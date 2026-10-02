# ADR-0002: HQ view as a route of the Expo web build; AsyncStorage outbox instead of SQLite

**Status:** accepted · 2 Oct 2026

## Context
The PRD lists `apps/hq` as a separate Next.js app and SQLite via Expo for the offline queue. The demo must run network-independent, and the run-of-show's loop (Faizal → Mei Ling → Raj → Faizal) must close "on stage, in under 2 minutes".

## Decision
1. The HQ feedback view is the `/hq` route of the Expo web build (`apps/mobile/app/hq`). It uses the same schemas, reducer and AI interface as the officer app.
2. On the web build, the "server" (Mozart + Firestore stand-in) is `localStorage`, shared by all tabs, and each tab's device state is `sessionStorage`. One browser, three tabs = three devices on one world, with no backend. With `Sync: BFF` selected in Me, the same commands replay against `apps/bff` instead, for multi-phone demos.
3. The offline outbox is an ordered list of commands with idempotency keys persisted in AsyncStorage (localStorage/sessionStorage on web). `expo-sqlite` on web needs WASM and cross-origin isolation headers, which most static hosts used for demos don't send.

## Consequences
- One static deploy runs the whole demo; HQ works offline from the presenter's laptop.
- For production, HQ reads BigQuery through the BFF (`GET /hq/themes`); swapping the data source does not change the screens.
- Moving the outbox to SQLite later is a storage-adapter change in `apps/mobile/src/store/storage.ts`.
