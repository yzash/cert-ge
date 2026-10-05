import type { Alarm, BriefingItem, DemoState, GuardTour, Handover, Incident, Notification, Verification, WorkOrder, WorkOrderStep } from '@mozart/schema';
import { buildAssets } from './assets';
import { sopToDoc, staticDocs } from './docs';
import { buildFriction } from './friction';
import { fixtureImageUri } from './images';
import { officers, sites } from './site';
import { buildSops } from './sops';
import { buildHr, hrDocs } from './hr';
import { buildRobotState, robots } from './robots';

export const SCHEMA_VERSION = 4;

const MIN = 60_000;

function step(id: string, label: string, done = false, expectedState?: WorkOrderStep['expectedState']): WorkOrderStep {
  return { id, label, done, expectedState, notes: [], attachments: [] };
}

/** Builds the full synthetic Canopy Mall state, with all times relative to `now`. */
export function seed(now: number = Date.now()): DemoState {
  const t = (mins: number) => new Date(now + mins * MIN).toISOString();
  const today = new Date(now).toISOString().slice(0, 10);
  const sops = buildSops(t(-60 * 24 * 90));
  const docs = [...sops.map(sopToDoc), ...staticDocs, ...hrDocs];
  const { logs, themes } = buildFriction(now);

  const workOrders: WorkOrder[] = [
    {
      id: 'CWO-240417', type: 'corrective', category: 'Fire protection', title: 'Fire panel L3 South: supervisory fault (Z14)',
      description: 'Supervisory signal on sub-panel L3 South, zone Z14 (sprinkler valve tamper). Raised by Mozart from alarm ALM-0412.',
      status: 'assignment', priority: 'high', siteId: 'CNP', zoneId: 'z-l3-south', assetId: 'A-FP-L3-01', sopId: 'SOP-FIRE-007', assigneeId: 'o-faizal',
      steps: [
        step('s1', 'Inform operator (FCC, channel 1)'),
        step('s2', 'Check tonight’s notices and permit-to-work'),
        step('s3', 'Verify panel state', false, { indicator: 'Supervisory LED', expected: 'Off' }),
        step('s4', 'Rectify / escalate per SOP-FIRE-007'),
        step('s5', 'Close the job with evidence'),
      ],
      attachments: [], slaDue: t(28), createdAt: t(-14), source: 'mozart',
    },
    {
      id: 'CWO-240419', type: 'corrective', category: 'Fire protection', title: 'Fire door FD-L2-12 held open (repeat)',
      description: 'Door-held-open alarm on FD-L2-12, service corridor L2. Third occurrence this month; tenant #02-31 suspected.',
      status: 'acknowledged', priority: 'medium', siteId: 'CNP', zoneId: 'z-l2-north', assetId: 'A-FD-L2-12', sopId: 'SOP-FIRE-012', assigneeId: 'o-faizal',
      steps: [
        step('s1', 'Inform operator'),
        step('s2', 'Remove obstruction, confirm door self-closes', false, { indicator: 'Door leaf', expected: 'Closed, self-closer engaged' }),
        step('s3', 'Record tenant unit and inform tenant'),
        step('s4', 'Close the job'),
      ],
      attachments: [], slaDue: t(52), createdAt: t(-30), source: 'mozart',
    },
    {
      id: 'CWO-240405', type: 'planned', category: 'Fire protection', title: 'Nightly sprinkler pump pressure check',
      description: 'Planned nightly check of sprinkler main pressure and pump controller (SOP-FIRE-015).',
      status: 'assignment', priority: 'medium', siteId: 'CNP', zoneId: 'z-roof-plant', assetId: 'A-PG-RF-01', sopId: 'SOP-FIRE-015', assigneeId: 'o-faizal',
      steps: [
        step('s1', 'Read pressure gauge', false, { indicator: 'Pressure gauge', expected: '6.0 to 8.0 bar' }),
        step('s2', 'Confirm controller in AUTO', false, { indicator: 'Pump controller', expected: 'AUTO' }),
        step('s3', 'Record reading'),
      ],
      attachments: [], slaDue: t(95), createdAt: t(-120), source: 'mozart',
    },
    {
      id: 'CWO-240422', type: 'planned', category: 'Life safety', title: 'Hose reel inspection L3 South',
      description: 'Monthly visual inspection of hose reels in L3 South.',
      status: 'assignment', priority: 'low', siteId: 'CNP', zoneId: 'z-l3-south', sopId: 'SOP-PAT-001', assigneeId: 'o-faizal',
      steps: [step('s1', 'Inspect hose reels HR-L3-01..04'), step('s2', 'Record defects')],
      attachments: [], slaDue: t(240), createdAt: t(-200), source: 'mozart',
    },
    {
      id: 'CWO-240388', type: 'corrective', category: 'Electrical', title: 'Exit sign EX-L1-09 flickering',
      description: 'Lamp replaced by IFM.', status: 'closed', priority: 'low', siteId: 'CNP', zoneId: 'z-l1-atrium', assigneeId: 'o-faizal',
      steps: [step('s1', 'Inform operator', true), step('s2', 'Rectify', true), step('s3', 'Close the job', true)],
      attachments: [{ id: 'att-388', kind: 'photo', uri: 'fixture://img-aed-ok', caption: 'After repair', at: t(-95) }],
      slaDue: t(600), createdAt: t(-150), closedAt: t(-95), approvedBy: 'o-meiling', source: 'mozart', confirmedBy: 'o-faizal', confirmedAt: t(-96),
    },
    {
      id: 'CWO-240386', type: 'adhoc', category: 'Security', title: 'VIP arrival: keep Terminal Link Bridge clear',
      description: 'Bridge cleared 21:30–21:45 for VIP delegation.', status: 'closed', priority: 'medium', siteId: 'CNP', zoneId: 'z-l1-link', assigneeId: 'o-faizal',
      steps: [step('s1', 'Clear bridge', true), step('s2', 'Report to FCC', true)],
      attachments: [], slaDue: t(-60), createdAt: t(-180), closedAt: t(-110), approvedBy: 'o-meiling', source: 'mozart', confirmedBy: 'o-faizal', confirmedAt: t(-110),
    },
    {
      id: 'CWO-240393', type: 'corrective', category: 'Security systems', title: 'CCTV C-L5-07 housing fogged',
      description: 'Housing needs cleaning by contractor; waiting for cherry picker.', status: 'on_hold', priority: 'low', siteId: 'CNP', zoneId: 'z-l5-canopy', assetId: 'A-CCTV-L5-07', sopId: 'SOP-CCTV-001', assigneeId: 'o-faizal',
      steps: [step('s1', 'Inform operator', true), step('s2', 'Rectify'), step('s3', 'Close the job')],
      attachments: [], slaDue: t(60 * 20), createdAt: t(-60 * 26), source: 'mozart',
    },
    // other officers (supervisor board)
    {
      id: 'CWO-240412', type: 'planned', category: 'Vertical transport', title: 'Barricade escalator E-L1-02 for maintenance',
      description: 'Barricade both landings 01:00–03:00.', status: 'in_progress', priority: 'medium', siteId: 'CNP', zoneId: 'z-l1-atrium', assetId: 'A-ESC-L1-02', assigneeId: 'o-daniel',
      steps: [step('s1', 'Barricade landings', true), step('s2', 'Hand over to contractor')], attachments: [], slaDue: t(80), createdAt: t(-40), source: 'mozart',
    },
    {
      id: 'CWO-240398', type: 'corrective', category: 'Fire protection', title: 'Jockey pump starting every 4 min',
      description: 'Possible leak on sprinkler main.', status: 'in_progress', priority: 'high', siteId: 'CNP', zoneId: 'z-roof-plant', assetId: 'A-PG-RF-01', assigneeId: 'o-kumar',
      steps: [step('s1', 'Inform operator', true), step('s2', 'Inspect main for leaks'), step('s3', 'Close the job')], attachments: [], slaDue: t(45), createdAt: t(-70), source: 'mozart',
    },
    {
      id: 'CWO-240402', type: 'corrective', category: 'Access systems', title: 'Gate 4 limit switch worn: awaiting part',
      description: 'Replacement limit switch on order. Gate intermittently jams.', status: 'on_hold', priority: 'medium', siteId: 'CNP', zoneId: 'z-b2-loading', assetId: 'A-GT-B2-04', sopId: 'SOP-GATE-004', assigneeId: 'o-ravi',
      steps: [step('s1', 'Inform operator', true), step('s2', 'Rectify'), step('s3', 'Close the job')], attachments: [], slaDue: t(60 * 30), createdAt: t(-60 * 72), source: 'mozart',
    },
    {
      id: 'CWO-240410', type: 'planned', category: 'Life safety', title: 'AED cabinet L1 monthly check',
      description: 'Monthly AED cabinet visual check.', status: 'pending_approval', priority: 'low', siteId: 'CNP', zoneId: 'z-l1-atrium', assetId: 'A-AED-L1-01', sopId: 'SOP-MED-003', assigneeId: 'o-grace',
      steps: [
        { ...step('s1', 'Check status indicator and seal', true, { indicator: 'AED status indicator', expected: 'Green' }), verificationId: 'VER-0001' },
        step('s2', 'Record', true),
      ],
      attachments: [], signature: 'signed:Grace Tan', slaDue: t(300), createdAt: t(-90), closeRequestedAt: t(-12), source: 'mozart', confirmedBy: 'o-grace', confirmedAt: t(-12),
    },
  ];

  const verifications: Verification[] = [
    {
      id: 'VER-0001', officerId: 'o-grace', siteId: 'CNP', workOrderId: 'CWO-240410', stepId: 's1', assetId: 'A-AED-L1-01', imageUri: fixtureImageUri('img-aed-ok'),
      verdict: 'pass', reason: 'Status indicator green and cabinet seal intact.',
      observed: [
        { indicator: 'AED status indicator', expected: 'Green', observed: 'Green', ok: true },
        { indicator: 'Cabinet seal', expected: 'Intact', observed: 'Intact', ok: true },
      ],
      nextStep: null, confidence: 0.93, createdAt: t(-15),
    },
  ];

  const incidents: Incident[] = [
    {
      id: 'INC-240091', type: 'Trespass after hours', severity: 'low', siteId: 'CNP', zoneId: 'z-l5-canopy', location: 'L5 Canopy Park, hedge maze',
      description: 'Two visitors found in the hedge maze after 22:00 closing. Escorted out.', reporterId: 'o-marcus', attachments: [], status: 'open', createdAt: t(-25),
      confirmedBy: 'o-marcus', confirmedAt: t(-25),
    },
  ];

  const alarms: Alarm[] = [
    { id: 'ALM-0412', siteId: 'CNP', assetId: 'A-FP-L3-01', title: 'Supervisory: Z14 L3S sprinkler valve tamper', severity: 'high', raisedAt: t(-14), assigneeId: 'o-faizal', status: 'open', workOrderId: 'CWO-240417' },
    { id: 'ALM-0415', siteId: 'CNP', assetId: 'A-FD-L2-12', title: 'Door held open: FD-L2-12', severity: 'medium', raisedAt: t(-31), assigneeId: 'o-faizal', status: 'acknowledged', workOrderId: 'CWO-240419' },
    { id: 'ALM-0409', siteId: 'CNP', assetId: 'A-CCTV-L5-07', title: 'Video degraded: C-L5-07', severity: 'low', raisedAt: t(-80), assigneeId: 'o-marcus', status: 'open' },
  ];

  const briefingItems: BriefingItem[] = [
    {
      id: 'BRF-1001', siteId: 'CNP', shiftDate: today, type: 'policyUpdate', title: 'SOP-FIRE-007 v2.3: check notices before escalating supervisory faults',
      body: 'New step 2: before escalating a supervisory fault, check tonight’s notices for planned sprinkler or valve works on that zone. Planned works explain most supervisory faults and save a call to the FCC duty officer.',
      sopId: 'SOP-FIRE-007', requiresAck: true, ackByOfficerId: { 'o-daniel': t(-50), 'o-grace': t(-48), 'o-aisyah': t(-45), 'o-priya': t(-40), 'o-nurul': t(-38) },
      createdAt: t(-60 * 6), createdBy: 'o-raj', confirmedBy: 'o-raj', confirmedAt: t(-60 * 6),
    },
    {
      id: 'BRF-1002', siteId: 'CNP', shiftDate: today, type: 'siteInstruction', title: 'Sprinkler works L3 South 23:00–04:00: fire watch',
      body: 'Firewave (PTW-26-1182) isolating the L3S valve. Aisyah on fire watch 23:00–01:00, Faizal 01:00–03:00. Expect a supervisory on sub-panel L3S. Do not reset.',
      requiresAck: false, ackByOfficerId: {}, createdAt: t(-60 * 2), createdBy: 'o-meiling', confirmedBy: 'o-meiling', confirmedAt: t(-60 * 2),
    },
  ];

  const handovers: Handover[] = [
    {
      id: 'HND-0930', siteId: 'CNP', shiftId: 'day', outgoingId: 'o-siti', incomingId: 'o-faizal', createdAt: t(-75), signedAt: t(-70), signature: 'signed:Siti Aminah',
      headline: 'Quiet day shift. Gate 4 still unreliable (part on order); FD-L2-12 wedged again by #02-31.',
      summary: [
        { id: 'open', title: 'Open items for you', items: [
          { id: 'i1', text: 'Gate 4 (B2) limit switch worn, part on order. If it jams, override key is in FCC key press K-07.', sourceRefs: [{ kind: 'workOrder', id: 'CWO-240402' }] },
          { id: 'i2', text: 'CCTV C-L5-07 housing fogged, on hold for cherry picker.', sourceRefs: [{ kind: 'workOrder', id: 'CWO-240393' }] },
        ] },
        { id: 'watch', title: 'Watch for', items: [
          { id: 'i3', text: 'Tenant #02-31 keeps wedging FD-L2-12 during deliveries (3rd time this month).', sourceRefs: [{ kind: 'doc', id: 'INC-SUM-W39' }] },
        ] },
      ],
      notes: '',
    },
  ];

  const tours: GuardTour[] = [
    {
      id: 'TOUR-N-A', siteId: 'CNP', officerId: 'o-faizal', name: 'Night tour A: Retail & Canopy', graceMinutes: 10, startedAt: t(-50),
      checkpoints: [
        { id: 'CP1', name: 'L2 Retail North stairwell 3', zoneId: 'z-l2-north', tag: 'NFC-L2-ST3', dueAt: t(-45), scannedAt: t(-46) },
        { id: 'CP2', name: 'L3 South sprinkler valve room', zoneId: 'z-l3-south', tag: 'NFC-L3-SVR', dueAt: t(-22) },
        { id: 'CP3', name: 'L4 Dining Terrace back-of-house', zoneId: 'z-l4-dining', tag: 'NFC-L4-BOH', dueAt: t(8) },
        { id: 'CP4', name: 'L5 Canopy bridge', zoneId: 'z-l5-canopy', tag: 'NFC-L5-BRG', dueAt: t(25) },
        { id: 'CP5', name: 'L5 Hedge maze exit', zoneId: 'z-l5-canopy', tag: 'NFC-L5-MAZ', dueAt: t(40) },
        { id: 'CP6', name: 'L1 Terminal Link Bridge', zoneId: 'z-l1-link', tag: 'NFC-L1-LNK', dueAt: t(65) },
      ],
    },
  ];

  const notifications: Notification[] = [
    { id: 'N-1', officerId: 'o-faizal', kind: 'briefing', title: 'New policy update', body: 'SOP-FIRE-007 v2.3 needs your acknowledgement.', at: t(-60), read: false, link: '/home' },
    { id: 'N-2', officerId: 'o-meiling', kind: 'tour', title: 'Missed checkpoint', body: 'Faizal missed CP2 L3 South sprinkler valve room.', at: t(-12), read: false },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt: new Date(now).toISOString(),
    seq: 0,
    officers: officers.map((o) => ({ ...o })),
    sites,
    assets: buildAssets(),
    sops,
    docs,
    workOrders,
    incidents,
    alarms,
    voiceReports: [],
    verifications,
    handovers,
    frictionLogs: logs,
    themes,
    briefingItems,
    alerts: [],
    tours,
    notifications,
    audit: [],
    processedKeys: [],
    ...buildHr(now),
    robots,
    ...buildRobotState(now),
  };
}
