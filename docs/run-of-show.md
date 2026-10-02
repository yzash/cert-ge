# Run-of-show (12 minutes)

**Setup (2 min before):** open the web build on a laptop ≥ 960 px wide. The phone frame sits on the right and the presenter rail on the left. Click **Reset demo data**. Open Raj's HQ view in a second tab from the rail and leave it on the theme list. For a real Android phone, install the dev build (`pnpm --filter mobile android`) and point both at the same BFF (Me → Sync: BFF).

| # | Who / where | Do | Say |
|---|---|---|---|
| 1 | Faizal, phone | Sign in as Faizal. Rail: **Airplane mode ON**. Read the day-shift handover, **I have read this. Acknowledge**. On the NEW POLICY UPDATE card, **Acknowledge**. | "Zero bars. Shift Home still shows tonight's three tasks ranked by SLA, the briefing, and his alarms. The acknowledgement is queued with a timestamp." |
| 2 | Ask | Ask tab → voice chip **Supervisory fault on L3**. Tap citation [2]. | "Every answer cites its source. It found tonight's sprinkler-works notice, not just the generic SOP. Offline, it answers from the last-synced cache." |
| 3 | Work order | Home → **Fire panel L3 South** → Acknowledge → step 3 **Verify with camera** → shutter. **Attach to CWO-240417**. Sign, **Sign and close**. | "Attention, not Fail: the model read the amber LED, matched it to the expected state table and tonight's notice. Close needs evidence; it has it." |
| 4 | Voice report | Home → mic → hold ~6 s on **Jammed gate, B2**. Severity is amber (58%): tap **High**. **Demo photo** → gate scene. **Save offline**. | "Twenty seconds of speech, a filled card in under two seconds. The one field it wasn't sure of is highlighted, never silently guessed. It's in Tasks as a CWO, pending sync." |
| 5 | Friction | Home → **Flag a problem** → SOP step → demo chip "Gate SOP step 4…" → **Send**. | "Two taps. This is the channel Mobility V2 doesn't have." |
| 6 | Handover, then Mei Ling | Rail: airplane off (queue replays). Home → Handover → **Generate** → sign → submit. Rail: **Open Mei Ling (new tab)** → Closures → **Approve** (verification photo visible) → Friction → **Forward to HQ**. | "Every handover line links to its record. Mei Ling approves with the evidence in front of her; the friction log joins an existing theme." |
| 7 | Raj, HQ tab | Theme **Gate SOP assumes an override key…**: 6 logs, 3 sites. **Change SOP** → edit the draft → **Publish**. | "Six officers at three sites hit the same wall. The AI drafts the edit; Raj publishes it." |
| 8 | Faizal | Back to the phone: new briefing card **SOP-GATE-004 v3.3: step 4 updated** → **Acknowledge**. Flag a problem → My logs shows the decision. | "Friction log to SOP change to acknowledged briefing, in one sitting. Loop closed." |
| 9 | Optional | Me → AI mode **LIVE** (with Certis's BFF) → repeat step 2. | "Same screen, real Gemini Enterprise citation." Without a tenant the answer still appears with a `LIVE failed · DEMO answer` badge. |

Extras if asked: Mei Ling → Alerts → **Send high-priority alert** (Faizal's phone goes full-screen, ack rate is live); Tour tab (missed checkpoint, scan + voice note); Me → audit trail; Malay/Mandarin questions in Ask.

Automated rehearsal: `pnpm build:web && npx serve -s apps/mobile/dist -l 8081 & pnpm demo:check -- http://localhost:8081 3` runs the whole script three times (the Phase 2 gate) and saves screenshots to `demo-shots/`.
