import type { Robot, RobotEvent, RobotMission } from '@mozart/schema';

/** Synthetic robot fleet at Canopy Mall: 2 patrol + 3 cleaning robots. Generic models, no vendor names. */
export const robots: Robot[] = [
  { id: 'PR-01', siteId: 'CNP', kind: 'patrol', name: 'Patrol PR-01', model: 'Indoor patrol AMR', dockZoneId: 'z-fcc', batteryAtSeed: 78, capabilities: ['360° camera', 'Thermal', 'Two-way audio', 'Anomaly detection'] },
  { id: 'PR-02', siteId: 'CNP', kind: 'patrol', name: 'Patrol PR-02', model: 'Indoor patrol AMR', dockZoneId: 'z-b3-carpark', batteryAtSeed: 54, capabilities: ['360° camera', 'Licence-plate reading', 'Two-way audio'] },
  { id: 'CR-01', siteId: 'CNP', kind: 'cleaning', name: 'Scrubber CR-01', model: 'Autonomous floor scrubber', dockZoneId: 'z-l1-atrium', batteryAtSeed: 64, capabilities: ['Scrub', 'Vacuum', 'Spill detection', 'Obstacle avoidance'] },
  { id: 'CR-02', siteId: 'CNP', kind: 'cleaning', name: 'Scrubber CR-02', model: 'Autonomous floor scrubber', dockZoneId: 'z-l4-dining', batteryAtSeed: 31, capabilities: ['Scrub', 'Vacuum', 'Spill detection'] },
  { id: 'CR-03', siteId: 'CNP', kind: 'cleaning', name: 'Scrubber CR-03', model: 'Autonomous floor scrubber', dockZoneId: 'z-l2-north', batteryAtSeed: 72, capabilities: ['Scrub', 'Vacuum', 'Spill detection', 'Obstacle avoidance'] },
];

export function buildRobotState(now: number): { robotMissions: RobotMission[]; robotEvents: RobotEvent[] } {
  const t = (min: number) => new Date(now + min * 60_000).toISOString();
  const m = (id: string, robotId: string, kind: RobotMission['kind'], waypoints: string[], started: number, loop = true): RobotMission => ({
    id, robotId, kind, waypoints, loop, startedAt: t(started), status: 'active', pausedMs: 0, createdBy: 'o-meiling', confirmedBy: 'o-meiling', confirmedAt: t(started),
  });
  return {
    robotMissions: [
      m('MS-101', 'PR-01', 'patrol', ['z-l1-atrium', 'z-l1-link', 'z-fcc'], -40),
      m('MS-102', 'PR-02', 'patrol', ['z-b3-carpark', 'z-b2-loading'], -90),
      m('MS-103', 'CR-01', 'clean', ['z-l1-atrium'], -30),
      m('MS-105', 'CR-03', 'clean', ['z-l2-north'], -25),
    ],
    robotEvents: [
      { id: 'RE-0901', robotId: 'PR-02', kind: 'detection', label: 'Vehicle stopped in fire lane', detail: 'White van stationary 6 min in the B3 fire lane. Plate read SLA 1234 X.', zoneId: 'z-b3-carpark', severity: 'medium', at: t(-55), status: 'resolved', assigneeId: 'o-weijie', suggestedSopId: 'SOP-VEH-002' },
      { id: 'RE-0902', robotId: 'CR-01', kind: 'obstacle', label: 'Path blocked by trolley', detail: 'Cleaning route blocked at the atrium escalator for 4 min; rerouted.', zoneId: 'z-l1-atrium', severity: 'low', at: t(-20), status: 'dismissed' },
      { id: 'RE-0903', robotId: 'PR-01', kind: 'detection', label: 'Unattended bag', detail: 'Black backpack on the Terminal Link bench, no owner nearby for 9 min.', zoneId: 'z-l1-link', severity: 'medium', at: t(-8), status: 'open', suggestedSopId: 'SOP-SEC-010', imageUri: 'fixture://snap-bag' },
    ],
  };
}

/** Detections the presenter can trigger from the control tower (the robot "sees" them now). */
export const robotEventPresets: Omit<RobotEvent, 'id' | 'at' | 'status'>[] = [
  { robotId: 'CR-03', kind: 'detection', label: 'Liquid spill detected', detail: 'About 1 m² of liquid near the L2 North escalator. CR-03 has paused and is holding position as a marker.', zoneId: 'z-l2-north', severity: 'high', suggestedSopId: 'SOP-HAZ-001', imageUri: 'fixture://snap-spill' },
  { robotId: 'PR-01', kind: 'detection', label: 'Person loitering after hours', detail: 'One person on the Terminal Link Bridge for 12 min after closing, moving between benches.', zoneId: 'z-l1-link', severity: 'medium', suggestedSopId: 'SOP-SEC-011', imageUri: 'fixture://snap-person' },
  { robotId: 'CR-02', kind: 'low_battery', label: 'Battery low', detail: 'Battery below 20%. CR-02 is returning to its dock on L4.', zoneId: 'z-l4-dining', severity: 'low' },
];

function snap(inner: string, label: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" width="360" height="240">
<rect width="360" height="240" fill="#2a2f36"/>${inner}
<rect x="0" y="0" width="360" height="22" fill="rgba(0,0,0,0.55)"/>
<text x="8" y="15" font-family="monospace" font-size="11" fill="#9fe870">● REC  ${label}</text>
<rect x="6" y="6" width="348" height="228" fill="none" stroke="rgba(255,255,255,0.25)" stroke-dasharray="6 6"/></svg>`;
}

/** Robot camera snapshots (SVG stand-ins). */
export const robotSnapshots: Record<string, string> = {
  'snap-spill': snap(`<polygon points="0,240 120,110 240,110 360,240" fill="#c9c3b6"/><ellipse cx="185" cy="185" rx="70" ry="22" fill="#8fb3c9" opacity="0.85"/><ellipse cx="170" cy="180" rx="25" ry="6" fill="#d8ecf7" opacity="0.8"/><rect x="250" y="60" width="70" height="100" fill="#55606c"/><text x="285" y="115" font-size="10" fill="#ddd" text-anchor="middle" font-family="Arial">ESCALATOR</text>`, 'CR-03 · L2 North · spill'),
  'snap-bag': snap(`<rect x="0" y="150" width="360" height="90" fill="#6d665c"/><rect x="60" y="120" width="240" height="18" fill="#8a6a43"/><rect x="70" y="138" width="10" height="30" fill="#5a4630"/><rect x="280" y="138" width="10" height="30" fill="#5a4630"/><rect x="160" y="88" width="44" height="36" rx="8" fill="#111"/>`, 'PR-01 · Terminal Link · bag'),
  'snap-receipt': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240" width="360" height="240"><rect width="360" height="240" fill="#d9d4ca"/><rect x="110" y="14" width="140" height="212" fill="#fff" transform="rotate(-3 180 120)"/><g transform="rotate(-3 180 120)" font-family="monospace" font-size="10" fill="#333"><text x="122" y="40">CITY CABS PTE LTD</text><text x="122" y="58">Trip 02:41 → 03:07</text><text x="122" y="74">Changi → Seletar</text><line x1="122" y1="86" x2="238" y2="86" stroke="#999"/><text x="122" y="104">Fare        $16.90</text><text x="122" y="120">Surcharge    $1.50</text><text x="122" y="140" font-weight="bold">TOTAL       $18.40</text><text x="122" y="170">PAID VISA ****4421</text></g></svg>`,
  'snap-person': snap(`<rect x="0" y="150" width="360" height="90" fill="#555"/><circle cx="190" cy="80" r="14" fill="#c9a27e"/><rect x="176" y="96" width="28" height="56" rx="6" fill="#4b5d73"/>`, 'PR-01 · Terminal Link · person'),
};
