# ADR-0004: Corporate services and robots are in scope

**Status:** accepted · 5 Oct 2026 (team feedback after the first showing)

## Context
The PRD put rostering, leave, payroll and training out of scope ("stay in Certis HR systems"), and robotics coordination out of scope ("Mozart owns it"). Feedback: officers should do corporate actions in the same app, and the control tower should monitor and manage the patrol and cleaning robots on the ground.

## Decision
- **Corporate services** (leave, MC, balances, payslips, claims, shift swaps, roster, licence renewal) run in chat as cards, against Certis's in-house HR system. The integration is assumed (REST, idempotent POSTs, the officer's identity): `packages/actions/src/mozart.ts#createHrClient`, enabled with `HR_API_URL` on the BFF.
- **Robots** (2 patrol, 3 cleaning at Canopy Mall) appear in a control tower (`/v2/control`) and in chat. Commands (patrol, clean, go to, pause, resume, return to dock) go through the action layer to the fleet API (endpoint shapes assumed). A robot detection can be turned into an officer task; when the officer closes it, the robot resumes.
- The confirm-before-write rule is extended: HR writes and robot commands are in `CONFIRM_REQUIRED`.
- Pay data: amounts are masked until the officer taps, never written into chat history, and payslip PDFs come from the HR system in production.
- HR policy documents are grounding documents, so policy questions ("how many days of leave do I get?") get cited answers, while personal data ("how many days do I have left?") comes from the HR card.

## Consequences
- New entities in `packages/schema`; schema version 4 (browsers reseed once).
- Robot positions in the demo are computed from each mission and the clock (`packages/actions/src/robots.ts`), so all tabs agree without telemetry traffic. Production replaces this with fleet telemetry in the same `RobotPose` shape.
- Payroll is more sensitive than anything else in the app: confirm PDPA handling and whether payslips may be shown on BYOD devices before the field trial.
