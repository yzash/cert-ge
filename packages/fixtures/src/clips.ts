import type { ReportDraft } from '@mozart/schema';

export interface VoiceClip {
  id: string;
  label: string;
  lang: 'en' | 'ms' | 'zh' | 'ta';
  durationSec: number;
  transcript: string;
  draft: ReportDraft;
  confidence: Partial<Record<keyof ReportDraft, number>>;
  /** For guard-tour checkpoint notes */
  checkpoint?: boolean;
}

/**
 * 12 scripted voice clips for DEMO mode (transcript + the scripted GEAP extraction).
 * A real audio file is not needed: the DEMO transcriber streams the transcript at speaking pace.
 */
export const voiceClips: VoiceClip[] = [
  {
    id: 'clip-gate', label: 'Jammed gate, B2 loading bay', lang: 'en', durationSec: 20,
    transcript: 'Faizal reporting from B2 loading bay. Service gate four is jammed half open. The motor is humming but it will not close and the fault lamp is flashing amber. Two delivery trucks are queuing. No injuries. I have coned off the area.',
    draft: {
      type: 'corrective_wo', title: 'Service gate 4 jammed half open', zoneId: 'z-b2-loading', location: 'B2 Loading Bay, gate 4',
      assetId: 'A-GT-B2-04', severity: 'medium',
      description: 'Gate 4 jammed half open; motor humming, will not close; fault lamp flashing amber (limit switch). Two delivery trucks queuing. Area coned off. No injuries.',
      recommendedSopId: 'SOP-GATE-004',
    },
    confidence: { type: 0.94, title: 0.9, zoneId: 0.97, location: 0.95, assetId: 0.91, severity: 0.58, description: 0.92, recommendedSopId: 0.88 },
  },
  {
    id: 'clip-leak', label: 'Ceiling leak, L3 South', lang: 'en', durationSec: 16,
    transcript: 'Water dripping from the ceiling outside unit three thirty-two on level three south. Quite a lot, there is a puddle about one metre wide. There is a lighting panel on the wall nearby. I have put a wet floor sign.',
    draft: {
      type: 'hazard', title: 'Ceiling leak outside #03-32', zoneId: 'z-l3-south', location: 'L3 Retail South, outside #03-32',
      assetId: null, severity: 'high', description: 'Water dripping from ceiling, ~1 m puddle. Lighting panel on adjacent wall. Wet floor sign placed.', recommendedSopId: 'SOP-HAZ-004',
    },
    confidence: { type: 0.86, title: 0.88, zoneId: 0.93, location: 0.9, assetId: 0, severity: 0.74, description: 0.9, recommendedSopId: 0.84 },
  },
  {
    id: 'clip-door', label: 'Fire door wedged, L2', lang: 'en', durationSec: 12,
    transcript: 'Fire door FD L2 12 in the service corridor is wedged open again with a cardboard box. Looks like the F and B tenant zero two thirty-one. I removed it and the door closes now.',
    draft: {
      type: 'observation', title: 'Fire door FD-L2-12 wedged open (repeat)', zoneId: 'z-l2-north', location: 'L2 service corridor',
      assetId: 'A-FD-L2-12', severity: 'medium', description: 'FD-L2-12 wedged open with cardboard box, likely tenant #02-31. Wedge removed; door self-closes.', recommendedSopId: 'SOP-FIRE-012',
    },
    confidence: { type: 0.81, title: 0.9, zoneId: 0.92, location: 0.88, assetId: 0.95, severity: 0.72, description: 0.9, recommendedSopId: 0.93 },
  },
  {
    id: 'clip-collapse', label: 'Person collapsed, atrium', lang: 'en', durationSec: 14,
    transcript: 'Elderly man collapsed near the vortex atrium escalator. He is breathing, conscious but confused. Ambulance has been called. Priya is with him and bringing the AED as precaution.',
    draft: {
      type: 'incident', title: 'Elderly man collapsed, L1 Atrium', zoneId: 'z-l1-atrium', location: 'L1 Vortex Atrium, near escalator E-L1-02',
      assetId: null, severity: 'high', description: 'Elderly male collapsed; breathing, conscious, confused. Ambulance called. Officer Priya attending with AED.', recommendedSopId: 'SOP-MED-003',
    },
    confidence: { type: 0.95, title: 0.9, zoneId: 0.94, location: 0.9, assetId: 0, severity: 0.82, description: 0.92, recommendedSopId: 0.95 },
  },
  {
    id: 'clip-barrier', label: 'Carpark barrier stuck', lang: 'en', durationSec: 10,
    transcript: 'Carpark entry barrier one at B3 is stuck down, cars are queuing up the ramp. I have lifted it with the lever.',
    draft: {
      type: 'corrective_wo', title: 'Carpark entry barrier 1 stuck down', zoneId: 'z-b3-carpark', location: 'B3 Carpark entry',
      assetId: 'A-BR-B3-01', severity: 'medium', description: 'Entry barrier 1 stuck down, queue up ramp. Raised manually with lever.', recommendedSopId: 'SOP-GATE-006',
    },
    confidence: { type: 0.93, title: 0.9, zoneId: 0.95, location: 0.92, assetId: 0.9, severity: 0.75, description: 0.9, recommendedSopId: 0.94 },
  },
  {
    id: 'clip-bag', label: 'Unattended bag, link bridge', lang: 'en', durationSec: 12,
    transcript: 'Unattended black backpack on the bench at the terminal link bridge, been there about ten minutes. Nobody around claims it. Not hidden, nothing obviously suspicious.',
    draft: {
      type: 'incident', title: 'Unattended backpack, Terminal Link Bridge', zoneId: 'z-l1-link', location: 'L1 Terminal Link Bridge, bench',
      assetId: null, severity: 'medium', description: 'Black backpack unattended ~10 min. Unclaimed. HOT: not hidden, not obviously suspicious.', recommendedSopId: 'SOP-SEC-010',
    },
    confidence: { type: 0.9, title: 0.88, zoneId: 0.93, location: 0.9, assetId: 0, severity: 0.66, description: 0.9, recommendedSopId: 0.95 },
  },
  {
    id: 'clip-exit', label: 'Exit sign out, L4', lang: 'en', durationSec: 8,
    transcript: 'Exit sign E X L4 zero three at the dining terrace is not lit.',
    draft: {
      type: 'corrective_wo', title: 'Exit sign EX-L4-03 not lit', zoneId: 'z-l4-dining', location: 'L4 Dining Terrace',
      assetId: 'A-EX-L4-03', severity: 'low', description: 'Exit sign EX-L4-03 not illuminated.', recommendedSopId: 'SOP-OPS-006',
    },
    confidence: { type: 0.92, title: 0.93, zoneId: 0.9, location: 0.9, assetId: 0.88, severity: 0.8, description: 0.93, recommendedSopId: 0.7 },
  },
  {
    id: 'clip-ms-spill', label: 'Tumpahan, L4 (Malay)', lang: 'ms', durationSec: 9,
    transcript: 'Ada tumpahan minyak di lantai dining terrace level empat, dekat kedai kopi. Saya sudah letak papan tanda lantai basah.',
    draft: {
      type: 'hazard', title: 'Tumpahan minyak / oil spill, L4', zoneId: 'z-l4-dining', location: 'L4 Dining Terrace, near coffee kiosk',
      assetId: null, severity: 'medium', description: 'Oil spill on floor near coffee kiosk. Wet-floor sign placed. (Reported in Malay.)', recommendedSopId: 'SOP-HAZ-001',
    },
    confidence: { type: 0.88, title: 0.84, zoneId: 0.9, location: 0.86, assetId: 0, severity: 0.7, description: 0.85, recommendedSopId: 0.92 },
  },
  {
    id: 'clip-zh-lift', label: '电梯困人 (Mandarin)', lang: 'zh', durationSec: 9,
    transcript: '二楼 P3 电梯有两个人被困，他们没有受伤，我在用对讲机安抚他们。',
    draft: {
      type: 'incident', title: 'Lift P3 entrapment, 2 persons', zoneId: 'z-l2-north', location: 'L2 Retail North, lift P3',
      assetId: 'A-LFT-P3', severity: 'high', description: 'Two passengers trapped in lift P3, no injuries. Officer reassuring via intercom. (Reported in Mandarin.)', recommendedSopId: 'SOP-LIFT-002',
    },
    confidence: { type: 0.94, title: 0.9, zoneId: 0.86, location: 0.88, assetId: 0.9, severity: 0.84, description: 0.88, recommendedSopId: 0.96 },
  },
  {
    id: 'clip-vague', label: 'Something odd (vague)', lang: 'en', durationSec: 7,
    transcript: 'Something is making a weird noise behind the wall near here, not sure what.',
    draft: {
      type: 'observation', title: 'Unusual noise behind wall', zoneId: null, location: null,
      assetId: null, severity: null, description: 'Unusual noise heard behind a wall; source unknown.', recommendedSopId: null,
    },
    confidence: { type: 0.62, title: 0.7, zoneId: 0, location: 0, assetId: 0, severity: 0, description: 0.8, recommendedSopId: 0 },
  },
  {
    id: 'clip-cp-canopy', label: 'Checkpoint: Canopy bridge', lang: 'en', durationSec: 8, checkpoint: true,
    transcript: 'Canopy bridge checkpoint. All clear, park is empty, but camera C L5 07 housing looks fogged up.',
    draft: {
      type: 'observation', title: 'CCTV C-L5-07 housing fogged', zoneId: 'z-l5-canopy', location: 'L5 Canopy bridge',
      assetId: 'A-CCTV-L5-07', severity: 'low', description: 'Checkpoint clear; park empty. Camera C-L5-07 housing fogged, view may be degraded.', recommendedSopId: 'SOP-CCTV-001',
    },
    confidence: { type: 0.86, title: 0.88, zoneId: 0.95, location: 0.93, assetId: 0.9, severity: 0.78, description: 0.9, recommendedSopId: 0.86 },
  },
  {
    id: 'clip-cp-clear', label: 'Checkpoint: all clear', lang: 'en', durationSec: 4, checkpoint: true,
    transcript: 'Checkpoint clear, nothing to report.',
    draft: {
      type: 'observation', title: 'Checkpoint clear', zoneId: null, location: null,
      assetId: null, severity: 'low', description: 'Checkpoint clear, nothing to report.', recommendedSopId: 'SOP-PAT-001',
    },
    confidence: { type: 0.9, title: 0.9, zoneId: 0, location: 0, assetId: 0, severity: 0.9, description: 0.95, recommendedSopId: 0.8 },
  },
];

/** Scripted voice questions for Ask Mozart. */
export const askVoiceClips = [
  { id: 'ask-supervisory', label: 'Supervisory fault on L3', text: 'What’s the SOP if the fire panel shows a supervisory fault on L3?' },
  { id: 'ask-key', label: 'Gate override key', text: 'Where is the override key for the loading bay gates?' },
  { id: 'ask-ms', label: 'Malay: gate stuck', text: 'Pintu pagar loading bay tersangkut, apa saya perlu buat?' },
  { id: 'ask-zh', label: 'Mandarin: supervisory', text: '三楼火警面板显示监视故障怎么办？' },
];

/** Scripted friction sentences (voice) */
export const frictionClips = [
  { id: 'fr-gate-key', category: 'sop' as const, text: 'Gate SOP step 4 assumes a key we don’t carry. The override key is in the FCC key press, ten minutes away, while trucks queue.', sopStepRef: { sopId: 'SOP-GATE-004', n: 4 }, assetId: 'A-GT-B2-04' },
  { id: 'fr-radio', category: 'equipment' as const, text: 'Radio battery dies before 4am on the night shift, spare batteries in FCC are also flat.' },
  { id: 'fr-qr', category: 'tooling' as const, text: 'Extinguisher on L4 has no QR tag so I cannot scan it for the checklist.' },
];
