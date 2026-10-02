import type { Doc, Sop } from '@mozart/schema';
import { sopPurpose } from './sops';

/** SOPs mirrored as grounding documents (one section per step), as they would be in the GE data store. */
export function sopToDoc(sop: Sop): Doc {
  return {
    id: sop.id,
    kind: 'sop',
    title: `${sop.code} ${sop.title}`,
    siteIds: sop.siteIds,
    version: sop.version,
    geDocId: sop.geDocId,
    sections: [
      { id: 'purpose', heading: 'Purpose', body: sopPurpose[sop.id] ?? '' },
      ...(sop.expectedStates.length
        ? [{ id: 'expected', heading: 'Expected normal state', body: sop.expectedStates.map((e) => `${e.indicator}: ${e.expected}`).join('\n') }]
        : []),
      ...sop.steps.map((s) => ({ id: `s${s.n}`, heading: `Step ${s.n}`, body: s.text })),
    ],
  };
}

export const staticDocs: Doc[] = [
  {
    id: 'MAN-FP2000', kind: 'manual', title: 'FP-2000 Fire Alarm Panel: Operator Manual', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'], version: 'Rev C',
    sections: [
      { id: 'leds', heading: '3.1 Front panel indicators', body: 'POWER (green): mains present. FIRE (red): an alarm zone is active. FAULT (yellow): wiring, battery or earth fault. SUPERVISORY (amber): a monitored sprinkler valve, flow switch or pump is off-normal. SILENCED (yellow): sounders silenced.' },
      { id: 'supervisory', heading: '4.2 Supervisory conditions', body: 'A supervisory condition latches until the monitored device returns to normal and the panel is reset by an authorised operator. Common causes: sprinkler control valve partly closed during maintenance, tamper switch disturbed, pump controller not in AUTO. Supervisory is not a fire condition.' },
      { id: 'reset', heading: '5.1 Reset', body: 'Reset requires an access level 2 key held by FCC. Field officers must not reset sub-panels.' },
      { id: 'lcd', heading: '3.3 LCD messages', body: 'The LCD shows the event type, zone number and device label, e.g. "SUPV Z14 L3S SPR VALVE". Zone Z14 is the L3 South sprinkler control valve at Canopy Mall.' },
    ],
  },
  {
    id: 'MAN-RS500', kind: 'manual', title: 'RS-500 Motorised Roller Shutter: Operating Guide', siteIds: ['CNP', 'SMC', 'MXT', 'KCH'], version: 'v2',
    sections: [
      { id: 'faults', heading: '6 Fault lamp codes', body: 'Fault lamp steady red: thermal cut-out (motor overheated, wait 20 minutes). Flashing red: safety edge triggered. Flashing amber: limit switch fault, gate stops part-way.' },
      { id: 'manual', heading: '7 Manual operation', body: 'Insert the override key into the drive unit release, turn 90 degrees clockwise, then wind the gate with the hand chain. Never operate the motor while the release is engaged.' },
      { id: 'reset', heading: '6.2 Controller reset', body: 'Press RESET once and wait 10 seconds. Repeated cycling can burn out the motor.' },
    ],
  },
  {
    id: 'MAN-PUMP', kind: 'manual', title: 'Sprinkler Pump Set: Duty Checks', siteIds: ['CNP'], version: '2024',
    sections: [
      { id: 'gauge', heading: 'Gauge readings', body: 'Normal standing pressure is 6.0 to 8.0 bar. The jockey pump maintains pressure; frequent jockey starts indicate a leak.' },
      { id: 'controller', heading: 'Controller', body: 'Selector must be in AUTO. MANUAL or OFF raises a supervisory signal at the main panel.' },
    ],
  },
  {
    id: 'MAN-AED', kind: 'manual', title: 'AED Cabinet Checks', siteIds: ['CNP'], version: '2025',
    sections: [
      { id: 'daily', heading: 'Daily visual check', body: 'Status indicator green, cabinet seal intact, pads within expiry date.' },
    ],
  },
  {
    id: 'RULE-CNP', kind: 'siteRule', title: 'Canopy Mall Site Rules for Security Officers', siteIds: ['CNP'], version: '2026.3',
    sections: [
      { id: 'radio', heading: 'Radio channels', body: 'Channel 1: FCC and emergencies. Channel 2: patrol and general. Channel 3: loading bay and contractors. Channel 4: car park.' },
      { id: 'keys', heading: 'Key press', body: 'The key press is in the Fire Command Centre (L1). Override keys for loading bay gates are held on hook K-07 and signed out by the FCC duty officer.' },
      { id: 'contractors', heading: 'Contractor hours', body: 'Contractor works in public areas only between 23:00 and 06:00 with a permit-to-work.' },
      { id: 'loading', heading: 'Loading bay hours', body: 'Deliveries 05:00 to 10:00 and 22:00 to 01:00. Vehicles must have a booking.' },
      { id: 'canopy', heading: 'Canopy Park', body: 'L5 Canopy Park closes to the public at 22:00. The last patrol checks the hedge maze and the canopy bridge.' },
      { id: 'meal', heading: 'Meal breaks', body: 'Night shift meal breaks are staggered between 00:00 and 03:00. Inform FCC before going on break.' },
      { id: 'uniform', heading: 'Body-worn cameras', body: 'Body-worn cameras are switched on for any confrontation or incident response.' },
    ],
  },
  {
    id: 'NOTICE-TODAY', kind: 'notice', title: 'Tonight’s Ops Notices', siteIds: ['CNP'],
    sections: [
      { id: 'sprinkler', heading: 'Sprinkler works L3 South (23:00–04:00)', body: 'Contractor Firewave (permit PTW-26-1182) will isolate the L3 South sprinkler control valve from 23:00 to 04:00 tonight. Expect a SUPERVISORY indication on sub-panel L3 South (zone Z14) during the works. Officers: confirm the permit at the valve, do not reset the panel. A fire watch is required in L3 South while the valve is closed.' },
      { id: 'vip', heading: 'VIP arrival 21:30', body: 'VIP delegation arriving via Terminal Link Bridge at 21:30. Keep the bridge clear for 15 minutes.' },
      { id: 'escalator', heading: 'Escalator E-L1-02 maintenance', body: 'Escalator E-L1-02 will be barricaded 01:00–03:00 for maintenance.' },
    ],
  },
  {
    id: 'INC-SUM-W39', kind: 'incidentSummary', title: 'Incident summary: last 7 days', siteIds: ['CNP'],
    sections: [
      { id: 'gate', heading: 'Loading bay gate 4', body: 'Gate 4 jammed twice last week (Tue and Fri). Both times the officer waited 20+ minutes for the override key from the FCC key press. Contractor found a worn limit switch; replacement part on order.' },
      { id: 'door', heading: 'Fire door FD-L2-12', body: 'Found wedged open three times by the same F&B tenant (#02-31). Property manager informed.' },
      { id: 'lift', heading: 'Lift P3 entrapment', body: 'One entrapment, 2 passengers, released by contractor in 24 minutes. No injuries.' },
    ],
  },
];
