import type { Asset, AssetType, ExpectedState } from '@mozart/schema';
import { sites } from './site';

const EXPECTED: Record<AssetType, ExpectedState[]> = {
  fire_panel: [
    { indicator: 'Power LED', expected: 'Green, steady' },
    { indicator: 'Supervisory LED', expected: 'Off' },
    { indicator: 'Fault LED', expected: 'Off' },
    { indicator: 'Fire alarm LED', expected: 'Off' },
  ],
  gate: [
    { indicator: 'Gate position', expected: 'Fully closed when idle' },
    { indicator: 'Motor fault lamp', expected: 'Off' },
    { indicator: 'Safety edge', expected: 'Clear, no obstruction' },
  ],
  barrier: [{ indicator: 'Boom arm', expected: 'Down when idle' }, { indicator: 'Controller lamp', expected: 'Green' }],
  alarm: [{ indicator: 'Beacon', expected: 'Off' }, { indicator: 'Status LED', expected: 'Green' }],
  meter: [{ indicator: 'Pressure gauge', expected: '6.0 to 8.0 bar' }, { indicator: 'Pump controller', expected: 'AUTO' }],
  fire_door: [{ indicator: 'Door leaf', expected: 'Closed, self-closer engaged' }, { indicator: 'Obstruction', expected: 'None' }],
  exit_sign: [{ indicator: 'Sign illumination', expected: 'Lit, both faces' }],
  aed: [{ indicator: 'AED status indicator', expected: 'Green' }, { indicator: 'Cabinet seal', expected: 'Intact' }],
  cctv: [{ indicator: 'Camera housing', expected: 'Clean, unobstructed' }],
  lift: [{ indicator: 'Landing indicator', expected: 'Normal service' }],
  escalator: [{ indicator: 'Running state', expected: 'Running, no alarms' }],
  pump: [{ indicator: 'Controller', expected: 'AUTO' }],
  extinguisher: [{ indicator: 'Gauge needle', expected: 'In green band' }, { indicator: 'Safety pin', expected: 'In place, tagged' }],
  hose_reel: [{ indicator: 'Hose', expected: 'Fully wound, nozzle closed' }],
};

const SOP_FOR: Partial<Record<AssetType, string>> = {
  fire_panel: 'SOP-FIRE-007',
  gate: 'SOP-GATE-004',
  barrier: 'SOP-GATE-006',
  meter: 'SOP-FIRE-015',
  pump: 'SOP-FIRE-015',
  fire_door: 'SOP-FIRE-012',
  aed: 'SOP-MED-003',
  cctv: 'SOP-CCTV-001',
  lift: 'SOP-LIFT-002',
  escalator: 'SOP-ESC-001',
  alarm: 'SOP-FIRE-001',
};

const MANUAL_FOR: Partial<Record<AssetType, string>> = {
  fire_panel: 'MAN-FP2000',
  gate: 'MAN-RS500',
  meter: 'MAN-PUMP',
  aed: 'MAN-AED',
};

function a(id: string, type: AssetType, name: string, zoneId: string, tag: string, keywords: string[] = [], siteId = 'CNP'): Asset {
  const zone = sites.find((s) => s.id === siteId)!.zones.find((z) => z.id === zoneId);
  return {
    id, siteId, type, name, tag, zoneId,
    location: zone ? zone.name : zoneId,
    expectedStates: EXPECTED[type],
    manualDocId: MANUAL_FOR[type],
    sopId: SOP_FOR[type],
    keywords,
  };
}

/** Named assets the run-of-show and fixtures refer to. */
export const keyAssets: Asset[] = [
  a('A-FP-L3-01', 'fire_panel', 'Fire alarm sub-panel L3 South', 'z-l3-south', 'CNP-FP-L3-01', ['fire panel', 'panel', 'l3', 'level 3', 'sub-panel', 'supervisory']),
  a('A-FP-MAIN', 'fire_panel', 'Main fire alarm control panel (FCC)', 'z-fcc', 'CNP-FP-MAIN', ['main panel', 'facp', 'fcc']),
  a('A-FP-L1-01', 'fire_panel', 'Fire alarm sub-panel L1 Atrium', 'z-l1-atrium', 'CNP-FP-L1-01', ['l1 panel', 'atrium panel']),
  a('A-GT-B2-04', 'gate', 'Loading bay service gate 4', 'z-b2-loading', 'CNP-GT-B2-04', ['gate', 'gate 4', 'gate four', 'service gate', 'loading bay', 'roller shutter', 'shutter']),
  a('A-GT-B2-02', 'gate', 'Loading bay service gate 2', 'z-b2-loading', 'CNP-GT-B2-02', ['gate 2', 'gate two']),
  a('A-BR-B3-01', 'barrier', 'Carpark entry barrier 1', 'z-b3-carpark', 'CNP-BR-B3-01', ['barrier', 'carpark barrier', 'entry barrier', 'gantry']),
  a('A-PG-RF-01', 'meter', 'Sprinkler pump pressure gauge', 'z-roof-plant', 'CNP-PG-RF-01', ['pressure', 'gauge', 'sprinkler pump', 'pump']),
  a('A-FD-L2-12', 'fire_door', 'Fire door FD-L2-12 (service corridor)', 'z-l2-north', 'CNP-FD-L2-12', ['fire door', 'door', 'fd-l2-12', 'wedged']),
  a('A-EX-L4-03', 'exit_sign', 'Exit sign EX-L4-03', 'z-l4-dining', 'CNP-EX-L4-03', ['exit sign', 'exit light']),
  a('A-AED-L1-01', 'aed', 'AED cabinet L1 Atrium', 'z-l1-atrium', 'CNP-AED-L1-01', ['aed', 'defibrillator']),
  a('A-ESC-L1-02', 'escalator', 'Escalator E-L1-02 (Atrium up)', 'z-l1-atrium', 'CNP-ESC-L1-02', ['escalator']),
  a('A-LFT-P3', 'lift', 'Passenger lift P3', 'z-l2-north', 'CNP-LFT-P3', ['lift', 'elevator', 'p3']),
  a('A-CCTV-L5-07', 'cctv', 'CCTV camera C-L5-07 (Canopy bridge)', 'z-l5-canopy', 'CNP-CCTV-L5-07', ['camera', 'cctv', 'canopy bridge']),
  a('A-WM-B2-01', 'meter', 'Domestic water meter B2', 'z-b2-loading', 'CNP-WM-B2-01', ['water meter', 'meter']),
  a('A-FP-SMC-01', 'fire_panel', 'Main fire panel', 'z-smc-ae', 'SMC-FP-01', [], 'SMC'),
  a('A-GT-SMC-01', 'gate', 'Service dock gate 1', 'z-smc-dock', 'SMC-GT-01', [], 'SMC'),
  a('A-GT-MXT-01', 'gate', 'B1 loading dock shutter', 'z-mxt-dock', 'MXT-GT-01', [], 'MXT'),
  a('A-GT-KCH-01', 'gate', 'Service yard gate', 'z-kch-yard', 'KCH-GT-01', [], 'KCH'),
];

const GENERATED_TYPES: { type: AssetType; code: string; label: string }[] = [
  { type: 'extinguisher', code: 'FE', label: 'Fire extinguisher' },
  { type: 'hose_reel', code: 'HR', label: 'Hose reel' },
  { type: 'exit_sign', code: 'EX', label: 'Exit sign' },
  { type: 'fire_door', code: 'FD', label: 'Fire door' },
  { type: 'cctv', code: 'CCTV', label: 'CCTV camera' },
  { type: 'alarm', code: 'MCP', label: 'Manual call point' },
];

/** 120 assets at Canopy Mall: the named ones plus generated life-safety devices per zone. */
export function buildAssets(): Asset[] {
  const out: Asset[] = [...keyAssets];
  const cnp = sites[0];
  let i = 0;
  while (out.filter((x) => x.siteId === 'CNP').length < 120) {
    const zone = cnp.zones[i % cnp.zones.length];
    const t = GENERATED_TYPES[Math.floor(i / cnp.zones.length) % GENERATED_TYPES.length];
    const n = String(Math.floor(i / (cnp.zones.length * GENERATED_TYPES.length)) + 1).padStart(2, '0');
    const lvl = zone.level;
    const id = `A-${t.code}-${lvl}-${zone.id.split('-').pop()!.slice(0, 3).toUpperCase()}${n}`;
    if (!out.some((x) => x.id === id)) {
      out.push(a(id, t.type, `${t.label} ${lvl}-${zone.name.split(' ').slice(1).join(' ')} #${n}`, zone.id, `CNP-${t.code}-${lvl}-${n}${i}`));
    }
    i++;
  }
  return out;
}
