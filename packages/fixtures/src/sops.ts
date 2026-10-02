import type { Sop } from '@mozart/schema';

type SopSeed = Omit<Sop, 'effectiveFrom' | 'geDocId' | 'history' | 'siteIds' | 'expectedStates'> & {
  siteIds?: string[];
  expectedStates?: Sop['expectedStates'];
  purpose: string;
};

const ALL = ['CNP', 'SMC', 'MXT', 'KCH'];

/** 30 synthetic SOPs. Text is illustrative, written to look like Certis-style digital SOPs. */
export const sopSeeds: SopSeed[] = [
  {
    id: 'SOP-FIRE-001', code: 'SOP-FIRE-001', title: 'Fire alarm activation: initial response', category: 'Fire', version: '4.1',
    purpose: 'First actions for any officer when a fire alarm activates on a zone they cover.',
    steps: [
      { n: 1, text: 'Acknowledge the alarm on your device and inform FCC on radio channel 1 with your location.' },
      { n: 2, text: 'Proceed to the activated zone. Do not use lifts.' },
      { n: 3, text: 'Investigate the activated device. If fire or smoke is confirmed, activate the nearest manual call point and use an extinguisher only if safe.' },
      { n: 4, text: 'If false alarm, report the device ID and cause to FCC. FCC resets the panel; officers never reset the main panel.' },
      { n: 5, text: 'Record the outcome in the work order with a photo of the device.' },
    ],
  },
  {
    id: 'SOP-FIRE-007', code: 'SOP-FIRE-007', title: 'Fire alarm panel: supervisory fault', category: 'Fire', version: '2.3',
    purpose: 'A supervisory signal means a monitored fire-protection device (valve, pump, sprinkler flow switch) is off-normal. It is not a fire alarm, but the protection in that zone may be impaired.',
    expectedStates: [
      { indicator: 'Power LED', expected: 'Green, steady' },
      { indicator: 'Supervisory LED', expected: 'Off' },
      { indicator: 'Fault LED', expected: 'Off' },
      { indicator: 'Fire alarm LED', expected: 'Off' },
    ],
    steps: [
      { n: 1, text: 'Note the supervisory zone shown on the panel LCD and inform FCC on radio channel 1. Do not silence or reset the panel.' },
      { n: 2, text: 'Check today’s notices for planned sprinkler or valve works on that zone. Planned works explain most supervisory faults.' },
      { n: 3, text: 'If no works are planned, go to the zone’s sprinkler control valve and confirm the valve is fully open and the tamper switch is engaged.', expectedState: { indicator: 'Control valve', expected: 'Fully open, chained and locked' } },
      { n: 4, text: 'Photograph the panel and the valve and attach both to the work order.' },
      { n: 5, text: 'If the valve is closed without a permit-to-work, escalate to the FCC duty officer immediately and post a fire watch in the zone until the valve is restored.' },
      { n: 6, text: 'Once the supervisory LED clears, verify the panel shows normal state and close the work order with evidence.', expectedState: { indicator: 'Supervisory LED', expected: 'Off' } },
    ],
  },
  {
    id: 'SOP-FIRE-008', code: 'SOP-FIRE-008', title: 'Fire alarm panel: trouble / fault condition', category: 'Fire', version: '2.0',
    purpose: 'Response to a fault (trouble) indication such as an open circuit, earth fault or battery fault.',
    expectedStates: [{ indicator: 'Fault LED', expected: 'Off' }],
    steps: [
      { n: 1, text: 'Note the fault description on the panel LCD and inform FCC.' },
      { n: 2, text: 'FCC raises a corrective work order to the fire-protection contractor within 30 minutes.' },
      { n: 3, text: 'If the fault affects detection in a public zone, post a fire watch patrol every 30 minutes until rectified.' },
      { n: 4, text: 'Photograph the panel LCD and attach to the work order.' },
    ],
  },
  {
    id: 'SOP-FIRE-012', code: 'SOP-FIRE-012', title: 'Fire door obstructed or wedged open', category: 'Fire', version: '1.6',
    purpose: 'Fire doors must self-close. A wedged or obstructed fire door compromises compartmentation.',
    expectedStates: [{ indicator: 'Door leaf', expected: 'Closed, self-closer engaged' }, { indicator: 'Obstruction', expected: 'None' }],
    steps: [
      { n: 1, text: 'Remove the wedge or obstruction and confirm the door closes and latches on its own.' },
      { n: 2, text: 'If a tenant caused the obstruction, record the unit number and inform the tenant on the spot.' },
      { n: 3, text: 'If the door does not self-close, raise a corrective work order and post a sign.' },
      { n: 4, text: 'Repeat offences (3 in 30 days) go to the property manager via the supervisor.' },
    ],
  },
  {
    id: 'SOP-FIRE-015', code: 'SOP-FIRE-015', title: 'Sprinkler pump pressure check', category: 'Fire', version: '1.2',
    purpose: 'Nightly check of the sprinkler and wet-riser pump pressure gauges.',
    expectedStates: [{ indicator: 'Pressure gauge', expected: '6.0 to 8.0 bar' }, { indicator: 'Pump controller', expected: 'AUTO' }],
    steps: [
      { n: 1, text: 'Read the gauge at eye level and record the value.' },
      { n: 2, text: 'Confirm the pump controller selector is in AUTO.' },
      { n: 3, text: 'If pressure is below 6.0 bar, inform FCC and the IFM duty technician within 15 minutes.' },
      { n: 4, text: 'If pressure is below 4.0 bar, treat as impaired protection: escalate to FCC duty officer immediately.' },
    ],
  },
  {
    id: 'SOP-EVAC-002', code: 'SOP-EVAC-002', title: 'Evacuation: mall-wide', category: 'Emergency', version: '5.0', siteIds: ['CNP'],
    purpose: 'Coordinated evacuation of all public areas on FCC instruction.',
    steps: [
      { n: 1, text: 'On the evacuation tone or FCC instruction, move to your assigned evacuation sector.' },
      { n: 2, text: 'Direct the public to the nearest exit staircase. Lifts and escalators are not to be used.' },
      { n: 3, text: 'Sweep your sector, including toilets and nursing rooms. Mark swept areas with the sector tag.' },
      { n: 4, text: 'Report "Sector clear" to FCC on channel 1, then go to assembly area A (Terminal Link car drop-off).' },
      { n: 5, text: 'Do not re-enter until FCC declares all-clear.' },
    ],
  },
  {
    id: 'SOP-LOCK-001', code: 'SOP-LOCK-001', title: 'Lockdown / shelter in place', category: 'Emergency', version: '3.0',
    purpose: 'Response to a credible threat where moving people into the open is more dangerous than sheltering.',
    steps: [
      { n: 1, text: 'On LOCKDOWN alert, close and lock the shutters in your sector using the FCC remote release where fitted.' },
      { n: 2, text: 'Guide the public into the nearest tenant unit or back-of-house corridor away from glass.' },
      { n: 3, text: 'Keep radio traffic to essentials. Report location and headcount to FCC.' },
      { n: 4, text: 'Do not open shutters until FCC confirms all-clear with the code word.' },
    ],
  },
  {
    id: 'SOP-GATE-004', code: 'SOP-GATE-004', title: 'Loading bay service gate malfunction', category: 'Access', version: '3.2', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'],
    purpose: 'Response when a motorised service gate or roller shutter fails to open or close.',
    expectedStates: [
      { indicator: 'Gate position', expected: 'Fully closed when idle' },
      { indicator: 'Motor fault lamp', expected: 'Off' },
      { indicator: 'Safety edge', expected: 'Clear, no obstruction' },
    ],
    steps: [
      { n: 1, text: 'Cone off the gate area and stop vehicle movement through the gate.' },
      { n: 2, text: 'Check the safety edge and photo-eye for obstructions; clear any debris.' },
      { n: 3, text: 'Press the gate controller RESET once. Do not cycle the gate repeatedly.' },
      { n: 4, text: 'If the gate does not respond, use the manual override key from the FCC key press to release the gate and wind it closed by hand.' },
      { n: 5, text: 'Raise a corrective work order with photos and inform the loading bay tenant coordinator of the delay.' },
      { n: 6, text: 'Stay at the gate until it is secured, or hand over to another officer.' },
    ],
  },
  {
    id: 'SOP-GATE-006', code: 'SOP-GATE-006', title: 'Carpark barrier fault', category: 'Access', version: '1.4',
    purpose: 'Response to an entry or exit barrier stuck open or closed.',
    steps: [
      { n: 1, text: 'If stuck closed with vehicles queuing, raise the barrier manually using the yellow lever and keep it up.' },
      { n: 2, text: 'Inform FCC so the carpark system can be set to free-flow.' },
      { n: 3, text: 'Raise a corrective work order with the barrier ID.' },
    ],
  },
  {
    id: 'SOP-MED-003', code: 'SOP-MED-003', title: 'Medical emergency and AED use', category: 'Medical', version: '2.2',
    purpose: 'Response to a collapsed or injured person.',
    expectedStates: [{ indicator: 'AED status indicator', expected: 'Green' }, { indicator: 'Cabinet seal', expected: 'Intact' }],
    steps: [
      { n: 1, text: 'Check for danger, then response. Call 995 and inform FCC with the exact location.' },
      { n: 2, text: 'If not breathing normally, start CPR and send someone for the nearest AED.' },
      { n: 3, text: 'Follow the AED voice prompts. Do not stop CPR except when the AED analyses.' },
      { n: 4, text: 'Assign an officer to meet the ambulance at the nearest drop-off and lead the crew in.' },
      { n: 5, text: 'File an incident report once the casualty is handed over.' },
    ],
  },
  {
    id: 'SOP-LIFT-002', code: 'SOP-LIFT-002', title: 'Passenger trapped in lift', category: 'Facilities', version: '2.1',
    purpose: 'Response to a lift entrapment.',
    steps: [
      { n: 1, text: 'Talk to the trapped passengers through the intercom and reassure them. Ask about medical conditions.' },
      { n: 2, text: 'Inform FCC to call the lift contractor. Contractor response target is 30 minutes.' },
      { n: 3, text: 'Never attempt a rescue yourself unless trained and authorised.' },
      { n: 4, text: 'Stay at the lift landing until the passengers are out.' },
    ],
  },
  {
    id: 'SOP-ESC-001', code: 'SOP-ESC-001', title: 'Escalator emergency stop', category: 'Facilities', version: '1.3',
    purpose: 'When to use the escalator emergency stop and what to do after.',
    steps: [
      { n: 1, text: 'Press the red emergency stop only if someone is caught or has fallen.' },
      { n: 2, text: 'Barricade both landings and inform FCC.' },
      { n: 3, text: 'Do not restart. Only the escalator contractor restarts after an emergency stop.' },
    ],
  },
  {
    id: 'SOP-SEC-010', code: 'SOP-SEC-010', title: 'Suspicious item (unattended bag)', category: 'Security', version: '3.4',
    purpose: 'HOT principle assessment of an unattended item.',
    steps: [
      { n: 1, text: 'Do not touch the item. Assess using HOT: Hidden, Obviously suspicious, Typical?' },
      { n: 2, text: 'Ask people nearby if the item is theirs and check CCTV via FCC.' },
      { n: 3, text: 'If suspicious, cordon 50 metres, do not use radio within 15 metres, inform FCC by phone.' },
      { n: 4, text: 'FCC decides on police notification. Hand over the scene to police on arrival.' },
    ],
  },
  {
    id: 'SOP-SEC-011', code: 'SOP-SEC-011', title: 'Suspicious person / BOLO', category: 'Security', version: '2.0',
    purpose: 'Response to a be-on-the-lookout notice or a suspicious person report.',
    steps: [
      { n: 1, text: 'Observe and report. Do not confront.' },
      { n: 2, text: 'Give FCC a description: gender, age range, clothing top to bottom, direction of travel.' },
      { n: 3, text: 'Keep visual contact from a safe distance until FCC picks the person up on CCTV.' },
    ],
  },
  {
    id: 'SOP-SEC-014', code: 'SOP-SEC-014', title: 'Lost child', category: 'Security', version: '2.5',
    purpose: 'Response when a child is reported missing or a child is found alone.',
    steps: [
      { n: 1, text: 'Get the child’s description and last-seen location from the parent. Inform FCC immediately.' },
      { n: 2, text: 'FCC announces Code Amber; officers at exits watch for the child.' },
      { n: 3, text: 'A found child is escorted to the Customer Service counter L1 by two staff, never one.' },
    ],
  },
  {
    id: 'SOP-SEC-018', code: 'SOP-SEC-018', title: 'Shoplifting / theft report', category: 'Security', version: '1.8',
    purpose: 'Officer actions when a tenant reports theft.',
    steps: [
      { n: 1, text: 'Take the tenant’s report: item, value, time, suspect description.' },
      { n: 2, text: 'Ask FCC to preserve CCTV footage for the time window.' },
      { n: 3, text: 'Do not detain. Advise the tenant to make a police report; record the report number.' },
    ],
  },
  {
    id: 'SOP-SEC-020', code: 'SOP-SEC-020', title: 'Aggressive behaviour and de-escalation', category: 'Security', version: '2.1',
    purpose: 'Handling an agitated member of the public.',
    steps: [
      { n: 1, text: 'Keep a safe distance and an exit route. Call for a second officer.' },
      { n: 2, text: 'Use calm, open language. Acknowledge the person’s concern.' },
      { n: 3, text: 'If there is a threat of violence, step back and inform FCC to call police.' },
    ],
  },
  {
    id: 'SOP-HAZ-001', code: 'SOP-HAZ-001', title: 'Wet floor / spill', category: 'Hazard', version: '1.5',
    purpose: 'Prevent slips from spills and wet floors.',
    steps: [
      { n: 1, text: 'Place a wet-floor sign immediately and stay until cleaners arrive.' },
      { n: 2, text: 'Request cleaning through FCC; target response 10 minutes.' },
      { n: 3, text: 'If the source is a leak, follow SOP-HAZ-004.' },
    ],
  },
  {
    id: 'SOP-HAZ-004', code: 'SOP-HAZ-004', title: 'Water leak / ceiling seepage', category: 'Hazard', version: '1.9',
    purpose: 'Contain water leaks and protect electrical equipment.',
    steps: [
      { n: 1, text: 'Cordon the area and place buckets or absorbent socks.' },
      { n: 2, text: 'Check for nearby electrical panels or lighting; if water is near electrics, follow SOP-HAZ-007.' },
      { n: 3, text: 'Raise a corrective work order with photos of the ceiling and the floor.' },
    ],
  },
  {
    id: 'SOP-HAZ-007', code: 'SOP-HAZ-007', title: 'Electrical hazard / exposed wiring', category: 'Hazard', version: '1.1',
    purpose: 'Response to sparking, exposed wiring or water near electrical equipment.',
    steps: [
      { n: 1, text: 'Keep everyone at least 3 metres away. Do not touch.' },
      { n: 2, text: 'Ask FCC to get the IFM duty electrician to isolate the circuit.' },
      { n: 3, text: 'Raise a high-priority corrective work order.' },
    ],
  },
  {
    id: 'SOP-ACC-002', code: 'SOP-ACC-002', title: 'After-hours contractor access', category: 'Access', version: '2.6', siteIds: ['CNP'],
    purpose: 'Controlling contractor entry between 22:00 and 07:00.',
    steps: [
      { n: 1, text: 'Contractors enter only through B2 Loading Bay with a valid permit-to-work.' },
      { n: 2, text: 'Check the permit number against the FCC permit board and swap photo ID for a contractor pass.' },
      { n: 3, text: 'Hot works additionally need a fire watch officer assigned by the supervisor.' },
    ],
  },
  {
    id: 'SOP-ACC-005', code: 'SOP-ACC-005', title: 'Key control and key press', category: 'Access', version: '1.7',
    purpose: 'Issue and return of keys from the FCC key press.',
    steps: [
      { n: 1, text: 'Keys are issued only from the FCC key press by the FCC duty officer.' },
      { n: 2, text: 'Every issue is logged with officer ID and time. Keys are returned before end of shift.' },
      { n: 3, text: 'Officers on patrol do not carry override keys unless signed out for a specific job.' },
    ],
  },
  {
    id: 'SOP-PAT-001', code: 'SOP-PAT-001', title: 'Night patrol and guard tour', category: 'Patrol', version: '3.0',
    purpose: 'Standard night patrol with checkpoint scanning.',
    steps: [
      { n: 1, text: 'Scan each checkpoint tag in route order within its window.' },
      { n: 2, text: 'At each checkpoint, look for open doors, leaks, obstructions and suspicious items.' },
      { n: 3, text: 'Record any observation at the checkpoint, by voice or photo.' },
    ],
  },
  {
    id: 'SOP-PAT-003', code: 'SOP-PAT-003', title: 'Missed checkpoint', category: 'Patrol', version: '1.2',
    purpose: 'What happens when a checkpoint is not scanned in time.',
    steps: [
      { n: 1, text: 'A checkpoint not scanned within the grace period (10 minutes) alerts the supervisor.' },
      { n: 2, text: 'The supervisor contacts the officer by radio; no answer within 2 minutes triggers a welfare check.' },
      { n: 3, text: 'The officer records the reason for the miss when next able.' },
    ],
  },
  {
    id: 'SOP-OPS-001', code: 'SOP-OPS-001', title: 'Shift handover', category: 'Operations', version: '2.0',
    purpose: 'Every officer hands over open items to the incoming shift in writing.',
    steps: [
      { n: 1, text: 'Outgoing officer prepares the handover covering open work orders, incidents, alarms and anything unusual.' },
      { n: 2, text: 'Outgoing officer signs the handover.' },
      { n: 3, text: 'Incoming officer reads and acknowledges before taking over the post.' },
    ],
  },
  {
    id: 'SOP-OPS-004', code: 'SOP-OPS-004', title: 'Work order closure and evidence', category: 'Operations', version: '1.5',
    purpose: 'Evidence requirements before a corrective work order is closed.',
    steps: [
      { n: 1, text: 'Every corrective work order needs at least one photo or verification as evidence.' },
      { n: 2, text: 'The officer signs the closure; the supervisor approves it.' },
      { n: 3, text: 'Work orders closed without evidence are reopened automatically.' },
    ],
  },
  {
    id: 'SOP-OPS-006', code: 'SOP-OPS-006', title: 'Reporting a fault to FCC', category: 'Operations', version: '1.3',
    purpose: 'How to report any fault so it becomes a work order.',
    steps: [
      { n: 1, text: 'Report the asset tag, location, what you see, and whether it is a safety risk.' },
      { n: 2, text: 'FCC (or the app) creates a corrective work order with a CWO number.' },
      { n: 3, text: 'Safety-risk faults are high priority with a 2-hour SLA; others 24 hours.' },
    ],
  },
  {
    id: 'SOP-VEH-002', code: 'SOP-VEH-002', title: 'Unauthorised vehicle in loading bay', category: 'Security', version: '1.1', siteIds: ['CNP'],
    purpose: 'Vehicles without a delivery booking in the loading bay.',
    steps: [
      { n: 1, text: 'Record the plate number and ask the driver for the delivery booking.' },
      { n: 2, text: 'No booking: direct the vehicle to leave. If the driver refuses, inform FCC.' },
    ],
  },
  {
    id: 'SOP-CCTV-001', code: 'SOP-CCTV-001', title: 'CCTV camera offline', category: 'Security', version: '1.0',
    purpose: 'Response when FCC reports a camera offline.',
    steps: [
      { n: 1, text: 'Go to the camera and check for visible damage or obstruction.' },
      { n: 2, text: 'Patrol the camera’s field of view every 30 minutes until restored.' },
      { n: 3, text: 'Raise a corrective work order with the camera ID.' },
    ],
  },
  {
    id: 'SOP-WX-001', code: 'SOP-WX-001', title: 'Severe weather and lightning alert', category: 'Emergency', version: '2.0', siteIds: ['CNP'],
    purpose: 'Closure of outdoor and canopy areas during lightning risk.',
    steps: [
      { n: 1, text: 'On a lightning alert from FCC, close L5 Canopy Park attractions and the canopy bridge.' },
      { n: 2, text: 'Guide visitors indoors; place closure signs at all L5 entrances.' },
      { n: 3, text: 'Reopen only on FCC all-clear, usually 30 minutes after the last strike.' },
    ],
  },
];

export function buildSops(effectiveFrom: string): Sop[] {
  return sopSeeds.map(({ purpose: _p, ...s }) => ({
    ...s,
    siteIds: s.siteIds ?? ALL,
    expectedStates: s.expectedStates ?? [],
    effectiveFrom,
    geDocId: `ge-doc-${s.id.toLowerCase()}`,
    history: [{ version: s.version, at: effectiveFrom, note: 'Baseline import from Mozart digital SOPs', by: 'Mozart' }],
  }));
}

export const sopPurpose: Record<string, string> = Object.fromEntries(sopSeeds.map((s) => [s.id, s.purpose]));
