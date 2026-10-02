import type { FrictionCategory, FrictionLog, Theme } from '@mozart/schema';

interface ThemeSeed {
  id: string;
  label: string;
  summary: string;
  category: FrictionCategory;
  assetType?: string;
  sopId?: string;
  sopStep?: number;
  assetId?: string;
  keywords: string[];
  /** [siteId, weeksAgo, officerName, sentiment, textIndex] */
  logs: [string, number, string, number, number][];
  texts: string[];
  decision?: Theme['decision'];
  decisionNote?: string;
  decidedWeeksAgo?: number;
}

export const themeSeeds: ThemeSeed[] = [
  {
    id: 'th-gate-key',
    label: 'Gate SOP assumes an override key officers don’t carry',
    summary: 'SOP-GATE-004 step 4 tells the officer at a jammed gate to use the manual override key, but override keys live in the FCC key press and patrol officers do not carry them (SOP-ACC-005 step 3). Officers walk 8–15 minutes to fetch the key while vehicles queue.',
    category: 'sop', assetType: 'gate', sopId: 'SOP-GATE-004', sopStep: 4, assetId: 'A-GT-B2-04',
    keywords: ['key', 'override', 'gate', 'shutter', 'step 4', 'key press', 'carry', 'kunci'],
    texts: [
      'Gate jammed again and step 4 says use the override key. Key is in FCC key press, nobody on patrol has it. Took 15 min.',
      'Dock shutter stuck, SOP says manual override key but the key is locked in the control room. Lorries queued out to the road.',
      'Step 4 of the gate SOP is not possible on night shift, FCC duty officer was on another call so I could not sign out the key.',
      'Override key for loading shutter not available at the gate. Suggest key safe at the dock or FCC dispatches a runner.',
      'Waited 12 minutes for override key. Step 4 assumes we carry it.',
    ],
    logs: [
      ['SMC', 6, 'Hamid Osman', -0.6, 1],
      ['MXT', 4, 'Lisa Wong', -0.7, 2],
      ['SMC', 2, 'Kavitha Raj', -0.5, 3],
      ['MXT', 1, 'Benjamin Ho', -0.8, 1],
      ['CNP', 0, 'Ravi Chandran', -0.7, 4],
    ],
  },
  {
    id: 'th-radio',
    label: 'Radio batteries don’t last a 12-hour night shift',
    summary: 'Officers report radio batteries dying between 03:00 and 05:00 and spare batteries in the FCC charger not being charged.',
    category: 'equipment',
    keywords: ['radio', 'battery', 'batteries', 'charger', 'walkie'],
    texts: [
      'Radio died at 4am, spare in FCC also flat.',
      'Radio battery only lasts 9 hours. Need spares that are actually charged.',
      'Lost radio contact during patrol because battery dead. Had to use phone.',
      'Charger in FCC has 2 broken slots so spares never charge.',
    ],
    logs: [
      ['CNP', 7, 'Daniel Lim', -0.5, 0], ['KCH', 7, 'Rahim Ali', -0.4, 1], ['CNP', 6, 'Faizal Rahman', -0.6, 2],
      ['SMC', 6, 'Hamid Osman', -0.5, 0], ['MXT', 5, 'Lisa Wong', -0.3, 1], ['CNP', 5, 'Hafiz Ismail', -0.6, 3],
      ['KCH', 4, 'Rahim Ali', -0.5, 2], ['CNP', 3, 'Nurul Huda', -0.4, 0], ['SMC', 3, 'Kavitha Raj', -0.6, 1],
      ['CNP', 2, 'Wei Jie Ong', -0.7, 2], ['MXT', 2, 'Benjamin Ho', -0.5, 3], ['CNP', 1, 'Ahmad Yusof', -0.6, 0],
      ['KCH', 1, 'Tan Boon Kiat', -0.5, 1], ['CNP', 0, 'Priya Nair', -0.7, 2],
    ],
  },
  {
    id: 'th-qr',
    label: 'Assets without QR tags block checklist scans',
    summary: 'Extinguishers and hose reels added since the last tagging round have no QR tag, so officers cannot scan them to complete planned work orders.',
    category: 'tooling', assetType: 'extinguisher',
    keywords: ['qr', 'tag', 'scan', 'no tag', 'label', 'nfc'],
    texts: [
      'Extinguisher has no QR tag, cannot scan to complete the checklist.',
      'Hose reel on new wing not tagged. App will not let me tick it off.',
      'QR sticker faded, scanner cannot read.',
    ],
    logs: [
      ['CNP', 7, 'Jun Hao Lee', -0.3, 0], ['KCH', 6, 'Tan Boon Kiat', -0.4, 1], ['CNP', 5, 'Kumar Selvam', -0.3, 2],
      ['MXT', 5, 'Lisa Wong', -0.2, 0], ['CNP', 4, 'Grace Tan', -0.4, 1], ['SMC', 3, 'Hamid Osman', -0.3, 0],
      ['CNP', 3, 'Jun Hao Lee', -0.5, 2], ['KCH', 2, 'Rahim Ali', -0.3, 1], ['CNP', 1, 'Kumar Selvam', -0.4, 0],
      ['MXT', 1, 'Benjamin Ho', -0.3, 2], ['CNP', 0, 'Grace Tan', -0.4, 0],
    ],
  },
  {
    id: 'th-door',
    label: 'Repeat fire-door wedging by F&B tenants',
    summary: 'The same tenants wedge service-corridor fire doors open for deliveries. Officers remove wedges nightly but there is no escalation that sticks.',
    category: 'safety', assetType: 'fire_door', sopId: 'SOP-FIRE-012', sopStep: 4,
    keywords: ['fire door', 'wedge', 'wedged', 'tenant', 'door'],
    texts: [
      'FD-L2-12 wedged again by #02-31. Third time this month.',
      'Fire door propped open with a trolley for deliveries. Tenant says management allows it.',
      'Removed door wedge, tenant put it back 20 min later.',
    ],
    logs: [
      ['CNP', 6, 'Aisyah Rahim', -0.4, 0], ['KCH', 5, 'Rahim Ali', -0.5, 1], ['CNP', 4, 'Faizal Rahman', -0.5, 2],
      ['CNP', 3, 'Hafiz Ismail', -0.6, 0], ['KCH', 2, 'Tan Boon Kiat', -0.4, 1], ['CNP', 2, 'Aisyah Rahim', -0.6, 2],
      ['CNP', 1, 'Marcus Teo', -0.5, 0], ['KCH', 1, 'Rahim Ali', -0.6, 1], ['CNP', 0, 'Hafiz Ismail', -0.7, 0],
    ],
  },
  {
    id: 'th-permit',
    label: 'FCC permit board not updated for late contractors',
    summary: 'Contractors arrive after 22:00 with permits that are not yet on the FCC permit board, so officers cannot verify them at the dock.',
    category: 'access', sopId: 'SOP-ACC-002', sopStep: 2,
    keywords: ['permit', 'contractor', 'ptw', 'permit board'],
    texts: [
      'Contractor had a permit but not on the FCC board. Waited 25 min to verify.',
      'Permit board shows yesterday’s permits only.',
    ],
    logs: [
      ['CNP', 5, 'Ravi Chandran', -0.3, 0], ['MXT', 4, 'Lisa Wong', -0.4, 1], ['CNP', 3, 'Wei Jie Ong', -0.4, 0],
      ['SMC', 2, 'Kavitha Raj', -0.3, 1], ['CNP', 1, 'Ravi Chandran', -0.5, 0], ['MXT', 0, 'Benjamin Ho', -0.4, 1],
      ['CNP', 0, 'Sarah Goh', -0.3, 0],
    ],
  },
  {
    id: 'th-lift',
    label: 'Lift contractor slow to respond at night',
    summary: 'Night-time lift entrapments wait 30–50 minutes for the contractor against a 30-minute target.',
    category: 'equipment', assetType: 'lift', sopId: 'SOP-LIFT-002', sopStep: 2,
    keywords: ['lift', 'elevator', 'contractor', 'trapped', 'response'],
    texts: ['Lift entrapment, contractor took 45 min.', 'Lift contractor phone not answered after midnight.'],
    logs: [
      ['CNP', 6, 'Daniel Lim', -0.5, 0], ['SMC', 4, 'Hamid Osman', -0.6, 1], ['CNP', 3, 'Priya Nair', -0.4, 0],
      ['MXT', 2, 'Lisa Wong', -0.5, 1], ['CNP', 1, 'Daniel Lim', -0.6, 0], ['SMC', 0, 'Kavitha Raj', -0.5, 0],
    ],
  },
  {
    id: 'th-torch',
    label: 'Torches too dim for carpark patrols',
    summary: 'Issued torches are too dim to inspect B3 carpark corners and stairwells.',
    category: 'equipment', keywords: ['torch', 'flashlight', 'dim', 'light'],
    texts: ['Torch too dim for B3 corners.', 'Need brighter torch, cannot see under vehicles.'],
    logs: [
      ['CNP', 7, 'Wei Jie Ong', -0.3, 0], ['CNP', 6, 'Ahmad Yusof', -0.4, 1], ['KCH', 6, 'Tan Boon Kiat', -0.3, 0],
      ['CNP', 5, 'Wei Jie Ong', -0.4, 1], ['MXT', 5, 'Benjamin Ho', -0.2, 0],
    ],
    decision: 'fixEquipment', decisionNote: 'Procurement approved 60 rechargeable 1,000-lumen torches; issued to all night-shift officers.', decidedWeeksAgo: 3,
  },
  {
    id: 'th-handover',
    label: 'Paper handover log is illegible and gets lost',
    summary: 'Handwritten handover books are hard to read and incoming officers miss open items.',
    category: 'sop', sopId: 'SOP-OPS-001', sopStep: 1,
    keywords: ['handover', 'logbook', 'paper', 'hand over'],
    texts: ['Could not read previous shift handover.', 'Handover book missing from FCC.', 'Open WO not handed over, found out from supervisor.'],
    logs: [
      ['CNP', 7, 'Faizal Rahman', -0.4, 0], ['SMC', 7, 'Hamid Osman', -0.5, 1], ['CNP', 6, 'Grace Tan', -0.5, 2],
      ['MXT', 6, 'Lisa Wong', -0.3, 0], ['KCH', 5, 'Rahim Ali', -0.4, 1], ['CNP', 5, 'Nurul Huda', -0.4, 2],
      ['SMC', 4, 'Kavitha Raj', -0.3, 0], ['CNP', 4, 'Daniel Lim', -0.5, 2],
    ],
    decision: 'changeSop', decisionNote: 'SOP-OPS-001 v2.0: handovers are written in Mozart Frontline, signed in-app and acknowledged by the incoming officer.', decidedWeeksAgo: 3,
  },
];

const OFFICER_IDS: Record<string, string> = {
  'Faizal Rahman': 'o-faizal', 'Daniel Lim': 'o-daniel', 'Kumar Selvam': 'o-kumar', 'Wei Jie Ong': 'o-weijie', 'Nurul Huda': 'o-nurul',
  'Ravi Chandran': 'o-ravi', 'Hafiz Ismail': 'o-hafiz', 'Grace Tan': 'o-grace', 'Marcus Teo': 'o-marcus', 'Aisyah Rahim': 'o-aisyah',
  'Jun Hao Lee': 'o-junhao', 'Priya Nair': 'o-priya', 'Ahmad Yusof': 'o-ahmad', 'Sarah Goh': 'o-sarah',
};

const WEEK = 7 * 24 * 3600 * 1000;

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z]+/g, '-');
}

/** Builds 8 weeks of synthetic friction logs and the HQ themes they cluster into. */
export function buildFriction(now: number): { logs: FrictionLog[]; themes: Theme[] } {
  const logs: FrictionLog[] = [];
  const themes: Theme[] = [];
  const weekStart = (weeksAgo: number) => new Date(now - weeksAgo * WEEK - ((now / 3600000) % 24) * 3600000).toISOString();

  for (const t of themeSeeds) {
    const logIds: string[] = [];
    t.logs.forEach(([siteId, weeksAgo, name, sentiment, textIdx], i) => {
      const id = `FL-${t.id.slice(3).toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
      const at = new Date(now - weeksAgo * WEEK - (i % 5 + 1) * 9 * 3600000).toISOString();
      const decided = !!t.decision;
      logs.push({
        id,
        officerId: OFFICER_IDS[name] ?? `o-ext-${slug(name)}`,
        officerName: name,
        siteId,
        category: t.category,
        text: t.texts[textIdx % t.texts.length],
        assetId: siteId === 'CNP' ? t.assetId : undefined,
        sopStepRef: t.sopId && t.sopStep ? { sopId: t.sopId, n: t.sopStep } : undefined,
        attachments: [],
        status: decided ? 'decided' : weeksAgo <= 1 ? 'under_review' : 'under_review',
        routedTo: 'hq',
        themeId: t.id,
        sentiment,
        decisionId: decided ? `dec-${t.id}` : undefined,
        decisionText: decided ? t.decisionNote : undefined,
        createdAt: at,
        updatedAt: at,
      });
      logIds.push(id);
    });
    const weeks = Array.from({ length: 8 }, (_, w) => {
      const weeksAgo = 7 - w;
      const these = t.logs.filter((l) => l[1] === weeksAgo);
      const sentiment = these.length ? these.reduce((s, l) => s + l[3], 0) / these.length : 0;
      return { weekOf: weekStart(weeksAgo), count: these.length, sentiment: Math.round(sentiment * 100) / 100 };
    });
    const all = t.logs.map((l) => l[3]);
    themes.push({
      id: t.id,
      label: t.label,
      summary: t.summary,
      category: t.category,
      assetType: t.assetType,
      sopId: t.sopId,
      sopStep: t.sopStep,
      assetId: t.assetId,
      siteIds: [...new Set(t.logs.map((l) => l[0]))],
      logIds,
      weeks,
      sentimentScore: Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 100) / 100,
      keywords: t.keywords,
      decision: t.decision,
      decisionNote: t.decisionNote,
      decidedAt: t.decidedWeeksAgo !== undefined ? new Date(now - t.decidedWeeksAgo * WEEK).toISOString() : undefined,
      decidedBy: t.decision ? 'o-raj' : undefined,
      createdAt: weekStart(8),
    });
  }

  // Logs still sitting in Mei Ling's supervisor queue at Canopy Mall (not yet forwarded).
  const queue: [string, FrictionCategory, string, number][] = [
    ['o-hafiz', 'access', 'Staff door at L4 dining back-of-house badge reader is slow, takes 3 or 4 taps.', 2],
    ['o-nurul', 'safety', 'Terminal Link bridge floor very slippery when the cleaners use the new chemical.', 5],
  ];
  queue.forEach(([officerId, category, text, hoursAgo], i) => {
    const at = new Date(now - hoursAgo * 3600000).toISOString();
    logs.push({
      id: `FL-Q-${i + 1}`, officerId, siteId: 'CNP', category, text, attachments: [], status: 'received', routedTo: 'supervisor', createdAt: at, updatedAt: at,
    });
  });
  return { logs, themes };
}
