# Certis AI-Transformed Frontline App — MVP PRD

Oct 2, 2026 · @Yash Thakker

## Summary

This PRD specifies "Mozart Frontline", an AI-first mobile app for Certis security and facilities officers, built as a Claude Code MVP that demonstrates the Gemini Enterprise collaboration on top of what Certis already runs in Mozart Mobility V2. The MVP is a demo-grade Android/web app on synthetic data that runs end to end without live backends, with a LIVE mode behind feature flags for Gemini Enterprise and GEAP once a tenant is available.

**Why Certis.** Certis is a Temasek-owned integrated security and operations provider, Singapore's largest auxiliary police force, with roughly 7,000 employees in the Singapore entity and about 33,000 globally. Mozart is its proprietary command-and-control platform, deployed at Jewel Changi, hospitals, aviation and city districts, and now licensed as standalone software in markets where Certis has no manpower presence. Leadership has publicly committed to AI literacy for 2,000 supervisors and 5,000 professionals by end 2027. The frontline officer is where Mozart's intelligence stops today: the command centre sees everything, the officer gets a work-order list.

**Why now.** Google Cloud's proposed collaboration (slide 15, "Frontline Worker Empowerment") scopes a purpose-built Gemini Enterprise mobile app, hands-free reporting and a field-to-HQ feedback loop. DevX's SAARTHI PRD and headless-GE architecture give a proven pattern: streamAssist for grounded answers with per-user ACLs, GEAP agents for structured work, a separate action layer for anything that mutates Mozart. This PRD reuses that pattern and points it at Certis's domain.

**What this PRD covers.** The officer and supervisor app, the HQ feedback view, the Gemini Enterprise integration contract, data model, non-functional requirements and a phased build plan Claude Code can execute. It does not redesign Mozart's backend or command centre; the app reads and writes through Mozart's existing CMMS/work-order APIs (assumed, see Open questions).

Sources: [Mozart platform page](https://www.certisgroup.com/solutions/advanced-technology-solutions/mozart/), [Mozart Mobility V2 on Google Play](https://play.google.com/store/apps/details?id=com.certisgroup.mifmv2&hl=en_SG), [Certis x SUTD AI literacy](https://hrhub.my/certis-and-singapore-university-of-technology-and-design-to-enhance-ai-literacy-and-professional-growth/), [The Fast Mode interview on Mozart](https://www.thefastmode.com/q-a-series/49924-orchestrating-physical-operations-with-ai-automation-and-mozart), [MDDI remarks, Career Forward 2026](https://www.mddi.gov.sg/newsroom/remarks-by-sms-tan-kiat-how-at-mediacorp-s-career-forward-2026/), [Tracxn profile](https://tracxn.com/d/companies/certis/__Plq7OkAjwlzFEZfLM9ex96LaFDPz5pj99u4qmTBr3mA).

## What Certis already has

Mozart Mobility V2 is a solid CMMS mobile client: work orders, QR-tagged assets, photos, signatures, push, chat, and (per the July 2026 release) guard tours. It has no AI surface for the officer, no voice, no camera understanding, and no channel for the officer to tell HQ that an SOP or a piece of equipment is broken. Those four gaps are the product.

**Mozart platform (command centre side).** Unified operations dashboard across CCTV, IoT, BMS and enterprise systems; AI video analytics and incident routing; digital SOPs with escalation rules; smart dispatch by proximity, skills and workload; workforce analytics (utilisation, fatigue, SLA); robotics fleet coordination. Deployed cloud, hybrid or on-prem.

**Mozart Mobility V2 (officer side, Play Store, 5K+ installs, 4.0 stars, 23 reviews, updated 28 Jul 2026).** Screens visible in the listing: email sign-in with Remember me; home dashboard with active work-order counts (corrective vs planned) and a CWO-by-service-category donut; corrective work-order list with status pills (Assignment, Acknowledgement, Closed, In Progress) and in-progress / completed / on-hold counts; work-order detail with a step checklist (Inform operator, Rectify, Close the job) and completion states; signature capture with online/offline expected-connectivity toggle and Reject / Acknowledge actions.

| Capability | Mobility V2 today | Mozart Frontline MVP |
| --- | --- | --- |
| Work orders (corrective, planned, ad hoc) | Yes | Keep, same data model |
| QR asset scan, photo/video attachments, signature | Yes | Keep |
| Push notifications, work-order chat | Yes | Keep, add FCM emergency alert class |
| Guard tour | Yes (new) | Keep, add voice checkpoint notes |
| Offline mode | Partial (signature toggle) | Full offline-first queue |
| Grounded Q&A on SOPs, site rules, asset manuals | No | New, Gemini Enterprise streamAssist |
| Voice-to-report | No | New, Gemini Live / Chirp |
| Visual SOP verification (camera on panel, alarm, gate) | No | New, Gemini multimodal via GEAP |
| Shift handover summary | No | New, GEAP agent |
| Friction logging (equipment, SOP, site) | No | New |
| HQ feedback clustering and sentiment | No | New, GEAP batch + BigQuery |
| Policy update pushed into officer briefing | No | New |
| SSO (Certis IdP) | Email/password | WIF federation, per-user GE licence |

Review signals worth noting: a 2025 review asks how to scan a QR when none exists, which points at onboarding and asset-tag coverage gaps the voice path can route around.

## Users and jobs to be done

Three personas, all synthetic for the MVP. Primary is the officer; the supervisor and HQ ops lead exist to close the loop the slide calls out.

| Persona | Who | Context | Top jobs |
| --- | --- | --- | --- |
| Officer (Faizal, Security Officer, Jewel Changi, night shift) | Uniformed security or IFM technician, 12-hour shifts, often on patrol with one hand free, mixed English/Malay/Mandarin, mid-range Android | Patrols, alarm response, work orders, guard tour checkpoints, incident reports typed at end of shift | 1. Know what to do right now (next task, SOP step) without scrolling. 2. Report an incident or fault by speaking, not typing. 3. Confirm a panel or gate state is correct without calling the ops centre. 4. Hand over to the next shift in under 2 minutes. 5. Flag that an SOP or tool does not work in the field. |
| Supervisor (Mei Ling, Site Supervisor, 14 officers) | Runs the shift, approves work orders, fields escalations from officers and from the command centre | Phone and a laptop in the site office; reviews handovers, re-assigns tasks, signs off closures | 1. See which officers are blocked and why. 2. Approve or reject closures with evidence. 3. Push a site-specific instruction to tonight's briefing. 4. Review friction logs before they reach HQ. |
| HQ Ops Lead (Raj, Head of Security Operations, district) | Owns SOPs and rostering across 20+ sites; reports to COO | Mozart command centre plus this app's HQ view | 1. See clustered friction themes and sentiment by site and week. 2. Decide which SOP to change and push the update. 3. Measure time-to-report, time-to-close and briefing acknowledgement. |

**Jobs the officer will not do in the app:** rostering changes, leave, payroll, training (these stay in Certis HR systems).

**Accessibility constraints that shape every screen:** one-thumb operation, gloves, low light, 44 pt tap targets, voice as a first-class input, text at 16 pt minimum, works on Android 10+ with 3 GB RAM.

## Vision, goals and success metrics

**Vision.** Every Certis officer carries the whole of Mozart's intelligence in one hand, and every officer's experience flows back into Mozart's SOPs within a week. The command centre stops being the only place where the system thinks.

**Product principles**

1. Voice first, typing optional. Anything the officer can type, they can say.
2. Grounded or silent. Every AI answer cites the SOP, manual or notice it came from; no citation, no answer.
3. AI drafts, officer confirms, Mozart records. No model ever writes to a work order without a human tap.
4. Works at 0 bars. Core flows queue offline and sync later.
5. The loop closes. A friction log that nobody acts on is noise; the HQ view exists to force a decision.

**MVP goals (demo-grade, 6 weeks)**

- Show the five officer flows and the HQ loop end to end on synthetic Jewel-like site data, scripted and network-independent.
- Keep LIVE mode behind a flag for grounded Q&A and voice-to-report, switched on against Certis's own Google Cloud account after the product-team showing; not required for v1.
- Give Certis a build they can put in front of 10 officers at one site for a two-week field trial.

**Success metrics (targets for the field trial, measured in-app and in BigQuery)**

| Metric | Baseline (Mobility V2, assumed) | Target |
| --- | --- | --- |
| Time from incident to logged report | 15 to 30 min (typed at end of patrol) | Under 90 seconds via voice |
| Work orders closed with evidence attached | Unknown, estimated 60% | 95% |
| Calls to ops centre for "is this state correct" | Not measured | Down 50% at trial site |
| Shift handover time | 10 to 20 min verbal | Under 3 min, written, acknowledged |
| Friction logs per officer per week | 0 (no channel) | 2 or more |
| Friction log to HQ decision | No loop | Under 7 days, decision recorded |
| Briefing acknowledgement rate | Not measured | 90% within 30 min of shift start |
| Grounded answer precision (cited source correct) | n/a | 90% on a 50-question eval set |

Baselines marked assumed need confirmation from Certis ops data; see Open questions.

## MVP scope: feature requirements

Ten features. P0 ships in the demo build; P1 ships for the field trial; P2 is designed but stubbed. Each feature has a DEMO path (scripted fixtures, no network) and a LIVE path (real Gemini Enterprise / GEAP calls behind a flag).

### F1. Shift Home (P0)

Replaces the Mobility V2 dashboard with a "what now" surface. Shows: current shift and site, the next three tasks ranked by SLA deadline and proximity, today's briefing card with unread policy updates, open alarms assigned to me, and a single large microphone button.

Acceptance: opens in under 1.5 s on cached data; top task is always the one with the nearest SLA breach; briefing card shows an Acknowledge button that records a timestamp; works fully offline from the last sync.

### F2. Ask Mozart, grounded Q&A (P0)

Text or voice question against the site's SOPs, asset manuals, site rules, incident history and today's notices. Answers stream back with inline citations to the source document and section. Follow-up questions keep session context. Multilingual: English, Malay, Mandarin, Tamil input; answer language follows the question.

LIVE: Gemini Enterprise streamAssist with the officer's own WIF token, data stores scoped to the officer's site via ACLs. DEMO: 40 scripted Q&A pairs with fake citations.

Acceptance: every answer shows at least one citation chip that opens the source; a question with no grounded answer returns "I don't have that in the site documents" plus an Escalate to supervisor button; p50 first token under 2 s in LIVE.

### F3. Voice-to-Report (P0)

Push-to-talk capture of an incident, fault or observation. Speech is transcribed, then a GEAP agent extracts a structured draft: type (incident, corrective work order, observation, hazard), location (from GPS plus the nearest asset tag or spoken reference), asset, severity, description, and recommended SOP. The officer reviews a card, edits any field, attaches a photo, and taps Submit. Submit writes to Mozart as a work order or incident through the action layer.

LIVE: Gemini Live for streaming transcription with Chirp STT as fallback; GEAP structured extraction on Gemini Flash; action layer POSTs to the Mozart work-order API. DEMO: 12 pre-recorded audio clips with scripted extractions.

Acceptance: a 20-second spoken report produces a filled card in under 6 s; required fields that the model could not infer are highlighted, never silently guessed; the submitted work order appears in the Mobility V2-style list within 2 s; offline recordings are queued and marked Pending sync.

### F4. Visual SOP Verification (P0)

Officer points the camera at a fire panel, alarm indicator, gate, or meter. The app identifies the asset (QR if present, else visual match against the site asset register), pulls the SOP's expected state, and returns Pass / Attention / Fail with the reason and the next SOP step. Result is attached to the active work order or guard-tour checkpoint.

LIVE: Gemini 2.5 multimodal via GEAP with the SOP expected-state table as context. DEMO: 10 fixture images with scripted verdicts.

Acceptance: verdict and reason in under 5 s; the officer can override the verdict with a reason, and the override is logged; low-confidence results say so and ask for a second photo.

### F5. Shift Handover (P0)

At end of shift, one tap generates a handover note from the shift's work orders, incidents, voice reports, open alarms and friction logs. Officer edits, signs, submits. The incoming officer sees it on Shift Home and acknowledges it.

LIVE: GEAP summarisation agent over the shift's structured records. DEMO: scripted summary per fixture shift.

Acceptance: handover generated in under 8 s; every item in the summary links to its source record; incoming officer's acknowledgement is timestamped and visible to the supervisor.

### F6. Friction Log (P0)

A two-tap way to say "this doesn't work": pick a category (equipment, SOP step, access, tooling, safety), speak or type a sentence, optional photo. The log is tagged with site, asset, SOP step and officer and sent to the supervisor queue and the HQ feedback store. Officer sees the status of each log they filed (Received, Under review, Decided, Closed) and the decision text.

Acceptance: filing takes under 20 s; the officer gets a push when status changes; no free-text field is mandatory.

### F7. Guard Tour with voice checkpoints (P1)

Keeps Mobility V2's guard tour (NFC/QR checkpoints, route, timestamps) and adds a voice note at each checkpoint that becomes a structured observation via F3's pipeline.

Acceptance: checkpoint scan and voice note complete in under 15 s; missed checkpoints trigger a supervisor alert after the configured grace period.

### F8. Emergency Alert and Broadcast (P1)

FCM high-priority alerts from the command centre (lockdown, evacuation, BOLO) that override Do Not Disturb, require acknowledgement, and surface the relevant SOP card in one tap.

Acceptance: alert renders full-screen within 3 s of send on a foregrounded or backgrounded device; acknowledgement rate visible to the supervisor live.

### F9. Supervisor View (P1)

Shift board: officers, current task, blocked flags, pending closures with evidence, handover acknowledgements, friction queue with Forward to HQ / Resolve locally. Compose a site instruction that lands in the next briefing.

Acceptance: supervisor can approve a closure in two taps with the evidence visible; a site instruction appears on every officer's Shift Home at next sync.

### F10. HQ Feedback Loop (P1, web)

Friction logs clustered into themes by site, asset type and SOP, with sentiment trend by week. Each theme has a Decide action: Change SOP (opens a draft with the proposed edit), Fix equipment (creates a work order), No change (records reason). Change SOP publishes a policy update that appears in affected officers' briefings with an acknowledgement requirement.

LIVE: nightly GEAP batch job on Gemini Flash-Lite clusters and scores logs into BigQuery; web view reads BigQuery. DEMO: fixture clusters over 8 weeks of synthetic logs.

Acceptance: a decision made in the HQ view appears in the originating officer's Friction Log status and, for SOP changes, in the briefing of every officer at affected sites within one sync cycle.

### Feature priority summary

| ID | Feature | Priority | Slide reference | AI surface |
| --- | --- | --- | --- | --- |
| F1 | Shift Home | P0 | Gemini Mobile App | Ranking only |
| F2 | Ask Mozart | P0 | Gemini Mobile App | GE streamAssist |
| F3 | Voice-to-Report | P0 | Voice-to-Report | Gemini Live + GEAP |
| F4 | Visual SOP Verification | P0 | Visual Inspection | GEAP multimodal |
| F5 | Shift Handover | P0 | Secure Integration | GEAP agent |
| F6 | Friction Log | P0 | Friction Logging | Tagging only |
| F7 | Guard Tour voice | P1 | Gemini Mobile App | Reuses F3 |
| F8 | Emergency Alert | P1 | Secure Integration (FCM) | None |
| F9 | Supervisor View | P1 | Command Center | None |
| F10 | HQ Feedback Loop | P1 | Operational AI, Dynamic Updates | GEAP batch |

## Out of scope for MVP

The MVP does not touch Mozart's backend, command centre UI, rostering, or any armed-response workflow. It also makes no autonomous changes to Mozart records.

- Replacing Mozart Mobility V2 in production, or app-store release under Certis's developer account.
- Mozart command centre dashboards (the HQ view is a thin web page over the feedback store, not a command-centre replacement).
- Smart dispatch, rostering, fatigue scoring, overtime (Mozart Workforce Orchestration owns these; the app only reads assignments).
- Robotics coordination and robot handoff.
- Auxiliary police, armed response, use-of-force or evidence-chain workflows (regulatory review needed before any AI touches these).
- Real CCTV feed access from the phone. F4 uses the phone camera only.
- iOS build (React Native keeps it reachable; Android first because that is the Mobility V2 install base).
- Production identity federation with Certis's IdP. MVP uses a stub IdP that issues the same token shape.
- Autonomous SOP rewriting. F10 drafts an edit; a human publishes it.

**Phase 2 candidates (post-trial):** proactive nudges from Mozart's predictive maintenance into Shift Home; live translation between officer and visitor; wearable push-to-talk; fatigue-aware task pacing; Mozart robot task handoff from the officer's phone; Qatar and Australia localisation.

## Architecture and Gemini Enterprise integration

The app never calls Gemini directly. A thin backend exchanges the officer's identity for a Workforce Identity Federation token, calls Gemini Enterprise and GEAP with that token, and routes any write to Mozart through an action layer that only fires after the officer taps Confirm.

&#91;embedded content: system architecture · app, BFF, three AI/action services, Mozart and the data plane\]

Read paths go up through Gemini Enterprise and GEAP; the only write path into Mozart is the action layer, and the HQ view reads from BigQuery, never from Mozart directly.

**Integration contract (LIVE mode)**

| Concern | Decision | Why |
| --- | --- | --- |
| Identity | Certis IdP (stub in MVP) to GCIP to WIF to STS token, cached in Memorystore per officer | GE licensing and ACLs require per-user tokens; never a shared service account |
| Licence | One GE Frontline seat per officer, auto-assigned on first call, reclaimed after 30 days idle | Frontline SKU needs a 150+ Standard/Plus base; HQ and supervisors on Standard/Plus unlock it |
| Grounded Q&A | Discovery Engine `assistants/default_assistant:streamAssist`, one engine per site, data stores for SOPs, manuals, notices, incident summaries | Per-user ACL at the data-store level scopes officers to their site |
| Structured extraction | GEAP agent on Agent Engine, Gemini 2.5 Flash, JSON schema output, deterministic validators after the model | streamAssist cannot return structured output or take actions |
| Visual verification | GEAP agent, Gemini 2.5 Flash multimodal, SOP expected-state table in context | Phone camera only; no CCTV access from the app |
| Voice | Gemini Live via Cloud Run WebSocket proxy with ephemeral tokens; Chirp 3 STT fallback | Session resumption for patchy connectivity |
| Actions | Cloud Run action layer, idempotent POSTs to Mozart work-order / incident / notice APIs, every call audited in BigQuery | AI output never writes to Mozart without a human tap |
| Clustering | Nightly Cloud Workflows job, GEAP batch on Flash-Lite, results in BigQuery | Cheapest path for a non-interactive workload |
| Residency | GE data stores global or us/eu; officer PII and raw voice in Firestore and GCS in asia-southeast1 | GE has no Singapore region for data stores |
| Safety | Model Armor on every prompt and response, Cloud Armor on the BFF | Prompt injection via spoken reports or photos is a real path |
| Push | FCM high-priority for emergency class, normal priority for the rest | Existing Mobility V2 behaviour, extended |

**Tech stack for Claude Code**

- Mobile: React Native 0.76 with Expo, TypeScript, Android first; web build of the same code for browser demos.
- Backend: Next.js 15 App Router on Cloud Run, Route Handlers for SSE and WebSocket proxy, Zod schemas shared with the app.
- Fixtures: JSON and audio under `/fixtures`, one synthetic site (Jewel-like mall, 14 officers, 120 assets, 30 SOPs, 8 weeks of logs).
- Storage: Firestore (asia-southeast1), GCS for media, BigQuery for metrics and evals, Pub/Sub for events.
- Observability: OpenTelemetry to Cloud Trace, structured logs, per-feature latency dashboards.
- Evals: 50-question grounded Q&A set, 30 voice clips, 20 images, scored on each build.

## Data model, APIs and screens

The data model keeps Mobility V2's work-order shape and adds five entities: VoiceReport, Verification, Handover, FrictionLog and Briefing. Everything AI-generated carries a `draft` flag until the officer confirms.

**Core entities (Zod schemas in `/packages/schema`)**

| Entity | Key fields | Source of truth |
| --- | --- | --- |
| Officer | id, name, role (officer, supervisor, hq), siteId, shiftId, languages, geSeatStatus | Certis IdP / Mozart roster (fixture in MVP) |
| Site | id, name, zones\[\], assets\[\], sops\[\], supervisorIds\[\] | Mozart |
| Asset | id, siteId, type, tag (QR/NFC), location, expectedStates\[\], manualDocId | Mozart CMMS |
| SOP | id, siteId, version, steps\[\], expectedStates\[\], effectiveFrom, geDocId | Mozart, mirrored to GE data store |
| WorkOrder | id (CWO prefix as today), type (corrective, planned, adhoc), status, assetId, assigneeId, steps\[\], attachments\[\], signature, slaDue | Mozart |
| Incident | id, type, severity, location, description, sopId, reporterId, attachments\[\], status | Mozart |
| VoiceReport | id, officerId, audioUri, transcript, extractedDraft (typed), confidence per field, linkedRecordId, syncStatus | App / Firestore |
| Verification | id, workOrderId or checkpointId, assetId, imageUri, verdict (pass, attention, fail), reason, confidence, override, overrideReason | App / Firestore |
| Handover | id, shiftId, outgoingId, incomingId, summary (sections with sourceRefs\[\]), signedAt, acknowledgedAt | App / Firestore |
| FrictionLog | id, officerId, siteId, category, text, assetId, sopStepRef, attachments\[\], status, decisionId | Firestore, nightly to BigQuery |
| Theme | id, weekOf, siteIds\[\], category, label, logIds\[\], sentimentScore, decision (changeSop, fixEquipment, noChange), decisionNote | BigQuery (GEAP batch) |
| Briefing | id, siteId, shiftDate, items\[\] (type: policyUpdate, siteInstruction, alert; sourceId), ackByOfficerId{} | Action layer |

**BFF API (Next.js Route Handlers, all under `/api/v1`)**

| Method and path | Purpose | LIVE backend |
| --- | --- | --- |
| POST /auth/exchange | Officer token to WIF access token, cached | GCIP, STS |
| GET /home | Ranked tasks, briefing, open alarms for the officer | Mozart read + ranking |
| POST /ask (SSE) | Grounded Q&A stream with citations | GE streamAssist |
| WS /voice/session | Streaming transcription | Gemini Live proxy |
| POST /reports/extract | Transcript to structured draft | GEAP extractor |
| POST /reports/confirm | Officer-confirmed draft to Mozart record | Action layer |
| POST /verify | Image plus assetId to verdict | GEAP verifier |
| POST /handover/generate | Shift records to handover draft | GEAP handover agent |
| POST /handover/sign, /handover/ack | Signatures and acknowledgements | Action layer |
| POST /friction, GET /friction/mine | File and track friction logs | Firestore |
| GET /supervisor/board | Shift board | Mozart read + Firestore |
| POST /supervisor/instruction | Site instruction into next briefing | Action layer |
| GET /hq/themes, POST /hq/decide | HQ clusters and decisions | BigQuery, action layer |
| POST /sync | Offline queue replay, idempotency keys | All of the above |

**Screens (officer app, bottom tab bar: Home, Tasks, Ask, Tour, Me)**

1. Sign in. Email plus password stub, Remember me, language picker. Same look as Mobility V2 so officers recognise it.
2. Shift Home (F1). Shift header, next three task cards, briefing card with Acknowledge, open alarms strip, large mic button fixed bottom centre.
3. Tasks. Mobility V2's list, filters, status pills kept; adds a Verify camera shortcut on each work-order step that has an expected state.
4. Work order detail. Mobility V2's step checklist kept; each step gets Speak note, Verify with camera, Attach; Close requires evidence.
5. Ask Mozart (F2). Chat with mic, streaming answer, citation chips that open a document viewer at the section, Escalate button.
6. Voice report (F3). Hold-to-talk sheet, live transcript, then a review card with per-field confidence, edit, photo, Submit, or Save offline.
7. Verify (F4). Camera with asset overlay, verdict card (Pass, Attention, Fail), reason, next SOP step, Override with reason.
8. Guard tour (F7). Route list, checkpoint scan, voice note per checkpoint, missed-checkpoint banner.
9. Handover (F5). Generated sections with source links, edit, sign, submit; incoming view with Acknowledge.
10. Friction (F6). Two-tap file sheet and My logs list with status and decision text.
11. Emergency alert (F8). Full-screen takeover, Acknowledge, SOP card.
12. Me. Profile, language, offline queue status, GE seat status, sign out.

**Supervisor (same app, role-gated tab):** Shift board, Closures to approve, Friction queue, Compose instruction.

**HQ view (web, `/hq`):** Themes by week and site, theme detail with the logs behind it, Decide panel, Published updates list with acknowledgement rates.

**Design system.** Keep Certis Mozart navy and orange from Mobility V2 for brand continuity; typography and spacing follow the DevX Doctrine tokens already used in DevX demo builds. Dark mode mandatory for night shifts.

## Non-functional requirements

Offline, auditability and residency are the three that will decide whether Certis trusts the build; latency and cost decide whether officers use it.

| Area | Requirement |
| --- | --- |
| Offline | All P0 flows usable with no network from the last sync. Voice reports, verifications, friction logs and handovers queue locally (SQLite via Expo) with idempotency keys and replay in order on reconnect. Grounded Q&A offline returns the last 20 cached answers plus a clear "offline, cached" label. |
| Latency | Shift Home under 1.5 s warm; Ask first token under 2 s (p50) and 5 s (p95); voice extract under 6 s; verify under 5 s; handover under 8 s. Measured per build in the eval harness. |
| Audit | Every AI call logged with prompt hash, model, latency, tokens, officer id, and the record it drafted. Every write to Mozart logged with the officer's confirmation timestamp. Retained 2 years in BigQuery. |
| Human in the loop | No Mozart write without a tap. Low-confidence fields (under 0.7) require explicit officer input. Overrides always allowed and logged. |
| Data residency | Officer PII, audio, images, transcripts in asia-southeast1 (Firestore, GCS). Only de-identified document corpora in GE data stores. Confirm with Certis DPO before any live officer data. |
| Security | WIF per-user tokens, no long-lived secrets on device, certificate pinning, Model Armor on prompts and responses, Cloud Armor and rate limiting on the BFF, device attestation (Play Integrity) for production. |
| Compliance | PDPA (Singapore); Certis auxiliary police and PSIA obligations reviewed before any incident data leaves Mozart; no AI involvement in use-of-force or evidence-chain flows. |
| Accessibility | 44 pt targets, 16 pt body minimum, high-contrast dark mode, haptic feedback on voice start/stop, TalkBack labels on every control, four languages. |
| Device | Android 10+, 3 GB RAM, works on Samsung A-series class devices; APK under 60 MB; web build for browser demos. |
| Reliability | BFF 99.5% monthly in trial; graceful degradation: LIVE failure falls back to DEMO answers with a visible badge, never a blank screen. |
| Cost (LIVE, per officer per month, order of magnitude) | GE Frontline seat plus GEAP Flash calls plus voice minutes; the SAARTHI model landed at about USD 6 to 12 per worker per month with the seat dominant. Re-model for Certis volumes before pricing. |
| Observability | OpenTelemetry traces per request, feature-level dashboards, eval scores published per commit. |

## Build plan for Claude Code

Six weeks, four phases, each gated. Phases 1 to 3 need no Google tenant; Phase 4 needs a GE sandbox and a GEAP project.

&#91;embedded content: build roadmap · 4 phases, 6 weeks, 4 gates\]

Each gate is a demo, not a code review: the build is shown to a DevX reviewer playing Faizal, Mei Ling and Raj before the next phase starts.

**Repo structure (monorepo, pnpm workspaces)**

```markdown
mozart-frontline/
  apps/
    mobile/          React Native + Expo (Android, web)
    bff/             Next.js 15 App Router on Cloud Run
    hq/              Next.js web, HQ feedback view
  packages/
    schema/          Zod schemas shared by app, BFF, HQ
    fixtures/        Synthetic site, officers, SOPs, assets, 8 weeks of logs, audio, images
    ui/              Design tokens, components (Certis navy/orange on DevX Doctrine spacing)
    ai/              GE streamAssist client, GEAP agent clients, prompt templates, Model Armor wrapper
    actions/         Mozart action layer client with idempotency and audit
    evals/           Q&A set, voice clips, images, scoring scripts
  infra/             Terraform: Cloud Run, Firestore, GCS, BigQuery, Pub/Sub, Workflows, WIF pool
  docs/              This PRD, run-of-show, ADRs
  CLAUDE.md          Build conventions, DEMO/LIVE rules, no-write-without-confirm invariant
```

**Phase detail**

1. Phase 1, Shell (weeks 1 to 2). Sign in stub, Shift Home, Tasks, Work order detail with Mobility V2 parity, offline queue, fixtures loader, design tokens, CLAUDE.md. Gate: full demo with airplane mode on.
2. Phase 2, AI flows in DEMO mode (weeks 2 to 4). Ask Mozart with scripted citations, Voice report with 12 clips, Verify with 10 images, Handover, Friction log with status. Gate: the 12-minute run-of-show below runs clean three times.
3. Phase 3, Loop (weeks 4 to 5). Supervisor tab, HQ web view with fixture themes, Decide action that updates officer status and briefing. Gate: a friction log filed by Faizal becomes an SOP update acknowledged by Faizal, on stage, in under 2 minutes.
4. Phase 4, LIVE (weeks 5 to 6, starts when Certis's Google Cloud project is provisioned). WIF stub exchange, streamAssist against an engine in Certis's project loaded with the fixture SOPs, GEAP extractor and verifier, eval harness, fallback to DEMO on failure. Gate: Ask and Voice report run LIVE on a sandbox tenant with the eval set at 90% precision.

**Claude Code conventions (goes in CLAUDE.md)**

- Every feature has a `DEMO` and a `LIVE` implementation behind one interface in `packages/ai`; the app never branches on mode.
- No code path writes to Mozart or Firestore records of type WorkOrder, Incident or Briefing without a `confirmedBy` and `confirmedAt`.
- All AI outputs validated by Zod before use; invalid output is a logged failure with a fallback, never a crash.
- Fixtures are the spec: a feature is done when it runs on fixtures, offline, with evals passing.
- Commit per feature, PR per phase, ADR for any deviation from this PRD.

**Run-of-show (12-minute demo)**

1. Faizal signs in on a mid-range Android, phone in airplane mode. Shift Home shows tonight's three tasks and a briefing with one new policy update. He acknowledges it.
2. He asks "what's the SOP if the fire panel shows a supervisory fault on L3?" by voice. Answer streams with a citation; he opens the SOP section.
3. He walks to the panel, taps Verify, points the camera. Verdict: Attention, reason, next step. He attaches it to the work order.
4. He holds the mic and says a 20-second report about a jammed gate. Card fills: type, location, asset, severity, SOP. He fixes one field, adds a photo, submits. It appears in Tasks as CWO.
5. He files a friction log: "gate SOP step 4 assumes a key we don't carry."
6. Shift ends. One tap generates the handover; he signs. Switch to Mei Ling: she sees the handover, approves the closure with the verification photo, forwards the friction log to HQ.
7. Switch to Raj on the web: the theme "gate SOP key assumption" has 6 logs across 3 sites. He picks Change SOP, edits the draft, publishes.
8. Back to Faizal: a new briefing item, the updated SOP step, acknowledge. Loop closed.
9. Optional, once Certis's Google Cloud project is live: flip the LIVE flag, repeat step 2, show the citation is real.

## Open questions and assumptions

Phases 1 to 3 are unblocked today. The questions below gate Phase 4 and the field trial, not the demo build.

**Decisions from Yash (2 Oct 2026)**

- Audience: Certis Mozart product team. Scripted DEMO mode is sufficient for v1; LIVE is a flag, not a gate.
- Positioning: shown as Mozart Frontline, Certis-branded, no DevX accelerator framing in the product.
- Persona scope: v1 stays on unarmed security officers and IFM technicians. Auxiliary police officer flows are a Phase 2 candidate once the regulatory review in Non-functional requirements is done; a product-team audience does not need that conversation in the first showing.
- GE tenant: Certis's own Google Cloud account under the GET program. Phase 4 starts when that project is provisioned.

**Questions for Certis (before Phase 4 and trial)**

- [ ] Does Mozart expose REST or GraphQL APIs for work orders, incidents, assets and notices that a third-party app can call, and is there a sandbox? The PRD assumes yes.
- [ ] What identity provider do officers sign into Mobility V2 with today (email/password per the listing), and is there an Entra, Okta or Google Workspace IdP to federate from?
- [ ] Which site is the trial site, and can Certis provide its SOP set, asset register and 8 weeks of anonymised work-order history for realistic fixtures?
- [ ] Baselines: time-to-report, closure-with-evidence rate, ops-centre call volume, handover duration. Without these the success metrics are guesses.
- [ ] Data residency and PDPA position on voice recordings and photos of site infrastructure leaving the device, and on de-identified SOPs living in a GE data store outside Singapore.
- [ ] Any constraint from the PSIA licence or auxiliary police regulations on AI-drafted incident reports.

**Assumptions made in this PRD**

- Mozart Mobility V2's data model (CWO numbering, step checklists, status pills) is representative of Mozart's work-order API.
- Officers carry a company Android device or an approved BYOD with Play Integrity; iOS is not required for the trial.
- Certis is willing to fund GE Frontline seats for trial officers, with HQ and supervisors on Standard/Plus to unlock the Frontline SKU.
- The Google slide's "Secure Integration: shift handovers, FCM emergency alerts, SSO" maps to F5, F8 and the identity work; no further scope is hidden in it.
- DevX builds the MVP; Certis's Mozart team reviews at each gate and owns the production path.
