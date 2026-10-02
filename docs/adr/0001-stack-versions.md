# ADR-0001: Expo SDK 54 / React Native 0.81 instead of RN 0.76

**Status:** accepted · 2 Oct 2026

## Context
The PRD names React Native 0.76 with Expo and Next.js 15 for the BFF. RN 0.76 (Expo SDK 52) pins React 18; Next.js 15's App Router needs React 19. In a pnpm monorepo two React majors would be resolved side by side, which is a common source of "invalid hook call" failures in Metro.

## Decision
Use Expo SDK 54 (React Native 0.81, React 19.1) for `apps/mobile`, matching React 19.1 in `apps/bff`. Keep `node-linker=hoisted` so Metro resolves workspace packages.

## Consequences
- One React version across the repo. New Architecture is on by default.
- Android 10+ is still supported (SDK 54 min SDK 24).
- If Certis must stay on 0.76 for the field trial, the app code uses no 0.77+ APIs; only `package.json` versions change.
