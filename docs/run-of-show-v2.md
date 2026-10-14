# Run-of-show v2 (chat-first, ~12 minutes)

Open `/v2` on a laptop. Use the profile menu (bottom-left) to switch user or open Mei Ling and Raj in new tabs. Each tab is a separate device on one shared world.

| # | Who | Do | Say |
|---|---|---|---|
| 1 | Faizal | Sign in. Tap the **Briefing · 1 to acknowledge** tile → **Acknowledge**. | "The first screen is a conversation. The shift brief is one tap away." |
| 2 | Faizal | Ask "What is the SOP if the fire panel shows a supervisory fault on L3?" Tap source chip 2. | "Cited answers. The side panel opens the exact section, here tonight’s works notice." |
| 3 | Faizal | "Report a jammed gate at B2" → hold the mic → set severity High → **Submit to Mozart**. | "The report is drafted in chat. The low-confidence field is flagged; nothing is guessed." |
| 3b | Faizal | Tap the **camera** in the composer (on a phone it opens the rear camera; on a laptop pick any image, or "Report with a photo" → **Use a demo photo**). Check category, location and severity → **Submit incident**. | "See something, snap it. Mozart drafts the incident from the photo; the officer checks it and submits. (DEMO: the draft is pregenerated per category; LIVE sends the photo to Gemini.)" |
| 3c | Faizal | Tap the **voice** button (navy, right of the composer) → **中文** → tap the orb and speak, or tap "卸货区4号闸门卡住了怎么办？". | "Mandarin in, Mandarin out, cited and read aloud. Same in English. Where the browser has no speech recognition, the demo prompts play the same flow." |
| 3d | Faizal | (Optional) Tap **EN** next to the mic so it reads **中文**, tap the mic and dictate in Mandarin. Type "Report graffiti with a photo" to get the vandalism draft for a real photo. | "The mic listens in the language you pick; the browser can't guess it." |
| 4 | Faizal | "Apply annual leave next friday for 2 days" → **Send to supervisor**. "Show my payslip" → **Show amounts**. | "HR in the same app. Dates parsed, balance and roster impact checked, amounts hidden by default." |
| 5 | Faizal | "This SOP step does not work in the field" → demo chip "Gate SOP step 4…" → **Send**. | "Two taps to tell HQ." |
| 6 | Mei Ling (new tab) | "What is waiting for me to approve?" → approve Faizal’s leave, **Forward to HQ** on his friction log. | "One inbox: closures with evidence, leave, claims, swaps, friction, robot events." |
| 7 | Mei Ling | **Control tower** → *Demo: CR-03 Liquid spill detected* → **Task Faizal**. | "The scrubber found a spill, paused and is holding position. The nearest officer is tasked." |
| 8 | Faizal | The robot card appears in his chat → **Open task** → demo photo → **Confirm and close**. | "Done in the conversation. The robot goes back to cleaning." |
| 9 | Raj (new tab) | **Insights** → *Gate SOP assumes an override key…* (6 logs, 3 sites) → **Change SOP** → **Publish**. | "HQ decides. The AI drafts, Raj publishes." |
| 10 | Faizal | **New chat** → "Brief me on my shift" → acknowledge *SOP-GATE-004 v3.3*. "Send a robot to patrol the canopy park" → confirm. | "Loop closed. And the robot fleet is one sentence away." |

Optional: profile menu → Dark mode; Airplane mode (answers from cache, writes queue); LIVE AI.

Automated: `pnpm build:web && npx serve -s apps/mobile/dist -l 8081 &` then `pnpm demo:check:v2 -- http://localhost:8081 3`.
